"""
Automation Engine — The core orchestrator for bulk hiring campaigns.

Processes a spreadsheet of candidates through:
1. Parse spreadsheet → create Candidate records
2. AI-score each candidate against job requirements
3. Rank by score, auto-shortlist top N
4. Move rest to Rejected
5. Update campaign progress in real-time
"""
import pandas as pd
from io import BytesIO
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.candidate import Candidate
from app.models.campaign import HiringCampaign
from app.models.core import Job
from app.models.assessments import Assessment, AssessmentSubmission
from app.services.ai_scorer import score_candidate_ai
from app.services.ai_personalization import generate_personalized_assessment
from app.services.email_service import send_shortlist_notification, send_rejection_notification


def parse_spreadsheet(file_bytes: bytes, filename: str) -> list[dict]:
    """
    Parse an Excel or CSV file into a list of candidate dictionaries.
    Handles flexible column naming.
    """
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(BytesIO(file_bytes))
        else:
            df = pd.read_excel(BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Failed to parse spreadsheet: {e}")

    # Normalize column names (lowercase, strip whitespace)
    df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]

    # Map flexible column names to standard names
    column_map = {
        "name": ["name", "full_name", "candidate_name", "candidate"],
        "email": ["email", "email_address", "e-mail", "mail"],
        "phone": ["phone", "phone_number", "mobile", "contact"],
        "skills": ["skills", "skill_set", "technologies", "tech_stack", "key_skills"],
        "experience_years": ["experience_years", "experience", "exp", "years_of_experience", "total_experience", "yoe"],
        "education": ["education", "degree", "qualification", "educational_background"],
        "current_company": ["current_company", "company", "current_employer", "organization", "employer"],
    }

    def find_column(standard_name: str) -> str | None:
        for alias in column_map.get(standard_name, []):
            if alias in df.columns:
                return alias
        return None

    candidates = []
    for _, row in df.iterrows():
        candidate = {}
        for standard_name in column_map:
            col = find_column(standard_name)
            if col and pd.notna(row.get(col)):
                candidate[standard_name] = str(row[col]).strip()
            else:
                candidate[standard_name] = ""

        # Only add candidates with at least a name
        if candidate.get("name"):
            candidates.append(candidate)

    return candidates


def run_campaign(
    db: Session,
    campaign_id: str,
    candidates_data: list[dict],
    job_id: str,
    target_shortlist: int
):
    """
    Execute the full automation pipeline for a hiring campaign.
    This runs synchronously (for now) and updates the campaign status as it progresses.
    """
    campaign = db.query(HiringCampaign).filter(HiringCampaign.id == campaign_id).first()
    if not campaign:
        return

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        campaign.status = "failed"
        db.commit()
        return

    job_data = {
        "title": job.title,
        "description": job.description or "",
        "skills_required": job.skills_required or [],
    }

    total = len(candidates_data)
    campaign.total_uploaded = total
    campaign.status = "parsing"
    campaign.progress_percent = 5
    db.commit()

    # ─── Step 1: Create all Candidate records ───
    db_candidates = []
    for i, cdata in enumerate(candidates_data):
        skills_list = [s.strip() for s in cdata.get("skills", "").split(",") if s.strip()]

        db_candidate = Candidate(
            job_id=job_id,
            name=cdata.get("name", "Unknown"),
            email=cdata.get("email") or None,
            phone=cdata.get("phone") or None,
            status="Processing",
            parsed_skills=skills_list,
            experience_years=_safe_float(cdata.get("experience_years")),
            education=cdata.get("education") or None,
            current_company=cdata.get("current_company") or None,
            source="bulk_upload",
            campaign_id=campaign_id,
        )
        db.add(db_candidate)
        db_candidates.append(db_candidate)

    db.commit()
    for c in db_candidates:
        db.refresh(c)

    campaign.status = "scoring"
    campaign.progress_percent = 15
    db.commit()

    # ─── Step 2: AI-score each candidate ───
    for i, (db_candidate, cdata) in enumerate(zip(db_candidates, candidates_data)):
        candidate_profile = {
            "name": cdata.get("name", ""),
            "skills": cdata.get("skills", ""),
            "experience_years": cdata.get("experience_years", 0),
            "education": cdata.get("education", ""),
            "current_company": cdata.get("current_company", ""),
        }

        result = score_candidate_ai(candidate_profile, job_data)

        db_candidate.ai_score = result["score"]
        db_candidate.ai_reasoning = result["reasoning"]
        db_candidate.match_score = int(result["score"])

        campaign.scored_count = i + 1
        campaign.progress_percent = 15 + int((i + 1) / total * 60)  # 15-75%
        db.commit()

    # ─── Step 3: Rank and auto-shortlist ───
    campaign.status = "shortlisting"
    campaign.progress_percent = 80
    db.commit()

    # Sort by AI score descending
    db_candidates.sort(key=lambda c: (c.ai_score or 0), reverse=True)

    shortlisted_candidates = []
    rejected_candidates = []

    for i, candidate in enumerate(db_candidates):
        if len(shortlisted_candidates) < target_shortlist:
            candidate.status = "Assessment"
            shortlisted_candidates.append(candidate)
        else:
            candidate.status = "Rejected"
            rejected_candidates.append(candidate)

    campaign.shortlisted_count = len(shortlisted_candidates)
    campaign.rejected_count = len(rejected_candidates)
    db.commit()

    # ─── Step 4: Auto-create PERSONALIZED assessment + submissions ───
    campaign.status = "creating_assessments"
    campaign.progress_percent = 85
    db.commit()

    submissions = []
    for candidate in shortlisted_candidates:
        # Prepare subset of candidate data for the AI personalization
        candidate_subset = {
            "name": candidate.name,
            "skills": candidate.parsed_skills or [],
            "experience_years": candidate.experience_years or 0,
            "education": candidate.education or ""
        }
        
        # Call the new personalized AI service
        custom_data = generate_personalized_assessment(candidate_subset, job_data)
        
        # Save the interview questions to the candidate record
        candidate.interview_questions = custom_data.get("interview_questions", [])
        db.commit()

        # Create a unique Assessment just for this candidate
        assessment = Assessment(
            job_id=job_id,
            title=f"Personalized Technical Assessment — {job_data['title']} ({candidate.name})",
            type="coding",
            config=custom_data.get("assessment_config", {
                "time_limit_minutes": 45,
                "language": "python",
                "instructions": "Write a Python function representing a core component of this role."
            })
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)

        # Create their submission link
        submission = AssessmentSubmission(
            assessment_id=assessment.id,
            candidate_id=candidate.id,
            status="pending",
        )
        db.add(submission)
        submissions.append(submission)

    db.commit()
    for s in submissions:
        db.refresh(s)

    # ─── Step 5: Send notifications ───
    campaign.status = "sending_notifications"
    campaign.progress_percent = 90
    db.commit()

    for candidate, submission in zip(shortlisted_candidates, submissions):
        send_shortlist_notification(
            db=db,
            candidate=candidate,
            campaign_id=campaign_id,
            submission_id=submission.id,
        )

    for candidate in rejected_candidates:
        if candidate.email:
            send_rejection_notification(
                db=db,
                candidate=candidate,
                campaign_id=campaign_id,
            )

    # ─── Done ───
    campaign.status = "completed"
    campaign.progress_percent = 100
    campaign.completed_at = datetime.utcnow()
    db.commit()

    return {
        "total_uploaded": total,
        "scored": total,
        "shortlisted": len(shortlisted_candidates),
        "rejected": len(rejected_candidates),
        "assessments_created": len(submissions),
    }


def _safe_float(value) -> float | None:
    """Safely convert a value to float."""
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

