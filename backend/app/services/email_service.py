"""
Email Service — Real email delivery via Resend API.

- In production: sends real emails via Resend (https://resend.com)
- In development: logs emails to the Notification table (if no RESEND_API_KEY)
- Always persists to DB regardless of delivery method.
"""
import requests
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.candidate import Candidate
from app.core.config import settings


def _send_via_resend(to_email: str, subject: str, body: str) -> dict:
    """
    Send an email via Resend's HTTP API.
    Returns: {"success": True/False, "id": "...", "error": "..."}
    """
    if not settings.RESEND_API_KEY or settings.RESEND_API_KEY == "re_placeholder":
        return {"success": False, "error": "No Resend API key configured — email logged only."}

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.EMAIL_FROM,
                "to": [to_email],
                "subject": subject,
                "text": body,
            },
            timeout=10,
        )

        if response.status_code in (200, 201):
            data = response.json()
            return {"success": True, "id": data.get("id", "unknown")}
        else:
            return {
                "success": False,
                "error": f"Resend API returned {response.status_code}: {response.text[:200]}",
            }

    except requests.exceptions.Timeout:
        return {"success": False, "error": "Email delivery timed out."}
    except Exception as e:
        return {"success": False, "error": str(e)[:200]}


def send_shortlist_notification(
    db: Session,
    candidate: Candidate,
    campaign_id: str,
    submission_id: str | None = None,
) -> Notification:
    """
    Send a notification to a shortlisted candidate with their assessment link.
    Attempts real email delivery via Resend; falls back to DB-only logging.
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

    # Determine delivery status
    delivery_status = "logged"
    delivery_error = None

    if candidate.email:
        result = _send_via_resend(candidate.email, subject, body)
        if result["success"]:
            delivery_status = "delivered"
        else:
            delivery_status = "send_attempted"
            delivery_error = result.get("error")

    notification = Notification(
        candidate_id=candidate.id,
        campaign_id=campaign_id,
        type="assessment_invite" if assessment_link else "shortlisted",
        channel="email",
        recipient_email=candidate.email,
        subject=subject,
        body=body,
        status=delivery_status,
        assessment_link=assessment_link,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    # Log delivery result for debugging
    if delivery_error:
        print(f"📧 Email to {candidate.email}: {delivery_status} — {delivery_error}")
    else:
        print(f"📧 Email to {candidate.email}: {delivery_status}")

    return notification


def send_rejection_notification(
    db: Session,
    candidate: Candidate,
    campaign_id: str,
) -> Notification:
    """
    Send a rejection notification to a candidate.
    Attempts real email delivery via Resend; falls back to DB-only logging.
    """
    subject = "Update on your application"
    body = f"""Hi {candidate.name},

Thank you for your interest in the position. After careful evaluation, we've decided to move forward with other candidates whose profiles more closely match our current requirements.

We encourage you to apply for future openings that match your skills.

Best regards,
Recruitment OS
"""

    delivery_status = "logged"
    delivery_error = None

    if candidate.email:
        result = _send_via_resend(candidate.email, subject, body)
        if result["success"]:
            delivery_status = "delivered"
        else:
            delivery_status = "send_attempted"
            delivery_error = result.get("error")

    notification = Notification(
        candidate_id=candidate.id,
        campaign_id=campaign_id,
        type="rejected",
        channel="email",
        recipient_email=candidate.email,
        subject=subject,
        body=body,
        status=delivery_status,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    if delivery_error:
        print(f"📧 Rejection email to {candidate.email}: {delivery_status} — {delivery_error}")

    return notification
