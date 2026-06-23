"""
Helpers for the candidate portal — recording timeline events and agent messages.
"""
from sqlalchemy.orm import Session
from app.models.portal import TimelineEvent, PortalMessage


def add_timeline_event(db: Session, candidate_id: str, kind: str, title: str, detail: str | None = None) -> TimelineEvent:
    event = TimelineEvent(candidate_id=candidate_id, kind=kind, title=title, detail=detail)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def add_agent_message(db: Session, candidate_id: str, body: str) -> PortalMessage:
    msg = PortalMessage(candidate_id=candidate_id, sender="agent", body=body)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def add_candidate_message(db: Session, candidate_id: str, body: str) -> PortalMessage:
    msg = PortalMessage(candidate_id=candidate_id, sender="candidate", body=body)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
