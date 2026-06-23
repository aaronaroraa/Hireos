"""
Interview session and pipeline configuration models.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, DateTime, JSON, ForeignKey
from app.db.session import Base


def _uuid():
    return str(uuid.uuid4())


class InterviewSession(Base):
    """One interview session per candidate per job."""
    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True, default=_uuid)
    token = Column(String, unique=True, index=True, default=_uuid)  # URL-safe token

    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)

    # Generated questions (legacy fixed-form mode): [{"section": "...", "question": "..."}]
    questions = Column(JSON, nullable=True)

    # Submitted answers (legacy fixed-form mode)
    answers = Column(JSON, nullable=True)

    # Conversational transcript: [{"role": "agent"|"candidate", "content": "...", "ts": "..."}]
    transcript = Column(JSON, nullable=True)

    # How many substantive agent questions have been asked (drives length/pacing)
    turns_asked = Column(Float, default=0)

    # Status: pending → active → completed | expired
    status = Column(String, default="pending")

    # Evaluation results (populated after submission)
    ai_score = Column(Float, nullable=True)           # 0-100
    ai_feedback = Column(Text, nullable=True)          # Summary paragraph for candidate
    ai_reasoning = Column(Text, nullable=True)         # Internal notes for recruiter
    recommendation = Column(String, nullable=True)     # "advance" | "reject"

    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)       # started_at + 30 min
    submitted_at = Column(DateTime, nullable=True)


class PipelineConfig(Base):
    """
    Company-level (or job-level) interview stage configuration.
    Allows each company to define their own rounds after the mock interview.
    """
    __tablename__ = "pipeline_configs"

    id = Column(String, primary_key=True, default=_uuid)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=True)  # None = company default

    # stages: [{"name": "Founder Round", "description": "...", "email_subject": "...", "email_body": "..."}]
    stages = Column(JSON, nullable=False, default=list)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
