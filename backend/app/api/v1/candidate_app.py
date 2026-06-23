"""
Candidate Portal API — the persistent candidate-facing workspace.

Auth: candidate signs in with the email their invitation was sent to; we issue a
candidate JWT. (In production this would be behind Google OAuth; here we verify the
email matches a known candidate, mirroring 'use this email to log in'.)

Tabs backed by these endpoints:
  /me            → identity, status, application id, agent persona  (Overview/Settings)
  /profile       → CV-extracted profile (skills, experience, files)
  /timeline      → dated journey events
  /schedule      → upcoming rounds
  /messages      → agent ↔ candidate thread
  /interview/... → the live conversational chat interview (Round 1)
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api import deps
from app.core.security import create_access_token
from app.core.config import settings as _settings
from jose import jwt as _jwt
from app.models.candidate import Candidate
from app.models.core import Job, Company
from app.models.interview import InterviewSession, PipelineConfig
from app.models.portal import TimelineEvent, PortalMessage
from app.services import chat_interview, portal_service, email_service

router = APIRouter()

# Fixed interview length. The agent never ends early — the timer ends the session.
INTERVIEW_DURATION_MINUTES = 30


def _company_name(db: Session, job: Job) -> str:
    if not job:
        return "the company"
    co = db.query(Company).filter(Company.id == job.company_id).first()
    return co.name if co else "the company"


# ── Schemas ──────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr


class LoginResponse(BaseModel):
    token: str
    candidate_name: str
    application_id: str


class ChatTurnRequest(BaseModel):
    message: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    job_id: Optional[str] = None


def _short_id(candidate_id: str) -> str:
    return candidate_id.replace("-", "")[:6].upper()


def _persona(db: Session, candidate: Candidate) -> tuple[str, str, str]:
    """Return (agent_name, agent_tagline, company_name) for this candidate's company."""
    job = db.query(Job).filter(Job.id == candidate.job_id).first() if candidate.job_id else None
    company = db.query(Company).filter(Company.id == job.company_id).first() if job else None
    if company:
        return company.agent_name or "HireOS", company.agent_tagline or "AI Hiring Platform", company.name
    return "HireOS", "AI Hiring Platform", "HireOS"


# ── Auth ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(deps.get_db)):
    """Sign in with the email the invitation was sent to."""
    candidate = (
        db.query(Candidate)
        .filter(Candidate.email == body.email)
        .order_by(Candidate.created_at.desc())
        .first()
    )
    if not candidate:
        raise HTTPException(
            status_code=404,
            detail="We couldn't find an application for that email. Use the address your invitation was sent to.",
        )

    payload = {
        "candidate_id": candidate.id,
        "type": "candidate_access",
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    token = _jwt.encode(payload, _settings.JWT_SECRET_KEY, algorithm=_settings.JWT_ALGORITHM)

    return LoginResponse(
        token=token,
        candidate_name=candidate.name,
        application_id=_short_id(candidate.id),
    )


@router.post("/register", response_model=LoginResponse)
def register(body: RegisterRequest, db: Session = Depends(deps.get_db)):
    """
    Public self-registration for the candidate portal demo.
    Anyone can enter their name + email to get a portal account and try the AI interview.
    They are placed into the first available job (or a generic demo slot).
    """
    # If they already have an account just log them in
    existing = (
        db.query(Candidate)
        .filter(Candidate.email == body.email)
        .order_by(Candidate.created_at.desc())
        .first()
    )
    if existing:
        payload = {
            "candidate_id": existing.id,
            "type": "candidate_access",
            "exp": datetime.utcnow() + timedelta(days=7),
        }
        token = _jwt.encode(payload, _settings.JWT_SECRET_KEY, algorithm=_settings.JWT_ALGORITHM)
        return LoginResponse(token=token, candidate_name=existing.name, application_id=_short_id(existing.id))

    # Use the job_id from the link if provided; otherwise fall back to the most recent open job
    if body.job_id:
        job = db.query(Job).filter(Job.id == body.job_id, Job.status == "Open").first()
    else:
        job = db.query(Job).filter(Job.status == "Open").order_by(Job.created_at.desc()).first()

    candidate = Candidate(
        name=body.name,
        email=body.email,
        job_id=job.id if job else None,
        status="Mock Interview",
        resume_text="(Self-registered via public demo portal)",
        parsed_skills=[],
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    if job:
        from app.models.core import Company
        company = db.query(Company).filter(Company.id == job.company_id).first()
        company_name = company.name if company else "HireOS"
        portal_service.add_timeline_event(
            db, candidate.id, "applied",
            "Application received",
            f"Welcome, {body.name}. You've been registered for the {job.title} role at {company_name}.",
        )
        portal_service.add_agent_message(
            db, candidate.id,
            f"Hi {body.name.split()[0]}! Welcome to HireOS. You're registered for the {job.title} role. "
            "Head to the Schedule tab to begin your AI interview when you're ready.",
        )

    payload = {
        "candidate_id": candidate.id,
        "type": "candidate_access",
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    token = _jwt.encode(payload, _settings.JWT_SECRET_KEY, algorithm=_settings.JWT_ALGORITHM)
    return LoginResponse(token=token, candidate_name=candidate.name, application_id=_short_id(candidate.id))


# ── Overview / identity ──────────────────────────────────────────────────────

@router.get("/me")
def get_me(
    candidate=Depends(deps.get_current_candidate),
    db: Session = Depends(deps.get_db),
):
    c = db.query(Candidate).filter(Candidate.id == candidate.candidate_id).first()
    job = db.query(Job).filter(Job.id == c.job_id).first()
    agent_name, agent_tagline, company_name = _persona(db, c)

    # Is the application closed?
    closed = c.status in ("Rejected", "Offer", "Closed")

    return {
        "candidate_name": c.name,
        "email": c.email,
        "application_id": _short_id(c.id),
        "status": c.status,
        "closed": closed,
        "job_title": job.title if job else "Role",
        "applied_at": c.created_at.isoformat() if c.created_at else None,
        "agent_name": agent_name,
        "agent_tagline": agent_tagline,
        "company_name": company_name,
    }


@router.get("/profile")
def get_profile(
    candidate=Depends(deps.get_current_candidate),
    db: Session = Depends(deps.get_db),
):
    c = db.query(Candidate).filter(Candidate.id == candidate.candidate_id).first()
    job = db.query(Job).filter(Job.id == c.job_id).first()
    closed = c.status in ("Rejected", "Offer", "Closed")
    return {
        "candidate_name": c.name,
        "email": c.email,
        "application_id": _short_id(c.id),
        "current_role": c.current_company or "—",
        "experience_years": c.experience_years or 0,
        "skills": c.parsed_skills or [],
        "education": c.education,
        "job_title": job.title if job else "Role",
        "locked": closed,
        "has_cv": bool(c.resume_text),
    }


@router.get("/timeline")
def get_timeline(
    candidate=Depends(deps.get_current_candidate),
    db: Session = Depends(deps.get_db),
):
    events = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.candidate_id == candidate.candidate_id)
        .order_by(TimelineEvent.created_at.desc())
        .all()
    )
    return [
        {"kind": e.kind, "title": e.title, "detail": e.detail, "at": e.created_at.isoformat()}
        for e in events
    ]


@router.get("/schedule")
def get_schedule(
    candidate=Depends(deps.get_current_candidate),
    db: Session = Depends(deps.get_db),
):
    """Upcoming rounds derived from the company's pipeline config + current status."""
    c = db.query(Candidate).filter(Candidate.id == candidate.candidate_id).first()
    job = db.query(Job).filter(Job.id == c.job_id).first()
    company_id = job.company_id if job else None

    config = (
        db.query(PipelineConfig)
        .filter(PipelineConfig.company_id == company_id, PipelineConfig.job_id == None)
        .first()
    )
    stages = config.stages if config else [
        {"name": "Founder Round", "description": "Video interview with the founding team."},
        {"name": "Technical Interview", "description": "In-person technical deep-dive."},
    ]

    full = [{"name": "Round 1 — AI Chat Interview", "description": "Conversational interview with the AI hiring agent.", "self_serve": True}]
    for i, s in enumerate(stages):
        full.append({"name": f"Round {i + 2} — {s['name']}", "description": s.get("description", ""), "self_serve": False})

    return {"current_status": c.status, "rounds": full}


# ── Messages ─────────────────────────────────────────────────────────────────

@router.get("/messages")
def get_messages(
    candidate=Depends(deps.get_current_candidate),
    db: Session = Depends(deps.get_db),
):
    msgs = (
        db.query(PortalMessage)
        .filter(PortalMessage.candidate_id == candidate.candidate_id)
        .order_by(PortalMessage.created_at.asc())
        .all()
    )
    return [
        {"sender": m.sender, "body": m.body, "at": m.created_at.isoformat()}
        for m in msgs
    ]


# ── Public job info (no auth) ────────────────────────────────────────────────

@router.get("/job-info")
def get_job_info(job_id: str, db: Session = Depends(deps.get_db)):
    """Public endpoint — returns company + role context so the portal login page can display it."""
    job = db.query(Job).filter(Job.id == job_id, Job.status == "Open").first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    company = db.query(Company).filter(Company.id == job.company_id).first()
    return {
        "job_title": job.title,
        "company_name": company.name if company else "the company",
        "skills_required": job.skills_required or [],
    }


# ── Candidate resume upload ───────────────────────────────────────────────────

@router.post("/resume/upload")
async def upload_resume(
    file: UploadFile = File(...),
    candidate=Depends(deps.get_current_candidate),
    db: Session = Depends(deps.get_db),
):
    """Candidate uploads their CV before the interview. Parses and stores it."""
    from app.services.resume_parser import parse_resume, extract_text_from_pdf
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10 MB.")
    try:
        parsed = parse_resume(contents)
        full_text = extract_text_from_pdf(contents)
    except Exception:
        raise HTTPException(status_code=422, detail="Could not parse the PDF. Please try a different file.")

    c = db.query(Candidate).filter(Candidate.id == candidate.candidate_id).first()
    c.resume_text = full_text
    c.parsed_skills = parsed.get("extracted_skills", [])
    c.experience_years = parsed.get("experience_years")
    c.education = parsed.get("education")
    db.commit()
    return {"status": "ok", "skills": c.parsed_skills, "experience_years": c.experience_years}


# ── Live conversational interview (Round 1) ──────────────────────────────────

def _active_session(db: Session, candidate_id: str) -> InterviewSession | None:
    return (
        db.query(InterviewSession)
        .filter(InterviewSession.candidate_id == candidate_id)
        .order_by(InterviewSession.created_at.desc())
        .first()
    )


@router.get("/interview")
def interview_state(
    candidate=Depends(deps.get_current_candidate),
    db: Session = Depends(deps.get_db),
):
    c = db.query(Candidate).filter(Candidate.id == candidate.candidate_id).first()
    session = _active_session(db, c.id)
    agent_name, _, company_name = _persona(db, c)
    if not session:
        return {"status": "none", "transcript": [], "agent_name": agent_name,
                "duration_minutes": INTERVIEW_DURATION_MINUTES}
    def _utc(dt): return dt.isoformat() + "Z" if dt else None
    return {
        "status": session.status,
        "transcript": session.transcript or [],
        "agent_name": agent_name,
        "expires_at": _utc(session.expires_at),
        "duration_minutes": INTERVIEW_DURATION_MINUTES,
    }


@router.post("/interview/begin")
def begin_interview(
    candidate=Depends(deps.get_current_candidate),
    db: Session = Depends(deps.get_db),
):
    """Start (or resume) the conversational interview. Returns the agent's opening line."""
    c = db.query(Candidate).filter(Candidate.id == candidate.candidate_id).first()
    job = db.query(Job).filter(Job.id == c.job_id).first()
    agent_name, _, company_name = _persona(db, c)

    session = _active_session(db, c.id)
    if not session:
        session = InterviewSession(candidate_id=c.id, job_id=c.job_id, status="pending")
        db.add(session)
        db.commit()
        db.refresh(session)

    def _utc(dt): return dt.isoformat() + "Z" if dt else None
    if session.status == "completed":
        return {"status": "completed", "transcript": session.transcript or [], "agent_name": agent_name,
                "expires_at": _utc(session.expires_at)}

    if session.transcript and session.expires_at:
        return {"status": "active", "transcript": session.transcript, "agent_name": agent_name,
                "expires_at": _utc(session.expires_at),
                "duration_minutes": INTERVIEW_DURATION_MINUTES}

    opening = chat_interview.agent_opening(company_name, c.name, job.title if job else "the role")
    now = datetime.utcnow()
    transcript = [{"role": "agent", "content": opening, "ts": now.isoformat()}]
    session.transcript = transcript
    session.status = "active"
    session.started_at = now
    session.expires_at = now + timedelta(minutes=INTERVIEW_DURATION_MINUTES)
    db.commit()

    return {"status": "active", "transcript": transcript, "agent_name": agent_name,
            "expires_at": session.expires_at.isoformat() + "Z",
            "duration_minutes": INTERVIEW_DURATION_MINUTES}


@router.post("/interview/reply")
def interview_reply(
    body: ChatTurnRequest,
    background_tasks: BackgroundTasks,
    candidate=Depends(deps.get_current_candidate),
    db: Session = Depends(deps.get_db),
):
    """
    Candidate sends a message; the interviewer responds with its next single
    question/probe. The agent NEVER ends the session — only the timer does
    (via /interview/finalize). If the deadline has passed, we finalize instead.
    """
    c = db.query(Candidate).filter(Candidate.id == candidate.candidate_id).first()
    job = db.query(Job).filter(Job.id == c.job_id).first()
    _, _, company_name = _persona(db, c)

    session = _active_session(db, c.id)
    if not session or session.status != "active":
        raise HTTPException(status_code=400, detail="No active interview to reply to.")

    # Hard timer — if the deadline passed, end the session instead of replying.
    if session.expires_at and datetime.utcnow() >= session.expires_at:
        _finalize_session(db, c, session, background_tasks)
        return {"agent_message": None, "complete": True, "transcript": session.transcript}

    transcript = list(session.transcript or [])
    transcript.append({"role": "candidate", "content": body.message[:4000], "ts": datetime.utcnow().isoformat()})

    agent_msg = chat_interview.next_agent_message(
        transcript=transcript,
        company_name=company_name,
        job_title=job.title if job else "the role",
        resume_section=c.resume_text or "(no resume on file)",
    )
    transcript.append({"role": "agent", "content": agent_msg, "ts": datetime.utcnow().isoformat()})

    session.transcript = transcript
    db.commit()

    return {"agent_message": agent_msg, "complete": False, "transcript": transcript,
            "expires_at": (session.expires_at.isoformat() + "Z") if session.expires_at else None}


@router.post("/interview/finalize")
def finalize_interview(
    background_tasks: BackgroundTasks,
    candidate=Depends(deps.get_current_candidate),
    db: Session = Depends(deps.get_db),
):
    """
    Called by the client when the timer reaches zero (also guarded server-side).
    Ends the session and kicks off the debrief + notifications.
    """
    c = db.query(Candidate).filter(Candidate.id == candidate.candidate_id).first()
    session = _active_session(db, c.id)
    if not session:
        raise HTTPException(status_code=404, detail="No interview session found.")
    if session.status == "completed":
        return {"status": "completed"}
    _finalize_session(db, c, session, background_tasks)
    return {"status": "completed"}


def _finalize_session(db: Session, c: Candidate, session: InterviewSession, background_tasks: BackgroundTasks):
    """Mark the session complete and queue the debrief + notify as a background task."""
    session.status = "completed"
    session.submitted_at = datetime.utcnow()
    if c.status in ("Applied", "Screening", "Mock Interview"):
        c.status = "Mock Interview"
    db.commit()
    portal_service.add_timeline_event(
        db, c.id, "interview_completed",
        "Round 1 interview completed",
        "Your live interview is complete. The team will review the full session and email you next steps.",
    )
    background_tasks.add_task(_evaluate_chat_and_notify, c.id)


def _evaluate_chat_and_notify(candidate_id: str):
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not c:
            return
        job = db.query(Job).filter(Job.id == c.job_id).first() if c.job_id else None
        session = (
            db.query(InterviewSession)
            .filter(InterviewSession.candidate_id == candidate_id)
            .order_by(InterviewSession.created_at.desc())
            .first()
        )
        if not session:
            return

        debrief = chat_interview.generate_debrief(
            transcript=session.transcript or [],
            company_name=_company_name(db, job),
            job_title=job.title if job else "Role",
            candidate_name=c.name,
        )
        # Map verdict → advance/reject
        advance = debrief["verdict"] in ("Strong Hire", "Hire")
        result = {
            "score": debrief["score"],
            "feedback": debrief["candidate_feedback"],
            "reasoning": debrief["debrief_markdown"],   # full recruiter debrief
            "recommendation": "advance" if advance else "reject",
        }
        session.ai_score = result["score"]
        session.ai_feedback = result["feedback"]
        session.ai_reasoning = result["reasoning"]
        session.recommendation = result["recommendation"]
        c.ai_score = result["score"]
        c.ai_reasoning = result["reasoning"]
        db.commit()

        if result["recommendation"] == "advance":
            c.status = "Founder Round"
            db.commit()
            portal_service.add_timeline_event(
                db, c.id, "advanced", "Advanced to Round 2",
                "You've been selected to continue to the founder round.",
            )
            portal_service.add_agent_message(
                db, c.id,
                f"{result['feedback']} You've advanced to the next round — the team will reach out by email with scheduling.",
            )
            email_service.send_interview_result_email(
                db=db, candidate=c, job_title=job.title if job else "Role",
                selected=True, feedback=result["feedback"],
                next_stage_name="Founder Round",
                next_stage_description="A video interview with the founding team. We'll email you scheduling details.",
            )
        else:
            c.status = "Rejected"
            db.commit()
            portal_service.add_timeline_event(
                db, c.id, "closed", "Application closed",
                "After review, the team decided not to proceed at this time.",
            )
            portal_service.add_agent_message(db, c.id, result["feedback"])
            email_service.send_interview_result_email(
                db=db, candidate=c, job_title=job.title if job else "Role",
                selected=False, feedback=result["feedback"],
            )
    except Exception as e:
        print(f"[candidate_app] eval/notify failed: {e}")
    finally:
        db.close()
