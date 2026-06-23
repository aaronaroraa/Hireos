"""
Pipeline configuration API — lets companies define variable interview stages.
Each stage has a name, description, and email template.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.api import deps
from app.models.interview import PipelineConfig, InterviewSession
from app.models.candidate import Candidate
from app.models.core import Job, Company
from app.services import email_service, portal_service

router = APIRouter()

DEFAULT_STAGES = [
    {
        "name": "Founder Round",
        "description": "A 45-minute conversation with the founding team about your background and goals.",
        "email_subject": "Next step: Founder Team Round",
        "email_body": None,  # None = use the default template from email_service
    },
    {
        "name": "Technical Interview",
        "description": "A 60-minute deep-dive into your technical skills, problem-solving, and past projects.",
        "email_subject": "Next step: Technical Interview",
        "email_body": None,
    },
]


class StageSchema(BaseModel):
    name: str
    description: str
    email_subject: Optional[str] = None
    email_body: Optional[str] = None


class PipelineConfigCreate(BaseModel):
    job_id: Optional[str] = None
    stages: list[StageSchema]


class PipelineConfigResponse(BaseModel):
    id: str
    company_id: str
    job_id: Optional[str]
    stages: list[dict]


class InviteCandidateRequest(BaseModel):
    candidate_id: str
    base_url: str = "https://hireos.app"


@router.get("/", response_model=list[PipelineConfigResponse])
def list_configs(
    current_user=Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    configs = db.query(PipelineConfig).filter(
        PipelineConfig.company_id == current_user.company_id
    ).all()
    return [
        PipelineConfigResponse(id=c.id, company_id=c.company_id, job_id=c.job_id, stages=c.stages)
        for c in configs
    ]


@router.post("/", response_model=PipelineConfigResponse)
def create_config(
    body: PipelineConfigCreate,
    current_user=Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    # Replace company-default if no job_id
    existing = db.query(PipelineConfig).filter(
        PipelineConfig.company_id == current_user.company_id,
        PipelineConfig.job_id == body.job_id,
    ).first()

    stages_data = [s.model_dump() for s in body.stages]

    if existing:
        existing.stages = stages_data
        db.commit()
        db.refresh(existing)
        return PipelineConfigResponse(
            id=existing.id, company_id=existing.company_id,
            job_id=existing.job_id, stages=existing.stages
        )

    config = PipelineConfig(
        id=str(uuid.uuid4()),
        company_id=current_user.company_id,
        job_id=body.job_id,
        stages=stages_data,
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return PipelineConfigResponse(
        id=config.id, company_id=config.company_id,
        job_id=config.job_id, stages=config.stages
    )


class PersonaSchema(BaseModel):
    agent_name: str
    agent_tagline: str


@router.get("/persona", response_model=PersonaSchema)
def get_persona(
    current_user=Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    return PersonaSchema(
        agent_name=(company.agent_name if company else None) or "HireOS",
        agent_tagline=(company.agent_tagline if company else None) or "AI Hiring Platform",
    )


@router.put("/persona", response_model=PersonaSchema)
def set_persona(
    body: PersonaSchema,
    current_user=Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
    company.agent_name = body.agent_name.strip()[:120] or "HireOS"
    company.agent_tagline = body.agent_tagline.strip()[:120] or "AI Hiring Platform"
    db.commit()
    return PersonaSchema(agent_name=company.agent_name, agent_tagline=company.agent_tagline)


@router.get("/defaults")
def get_default_stages():
    """Return the default stage templates so the frontend can pre-populate the editor."""
    return {"stages": DEFAULT_STAGES}


@router.post("/invite")
def invite_candidate(
    body: InviteCandidateRequest,
    current_user=Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    """
    Create an interview session for a candidate and send the invitation email.
    The candidate must already exist in the system (via bulk upload or manual add).
    """
    candidate = db.query(Candidate).filter(Candidate.id == body.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    # Ownership check — the candidate's job must belong to the recruiter's company
    job = db.query(Job).filter(
        Job.id == candidate.job_id,
        Job.company_id == current_user.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Check if an interview session already exists
    existing = db.query(InterviewSession).filter(
        InterviewSession.candidate_id == candidate.id,
        InterviewSession.status.notin_(["completed", "expired"]),
    ).first()
    if existing:
        return {
            "message": "Interview invitation already sent.",
            "apply_link": f"{body.base_url}/apply/{existing.token}",
            "session_id": existing.id,
        }

    # Create new session
    session = InterviewSession(
        candidate_id=candidate.id,
        job_id=job.id,
        status="pending",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Send email
    notification = email_service.send_interview_invitation(
        db=db,
        candidate=candidate,
        job_title=job.title,
        apply_token=session.token,
        base_url=body.base_url,
    )

    # Move candidate to "Mock Interview" stage
    candidate.status = "Mock Interview"
    db.commit()

    # Seed the portal: timeline event + the agent's welcome message
    job_company = db.query(Company).filter(Company.id == job.company_id).first()
    agent_name = (job_company.agent_name if job_company else None) or "HireOS"
    company_name = job_company.name if job_company else "our team"
    portal_service.add_timeline_event(
        db, candidate.id, "application_registered",
        "Application registered",
        f"Your CV was reviewed and your application is now registered with {company_name}.",
    )
    portal_service.add_agent_message(
        db, candidate.id,
        f"Hi {candidate.name}, I'm {agent_name}, {company_name}'s AI Hiring Agent. Your application is "
        f"registered and your first-round chat interview is ready whenever you are — head to the Schedule "
        f"tab to begin. If you have any questions before you start, just reply here.",
    )

    return {
        "message": "Interview invitation sent.",
        "apply_link": f"{body.base_url}/apply/{session.token}",
        "session_id": session.id,
        "email_status": notification.status,
    }


@router.post("/advance/{candidate_id}")
def advance_candidate(
    candidate_id: str,
    current_user=Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    """
    Manually advance a candidate to the next pipeline stage and send the appropriate email.
    Uses the company's PipelineConfig if available, else falls back to defaults.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    # Ownership check — the candidate's job must belong to the recruiter's company
    job = db.query(Job).filter(
        Job.id == candidate.job_id,
        Job.company_id == current_user.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Fetch pipeline config
    config = db.query(PipelineConfig).filter(
        PipelineConfig.company_id == current_user.company_id,
        PipelineConfig.job_id == candidate.job_id,
    ).first()
    if not config:
        config = db.query(PipelineConfig).filter(
            PipelineConfig.company_id == current_user.company_id,
            PipelineConfig.job_id == None,
        ).first()

    stages = config.stages if config else DEFAULT_STAGES
    current_status = candidate.status

    # Map stages to status names
    stage_names = ["Mock Interview"] + [s["name"] for s in stages] + ["Offer"]
    try:
        current_idx = stage_names.index(current_status)
    except ValueError:
        current_idx = 0

    if current_idx >= len(stage_names) - 1:
        raise HTTPException(status_code=400, detail="Candidate is already at the final stage.")

    next_stage_config = stages[current_idx] if current_idx < len(stages) else None
    next_status = stage_names[current_idx + 1]

    candidate.status = next_status
    db.commit()

    if next_stage_config:
        email_service.send_stage_advancement_email(
            db=db,
            candidate=candidate,
            job_title=job.title if job else "Role",
            stage_name=next_stage_config["name"],
            stage_description=next_stage_config["description"],
            custom_body=next_stage_config.get("email_body"),
        )

    return {"message": f"Candidate advanced to {next_status}.", "new_status": next_status}
