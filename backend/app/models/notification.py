"""
Notification model — tracks emails and notifications sent to candidates.
"""
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from datetime import datetime
from app.db.session import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    campaign_id = Column(String, ForeignKey("hiring_campaigns.id"), nullable=True)

    # Type: 'shortlisted', 'assessment_invite', 'rejected', 'offer'
    type = Column(String, nullable=False)

    # Channel: 'email', 'sms', 'in_app'
    channel = Column(String, default="email")

    recipient_email = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    body = Column(Text, nullable=True)

    # Status: 'sent', 'delivered', 'failed', 'pending'
    status = Column(String, default="sent")

    # For assessment invites — the unique link
    assessment_link = Column(String, nullable=True)

    sent_at = Column(DateTime, default=datetime.utcnow)
