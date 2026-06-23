"""
Assessments API — create assessments and handle code submissions.
Requires authentication. Tenant-isolated via JWT.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user, AuthenticatedUser
from app.models.assessments import Assessment, AssessmentSubmission
from app.models.candidate import Candidate
from app.models.core import Job
from app.schemas.assessment import AssessmentCreate, AssessmentResponse, SubmissionCreate, SubmissionResponse
from app.services.sandbox import CodeSandboxSimulator
from app.services.ai_assessment import generate_tailored_challenge

router = APIRouter()


class GenerateAssessmentResponse(BaseModel):
    """Response for the AI challenge generation endpoint."""
    submission_id: str
    assessment_id: str
    assessment_title: str
    candidate_name: str
    portal_url: str


@router.post("/generate/{candidate_id}", response_model=GenerateAssessmentResponse)
async def generate_assessment_for_candidate(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Generate a personalized, AI-tailored coding challenge for a specific candidate.
    
    Uses the candidate's resume, skills, and the target job description to create
    a unique assessment via OpenAI. Creates the Assessment and Submission records,
    returning a portal link the candidate can use.
    """
    # ── 1. Fetch candidate and verify tenant access ──
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    job = db.query(Job).filter(
        Job.id == candidate.job_id,
        Job.company_id == current_user.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or access denied.")

    # ── 2. Generate the AI challenge ──
    challenge = await generate_tailored_challenge(
        candidate_name=candidate.name,
        candidate_skills=candidate.parsed_skills or [],
        candidate_experience=f"{candidate.experience_years} years" if candidate.experience_years else None,
        candidate_education=candidate.education,
        job_title=job.title,
        job_description=job.description or "",
        job_skills_required=job.skills_required or [],
    )

    # ── 3. Create Assessment record ──
    assessment_config = {
        "time_limit_minutes": challenge.get("estimated_minutes", 45),
        "instructions": challenge.get("instructions", ""),
        "initial_code": challenge.get("initial_code", ""),
        "skills": challenge.get("skills_tested", []),
        "difficulty": challenge.get("difficulty", "mid"),
        "evaluation_criteria": challenge.get("evaluation_criteria", []),
        "generated_by": "ai",
    }
    
    db_assessment = Assessment(
        job_id=job.id,
        title=challenge.get("title", f"Assessment for {job.title}"),
        type="coding",
        config=assessment_config,
    )
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)

    # ── 4. Create Submission record (pending) ──
    db_submission = AssessmentSubmission(
        assessment_id=db_assessment.id,
        candidate_id=candidate.id,
        status="pending",
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)

    # ── 5. Move candidate to Assessment stage ──
    candidate.status = "Assessment"
    db.commit()

    portal_url = f"http://localhost:5173/assessment/{db_submission.id}"

    return GenerateAssessmentResponse(
        submission_id=db_submission.id,
        assessment_id=db_assessment.id,
        assessment_title=db_assessment.title,
        candidate_name=candidate.name,
        portal_url=portal_url,
    )


@router.post("/", response_model=AssessmentResponse)
def create_assessment(
    *,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
    assessment_in: AssessmentCreate,
):
    """Create a new assessment linked to a job (tenant-isolated)."""
    # Verify job belongs to this company
    job = db.query(Job).filter(
        Job.id == assessment_in.job_id,
        Job.company_id == current_user.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or access denied.")

    db_assessment = Assessment(
        job_id=assessment_in.job_id,
        title=assessment_in.title,
        type=assessment_in.type,
        config=assessment_in.config,
    )
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)
    return db_assessment


@router.get("/{job_id}", response_model=List[AssessmentResponse])
def read_assessments_for_job(
    *,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
    job_id: str,
):
    """Get all assessments for a job (tenant-isolated)."""
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_user.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or access denied.")

    return db.query(Assessment).filter(Assessment.job_id == job_id).all()


@router.post("/{assessment_id}/submit", response_model=SubmissionResponse)
async def submit_assessment(
    *,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
    assessment_id: str,
    submission_in: SubmissionCreate,
):
    """Submit code for evaluation (authenticated)."""
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    db_submission = AssessmentSubmission(
        assessment_id=assessment.id,
        candidate_id=submission_in.candidate_id,
        status="evaluating",
        code_snapshot=submission_in.code_snapshot,
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)

    results = await CodeSandboxSimulator.evaluate_code(submission_in.code_snapshot, "python")

    db_submission.status = "completed"
    db_submission.score = results.get("score")
    db_submission.feedback = results.get("feedback")
    db.commit()
    db.refresh(db_submission)

    return db_submission
