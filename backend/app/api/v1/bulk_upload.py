"""
Bulk Upload API — Automated bulk hiring pipeline.
All endpoints require authentication. Campaigns are tenant-scoped via JWT.
"""
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user, AuthenticatedUser
from app.models.campaign import HiringCampaign
from app.models.candidate import Candidate
from app.models.assessments import AssessmentSubmission
from app.models.notification import Notification
from app.models.core import Job
from app.schemas.campaign import CampaignResponse
from app.services.automation_engine import parse_spreadsheet, run_campaign

router = APIRouter()


def _verify_campaign_access(
    db: Session, campaign_id: str, company_id: str
) -> HiringCampaign:
    """Verify a campaign exists and belongs to the user's company."""
    campaign = db.query(HiringCampaign).filter(
        HiringCampaign.id == campaign_id,
        HiringCampaign.company_id == company_id,
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found or access denied.")
    return campaign


@router.post("/upload", response_model=CampaignResponse)
def bulk_upload_candidates(
    file: UploadFile = File(...),
    job_id: str = Form(...),
    target_shortlist: int = Form(10),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Upload Excel/CSV → AI score → auto-shortlist → create assessments → send notifications.
    company_id is derived from the JWT (tenant-isolated).
    """
    # Validate file type
    filename = file.filename or "upload.xlsx"
    if not filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Only Excel (.xlsx, .xls) and CSV files are supported.")

    # Tenant isolation: verify the job belongs to this company
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_user.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or access denied.")

    # Read file
    file_bytes = file.file.read()

    # Parse spreadsheet
    try:
        candidates_data = parse_spreadsheet(file_bytes, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not candidates_data:
        raise HTTPException(status_code=400, detail="No valid candidate rows found.")

    # Create campaign (company_id from JWT)
    campaign = HiringCampaign(
        job_id=job_id,
        company_id=current_user.company_id,
        total_uploaded=len(candidates_data),
        target_shortlist=target_shortlist,
        status="parsing",
        progress_percent=5,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    # Run automation pipeline
    try:
        run_campaign(db, campaign.id, candidates_data, job_id, target_shortlist)
    except Exception as e:
        campaign.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Campaign processing failed: {str(e)}")

    db.refresh(campaign)
    return campaign


@router.get("/campaigns", response_model=List[CampaignResponse])
def get_campaigns(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get all hiring campaigns for the authenticated user's company."""
    campaigns = db.query(HiringCampaign).filter(
        HiringCampaign.company_id == current_user.company_id,
    ).order_by(HiringCampaign.created_at.desc()).all()
    return campaigns


@router.get("/campaign/{campaign_id}", response_model=CampaignResponse)
def get_campaign_status(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get real-time status of a campaign (tenant-isolated)."""
    return _verify_campaign_access(db, campaign_id, current_user.company_id)


@router.get("/campaign/{campaign_id}/results")
def get_campaign_results(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get detailed results including assessment & notification status."""
    campaign = _verify_campaign_access(db, campaign_id, current_user.company_id)

    candidates = db.query(Candidate).filter(
        Candidate.campaign_id == campaign_id
    ).order_by(Candidate.ai_score.desc()).all()

    shortlisted = [c for c in candidates if c.status not in ("Rejected", "Processing")]
    rejected = [c for c in candidates if c.status == "Rejected"]

    # Get assessment submissions
    shortlisted_ids = [c.id for c in shortlisted]
    submissions = {}
    if shortlisted_ids:
        subs = db.query(AssessmentSubmission).filter(
            AssessmentSubmission.candidate_id.in_(shortlisted_ids)
        ).all()
        submissions = {s.candidate_id: s for s in subs}

    # Get notifications
    notifications = {}
    notifs = db.query(Notification).filter(
        Notification.campaign_id == campaign_id
    ).all()
    for n in notifs:
        notifications[n.candidate_id] = {
            "type": n.type,
            "status": n.status,
            "sent_at": n.sent_at.isoformat() if n.sent_at else None,
            "assessment_link": n.assessment_link,
        }

    return {
        "campaign": {
            "id": campaign.id,
            "status": campaign.status,
            "total_uploaded": campaign.total_uploaded,
            "target_shortlist": campaign.target_shortlist,
        },
        "shortlisted": [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "ai_score": c.ai_score,
                "ai_reasoning": c.ai_reasoning,
                "skills": c.parsed_skills,
                "experience_years": c.experience_years,
                "education": c.education,
                "status": c.status,
                "assessment": {
                    "submission_id": submissions[c.id].id if c.id in submissions else None,
                    "status": submissions[c.id].status if c.id in submissions else None,
                    "score": submissions[c.id].score if c.id in submissions else None,
                    "assessment_link": f"/assessment/{submissions[c.id].id}" if c.id in submissions else None,
                } if c.id in submissions else None,
                "notification": notifications.get(c.id),
            }
            for c in shortlisted
        ],
        "rejected_count": len(rejected),
        "notifications_sent": len(notifs),
        "score_distribution": {
            "90+": len([c for c in candidates if (c.ai_score or 0) >= 90]),
            "70-89": len([c for c in candidates if 70 <= (c.ai_score or 0) < 90]),
            "50-69": len([c for c in candidates if 50 <= (c.ai_score or 0) < 70]),
            "below_50": len([c for c in candidates if (c.ai_score or 0) < 50]),
        },
    }


@router.get("/campaign/{campaign_id}/final-ranking")
def get_final_ranking(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Final ranking: AI Score (60%) + Assessment Score (40%)."""
    campaign = _verify_campaign_access(db, campaign_id, current_user.company_id)

    candidates = db.query(Candidate).filter(
        Candidate.campaign_id == campaign_id,
        Candidate.status.notin_(["Rejected", "Processing"]),
    ).all()

    results = []
    for candidate in candidates:
        submission = db.query(AssessmentSubmission).filter(
            AssessmentSubmission.candidate_id == candidate.id
        ).first()

        ai_score = candidate.ai_score or 0
        assessment_score = submission.score if submission and submission.status == "completed" else None

        if assessment_score is not None:
            final_score = round(ai_score * 0.6 + assessment_score * 0.4, 1)
        else:
            final_score = ai_score

        results.append({
            "id": candidate.id,
            "name": candidate.name,
            "email": candidate.email,
            "skills": candidate.parsed_skills,
            "experience_years": candidate.experience_years,
            "education": candidate.education,
            "ai_score": ai_score,
            "assessment_score": assessment_score,
            "assessment_status": submission.status if submission else "not_assigned",
            "final_score": final_score,
            "status": candidate.status,
        })

    results.sort(key=lambda r: r["final_score"], reverse=True)
    for i, r in enumerate(results):
        r["rank"] = i + 1

    return {
        "campaign_id": campaign_id,
        "total_ranked": len(results),
        "assessments_completed": len([r for r in results if r["assessment_score"] is not None]),
        "assessments_pending": len([r for r in results if r["assessment_score"] is None]),
        "ranking": results,
    }


@router.get("/recent-shortlisted")
def get_recent_shortlisted(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Return the 15 most recently shortlisted candidates across all campaigns for this company."""
    candidates = (
        db.query(Candidate)
        .join(Job, Candidate.job_id == Job.id)
        .filter(
            Job.company_id == current_user.company_id,
            Candidate.ai_score.isnot(None),
            Candidate.status.notin_(["Rejected", "Processing"]),
        )
        .order_by(Candidate.created_at.desc())
        .limit(15)
        .all()
    )

    return [
        {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "ai_score": c.ai_score,
            "status": c.status,
            "job_title": c.job.title if c.job else "Unknown",
            "experience_years": c.experience_years,
            "skills": (c.parsed_skills or [])[:3],
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in candidates
    ]
