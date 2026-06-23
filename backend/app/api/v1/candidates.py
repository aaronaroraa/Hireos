"""
Candidates API — query and update candidate pipeline status.
All endpoints require authentication. Candidates are scoped to the user's company.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user, AuthenticatedUser
from app.models.candidate import Candidate
from app.models.core import Job
from app.schemas.candidate import CandidateResponse, CandidateUpdateStatus

router = APIRouter()


@router.get("/", response_model=List[CandidateResponse])
def get_candidates_for_job(
    *,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
    job_id: str,
):
    """Get all candidates for a job — only if the job belongs to the user's company."""
    # Verify the job belongs to this company (tenant isolation)
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_user.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or access denied.")

    candidates = db.query(Candidate).filter(Candidate.job_id == job_id).all()
    return candidates


@router.patch("/{candidate_id}/status", response_model=CandidateResponse)
def update_candidate_status(
    *,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
    candidate_id: str,
    status_update: CandidateUpdateStatus,
):
    """Update a candidate's pipeline status (e.g., Applied → Interview)."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Verify the candidate's job belongs to this company (tenant isolation)
    job = db.query(Job).filter(
        Job.id == candidate.job_id,
        Job.company_id == current_user.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=403, detail="Access denied.")

    allowed_statuses = ["Applied", "Screening", "Assessment", "Interview", "Offer", "Rejected"]
    if status_update.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid status transition")

    candidate.status = status_update.status
    db.commit()
    db.refresh(candidate)

    return candidate
