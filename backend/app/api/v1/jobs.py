"""
Jobs API — CRUD for job postings.
All endpoints require authentication. company_id is derived from the JWT.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user, AuthenticatedUser
from app.models.core import Job
from app.schemas.job import JobCreate, JobResponse, JDGenerateRequest
from app.services.ai_evaluator import generate_job_description as ai_generate_jd

router = APIRouter()


@router.post("/", response_model=JobResponse)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Create a new job posting for the authenticated user's company."""
    new_job = Job(
        company_id=current_user.company_id,  # ← from JWT, not query param
        title=job_in.title,
        description=job_in.description,
        skills_required=job_in.skills_required,
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job


@router.get("/", response_model=List[JobResponse])
def list_jobs(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """List all jobs for the authenticated user's company."""
    jobs = db.query(Job).filter(Job.company_id == current_user.company_id).all()
    return jobs


@router.post("/generate-jd")
def generate_job_description(
    request: JDGenerateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Generate an AI-powered job description (authenticated only)."""
    jd_content = ai_generate_jd(request.title, request.skills)
    return {"generated_jd": jd_content}
