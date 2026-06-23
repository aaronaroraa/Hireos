"""
Interview Portal API — public-facing endpoints for the candidate interview flow.

Flow:
  GET  /portal/apply/{token}              → job info + upload form
  POST /portal/apply/{token}/upload-cv    → parse CV, generate questions, return session_id
  GET  /portal/interview/{session_id}     → questions + time remaining
  POST /portal/interview/{session_id}/start  → record started_at, set expires_at
  POST /portal/interview/{session_id}/heartbeat  → auto-save answers mid-interview
  POST /portal/interview/{session_id}/submit  → finalize, trigger async evaluation + emails
"""
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api import deps
from app.models.candidate import Candidate
from app.models.core import Job
from app.models.interview import InterviewSession
from app.services.resume_parser import extract_text_from_pdf, extract_skills, extract_experience_years
from app.services.interview_generator import generate_interview_questions
from app.services.interview_evaluator import evaluate_interview
from app.services import email_service

router = APIRouter()

INTERVIEW_DURATION_MINUTES = 30


# ── Schemas ──────────────────────────────────────────────────────────────────

class ApplyPortalResponse(BaseModel):
    job_title: str
    company_name: Optional[str] = None
    job_description: Optional[str] = None
    candidate_name: str
    status: str  # "pending" | "active" | "completed"


class CVUploadResponse(BaseModel):
    session_id: str
    candidate_name: str
    question_count: int
    message: str


class InterviewResponse(BaseModel):
    session_id: str
    candidate_name: str
    job_title: str
    questions: list[dict]
    duration_minutes: int
    started_at: Optional[str]
    expires_at: Optional[str]
    status: str


class HeartbeatRequest(BaseModel):
    answers: list[dict]  # partial answers — saved server-side


class SubmitRequest(BaseModel):
    answers: list[dict]  # [{"question": str, "answer": str, "skipped": bool, "section": str}]


class SubmitResponse(BaseModel):
    message: str
    candidate_name: str


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_session(session_id: str, db: Session) -> InterviewSession:
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found. Please check your link.")
    return session


def _get_session_by_token(token: str, db: Session) -> tuple[InterviewSession, Candidate, Job]:
    session = db.query(InterviewSession).filter(InterviewSession.token == token).first()
    if not session:
        raise HTTPException(status_code=404, detail="Invalid or expired application link.")
    candidate = db.query(Candidate).filter(Candidate.id == session.candidate_id).first()
    job = db.query(Job).filter(Job.id == session.job_id).first()
    if not candidate or not job:
        raise HTTPException(status_code=404, detail="Application record not found.")
    return session, candidate, job


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/apply/{token}", response_model=ApplyPortalResponse)
def get_apply_portal(token: str, db: Session = Depends(deps.get_db)):
    """
    Candidate lands here from their invitation email link.
    Returns job details and their current status.
    """
    session, candidate, job = _get_session_by_token(token, db)

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="You have already completed this interview. Thank you!")

    return ApplyPortalResponse(
        job_title=job.title,
        company_name=None,  # populated from company table if needed
        job_description=job.description,
        candidate_name=candidate.name,
        status=session.status,
    )


@router.post("/apply/{token}/upload-cv", response_model=CVUploadResponse)
async def upload_cv(
    token: str,
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
):
    """
    Candidate uploads their CV PDF.
    System parses it, stores the text on the candidate record,
    and generates tailored interview questions.
    """
    session, candidate, job = _get_session_by_token(token, db)

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Interview already completed.")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Please upload a PDF file.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:  # 10 MB cap
        raise HTTPException(status_code=413, detail="File too large. Maximum 10 MB.")

    # Parse CV
    cv_text = extract_text_from_pdf(pdf_bytes)
    skills = extract_skills(cv_text)
    exp_years = extract_experience_years(cv_text)

    # Persist parsed data on candidate
    candidate.resume_text = cv_text[:8000]  # store up to 8K chars
    candidate.parsed_skills = skills
    candidate.experience_years = exp_years
    db.commit()

    # Generate tailored questions from CV
    questions = generate_interview_questions(cv_text, job.title, num_questions=10)

    # Store questions in session
    session.questions = questions
    session.status = "pending"  # ready to start
    db.commit()

    return CVUploadResponse(
        session_id=session.id,
        candidate_name=candidate.name,
        question_count=len(questions),
        message="Your CV has been processed. Your interview is ready.",
    )


@router.get("/interview/{session_id}", response_model=InterviewResponse)
def get_interview(session_id: str, db: Session = Depends(deps.get_db)):
    """Return the interview session — questions, timing, status."""
    session = _get_session(session_id, db)
    candidate = db.query(Candidate).filter(Candidate.id == session.candidate_id).first()
    job = db.query(Job).filter(Job.id == session.job_id).first()

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="This interview has already been submitted.")

    # Check expiry
    if session.expires_at and datetime.utcnow() > session.expires_at and session.status == "active":
        session.status = "expired"
        db.commit()

    return InterviewResponse(
        session_id=session.id,
        candidate_name=candidate.name if candidate else "Candidate",
        job_title=job.title if job else "Role",
        questions=session.questions or [],
        duration_minutes=INTERVIEW_DURATION_MINUTES,
        started_at=session.started_at.isoformat() if session.started_at else None,
        expires_at=session.expires_at.isoformat() if session.expires_at else None,
        status=session.status,
    )


@router.post("/interview/{session_id}/start")
def start_interview(session_id: str, db: Session = Depends(deps.get_db)):
    """
    Called when the candidate presses 'Start Interview'.
    Sets the timer. Can only be called once.
    """
    session = _get_session(session_id, db)

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Interview already completed.")

    if session.status == "active":
        # Already started — return remaining time
        remaining = max(0, int((session.expires_at - datetime.utcnow()).total_seconds()))
        return {"status": "already_started", "expires_at": session.expires_at.isoformat(), "remaining_seconds": remaining}

    now = datetime.utcnow()
    session.started_at = now
    session.expires_at = now + timedelta(minutes=INTERVIEW_DURATION_MINUTES)
    session.status = "active"
    db.commit()

    return {
        "status": "started",
        "expires_at": session.expires_at.isoformat(),
        "remaining_seconds": INTERVIEW_DURATION_MINUTES * 60,
    }


@router.post("/interview/{session_id}/heartbeat")
def heartbeat(session_id: str, request: HeartbeatRequest, db: Session = Depends(deps.get_db)):
    """Auto-save partial answers every 30 seconds. Silently no-ops if already completed."""
    session = _get_session(session_id, db)
    if session.status in ("completed", "expired"):
        return {"status": "no_op"}

    session.answers = request.answers
    db.commit()
    return {"status": "saved"}


@router.post("/interview/{session_id}/submit", response_model=SubmitResponse)
async def submit_interview(
    session_id: str,
    request: SubmitRequest,
    db: Session = Depends(deps.get_db),
):
    """
    Final submission. Saves answers, marks session complete,
    triggers async evaluation + automated emails.
    """
    session = _get_session(session_id, db)

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Interview already submitted.")

    candidate = db.query(Candidate).filter(Candidate.id == session.candidate_id).first()
    job = db.query(Job).filter(Job.id == session.job_id).first()

    # Save final answers
    session.answers = request.answers
    session.submitted_at = datetime.utcnow()
    session.status = "completed"
    db.commit()

    # Move candidate to "Mock Interview" stage in the pipeline
    if candidate:
        candidate.status = "Mock Interview"
        db.commit()

    # Evaluate answers and dispatch emails asynchronously
    asyncio.create_task(
        _evaluate_and_notify(session.id, candidate.id if candidate else None, job, db)
    )

    return SubmitResponse(
        message="Interview submitted successfully.",
        candidate_name=candidate.name if candidate else "Candidate",
    )


async def _evaluate_and_notify(session_id: str, candidate_id: str | None, job, db: Session):
    """
    Background task: evaluate answers, update session, send result email.
    Small delay simulates human review time (more professional feel).
    """
    await asyncio.sleep(2)  # brief pause before DB reads

    # Fresh DB session for the background task
    from app.db.session import SessionLocal
    bg_db = SessionLocal()
    try:
        session = bg_db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        candidate = bg_db.query(Candidate).filter(Candidate.id == candidate_id).first() if candidate_id else None
        bg_job = bg_db.query(Job).filter(Job.id == session.job_id).first()

        if not session or not candidate:
            return

        # Evaluate
        result = evaluate_interview(
            qa_pairs=session.answers or [],
            job_title=bg_job.title if bg_job else "Role",
            candidate_name=candidate.name,
        )

        # Persist evaluation
        session.ai_score = result["score"]
        session.ai_feedback = result["feedback"]
        session.ai_reasoning = result["reasoning"]
        session.recommendation = result["recommendation"]
        candidate.ai_score = result["score"]
        candidate.ai_reasoning = result["reasoning"]
        bg_db.commit()

        # Send result email
        if result["recommendation"] == "advance":
            candidate.status = "Founder Round"
            bg_db.commit()
            email_service.send_interview_result_email(
                db=bg_db,
                candidate=candidate,
                job_title=bg_job.title if bg_job else "Role",
                selected=True,
                feedback=result["feedback"],
                next_stage_name="Founder Team Round",
                next_stage_description=(
                    "You will meet with one or more members of our founding team for a 45-minute conversation "
                    "about your background, goals, and how you'd approach challenges at our company. "
                    "We'll be in touch with scheduling details shortly."
                ),
            )
        else:
            candidate.status = "Rejected"
            bg_db.commit()
            email_service.send_interview_result_email(
                db=bg_db,
                candidate=candidate,
                job_title=bg_job.title if bg_job else "Role",
                selected=False,
                feedback=result["feedback"],
            )
    except Exception as e:
        print(f"[evaluate_and_notify] Error: {e}")
    finally:
        bg_db.close()
