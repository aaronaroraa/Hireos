"""
Email Service — Handles candidate notifications.

In development: logs emails to the Notification table (mock).
In production: would connect to SendGrid, AWS SES, or similar.
"""
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.candidate import Candidate
from app.models.assessments import AssessmentSubmission


def send_shortlist_notification(
    db: Session,
    candidate: Candidate,
    campaign_id: str,
    submission_id: str | None = None,
) -> Notification:
    """
    Send a notification to a shortlisted candidate with their assessment link.
    """
    assessment_link = f"/assessment/{submission_id}" if submission_id else None

    subject = f"🎉 You've been shortlisted! Next step: Online Assessment"

    body = f"""Hi {candidate.name},

Congratulations! Based on our AI-powered evaluation, you've been shortlisted for the position.

Your AI Match Score: {candidate.ai_score or 'N/A'}%

{"Next Step:" if assessment_link else ""}
{"Please complete your assessment at: " + assessment_link if assessment_link else "We will contact you with next steps shortly."}

This assessment will evaluate your technical skills. Please complete it within 48 hours.

Best regards,
Recruitment OS — Automated Hiring Platform
"""

    notification = Notification(
        candidate_id=candidate.id,
        campaign_id=campaign_id,
        type="assessment_invite" if assessment_link else "shortlisted",
        channel="email",
        recipient_email=candidate.email,
        subject=subject,
        body=body,
        status="sent",
        assessment_link=assessment_link,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


def send_rejection_notification(
    db: Session,
    candidate: Candidate,
    campaign_id: str,
) -> Notification:
    """
    Send a rejection notification to a candidate.
    """
    subject = "Update on your application"
    body = f"""Hi {candidate.name},

Thank you for your interest in the position. After careful evaluation, we've decided to move forward with other candidates whose profiles more closely match our current requirements.

We encourage you to apply for future openings that match your skills.

Best regards,
Recruitment OS
"""
    notification = Notification(
        candidate_id=candidate.id,
        campaign_id=campaign_id,
        type="rejected",
        channel="email",
        recipient_email=candidate.email,
        subject=subject,
        body=body,
        status="sent",
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification
