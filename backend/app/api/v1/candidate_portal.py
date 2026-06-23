"""
Candidate Portal API — Public-facing endpoints for candidates to take assessments.
No authentication required — candidates access via unique submission ID from email link.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.api import deps
from app.models.assessments import Assessment, AssessmentSubmission
from app.models.candidate import Candidate
from app.services.sandbox import CodeSandboxSimulator

router = APIRouter()


class AssessmentPortalResponse(BaseModel):
    submission_id: str
    candidate_name: str
    assessment_title: str
    assessment_type: str
    time_limit_minutes: int
    instructions: str
    skills: list[str]
    status: str


class AssessmentSubmitRequest(BaseModel):
    code_snapshot: str
    language: Optional[str] = "python"


class AssessmentSubmitResponse(BaseModel):
    submission_id: str
    status: str
    score: Optional[int]
    feedback: Optional[str]
    candidate_name: str


@router.get("/{submission_id}", response_model=AssessmentPortalResponse)
def get_assessment_portal(
    submission_id: str,
    db: Session = Depends(deps.get_db),
):
    """
    Candidate lands here via their email link.
    Returns assessment instructions and details.
    """
    submission = db.query(AssessmentSubmission).filter(
        AssessmentSubmission.id == submission_id
    ).first()

    if not submission:
        raise HTTPException(status_code=404, detail="Assessment not found. Please check your link.")

    if submission.status == "completed":
        raise HTTPException(
            status_code=400,
            detail="This assessment has already been completed. Thank you for your submission!"
        )

    assessment = db.query(Assessment).filter(Assessment.id == submission.assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment configuration not found.")

    candidate = db.query(Candidate).filter(Candidate.id == submission.candidate_id).first()

    config = assessment.config or {}

    return AssessmentPortalResponse(
        submission_id=submission.id,
        candidate_name=candidate.name if candidate else "Candidate",
        assessment_title=assessment.title,
        assessment_type=assessment.type,
        time_limit_minutes=config.get("time_limit_minutes", 45),
        instructions=config.get("instructions", "Complete the technical assessment below."),
        skills=config.get("skills", []),
        status=submission.status,
    )


@router.post("/{submission_id}/submit", response_model=AssessmentSubmitResponse)
async def submit_assessment(
    submission_id: str,
    request: AssessmentSubmitRequest,
    db: Session = Depends(deps.get_db),
):
    """
    Candidate submits their code. System evaluates and scores it.
    """
    submission = db.query(AssessmentSubmission).filter(
        AssessmentSubmission.id == submission_id
    ).first()

    if not submission:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    if submission.status == "completed":
        raise HTTPException(status_code=400, detail="Assessment already submitted.")

    # Save the code
    submission.status = "evaluating"
    submission.code_snapshot = request.code_snapshot
    submission.submitted_at = datetime.utcnow()
    db.commit()

    # Evaluate via the sandbox
    results = await CodeSandboxSimulator.evaluate_code(
        request.code_snapshot, request.language or "python"
    )

    # Update with results
    submission.status = "completed"
    submission.score = results.get("score", 0)
    submission.feedback = results.get("feedback", "")
    db.commit()
    db.refresh(submission)

    # Update candidate status to Interview (next stage)
    candidate = db.query(Candidate).filter(Candidate.id == submission.candidate_id).first()
    if candidate:
        candidate.status = "Interview"
        db.commit()

    return AssessmentSubmitResponse(
        submission_id=submission.id,
        status=submission.status,
        score=submission.score,
        feedback=submission.feedback,
        candidate_name=candidate.name if candidate else "Candidate",
    )
