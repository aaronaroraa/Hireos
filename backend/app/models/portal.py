"""
Candidate portal models — timeline events and the message thread with the agent.
These power the persistent candidate workspace (Overview / Timeline / Messages).
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from app.db.session import Base


def _uuid():
    return str(uuid.uuid4())


class TimelineEvent(Base):
    """A dated event in the candidate's application journey."""
    __tablename__ = "timeline_events"

    id = Column(String, primary_key=True, default=_uuid)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False, index=True)

    # e.g. "application_registered", "interview_completed", "advanced", "scheduled", "rejected"
    kind = Column(String, nullable=False)
    title = Column(String, nullable=False)
    detail = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class PortalMessage(Base):
    """A message in the candidate ↔ agent thread (the 'Messages' tab)."""
    __tablename__ = "portal_messages"

    id = Column(String, primary_key=True, default=_uuid)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False, index=True)

    # "agent" or "candidate"
    sender = Column(String, nullable=False)
    body = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
