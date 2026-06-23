"""
Assessments API — create assessments and handle code submissions.
Requires authentication. Tenant-isolated via JWT.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user, AuthenticatedUser
from app.models.assessments import Assessment, AssessmentSubmission
from app.models.core import Job
from app.schemas.assessment import AssessmentCreate, AssessmentResponse, SubmissionCreate, SubmissionResponse
from app.services.sandbox import CodeSandboxSimulator

router = APIRouter()


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
