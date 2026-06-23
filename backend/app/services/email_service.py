"""
Email Service — Gmail SMTP delivery.
Uses Gmail App Password (no domain required).
Falls back to DB-only logging if credentials not set.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.candidate import Candidate
from app.core.config import settings


def _send_via_gmail(to_email: str, subject: str, body: str) -> dict:
    if not settings.GMAIL_USER or not settings.GMAIL_APP_PASSWORD:
        return {"success": False, "error": "Gmail credentials not configured."}
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            server.sendmail(settings.GMAIL_USER, to_email, msg.as_string())

        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)[:200]}


def _deliver(candidate: Candidate, subject: str, body: str) -> tuple[str, str | None]:
    if not candidate.email:
        return "logged", None
    result = _send_via_gmail(candidate.email, subject, body)
    if result["success"]:
        return "delivered", None
    return "send_attempted", result.get("error")


def _save(db: Session, candidate: Candidate, notification_type: str, subject: str,
          body: str, status: str, campaign_id: str | None = None,
          assessment_link: str | None = None) -> Notification:
    n = Notification(
        candidate_id=candidate.id,
        campaign_id=campaign_id,
        type=notification_type,
        channel="email",
        recipient_email=candidate.email,
        subject=subject,
        body=body,
        status=status,
        assessment_link=assessment_link,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


def send_shortlist_notification(db: Session, candidate: Candidate,
                                 campaign_id: str, submission_id: str | None = None) -> Notification:
    assessment_link = f"/assessment/{submission_id}" if submission_id else None
    subject = "You've been shortlisted — Next step: Online Assessment"
    body = f"""Hi {candidate.name},

Congratulations! Based on our AI-powered evaluation, you've been shortlisted for the position.

{"Next Step: Please complete your assessment at: " + assessment_link if assessment_link else "We will contact you with next steps shortly."}

Best regards,
HireOS Hiring Platform
"""
    status, error = _deliver(candidate, subject, body)
    print(f"📧 Shortlist email to {candidate.email}: {status}" + (f" — {error}" if error else ""))
    return _save(db, candidate, "assessment_invite" if assessment_link else "shortlisted",
                 subject, body, status, campaign_id, assessment_link)


def send_interview_invitation(db: Session, candidate: Candidate, job_title: str,
                               apply_token: str, base_url: str = "https://hireos.app") -> Notification:
    apply_link = f"{base_url}/apply/{apply_token}"
    subject = f"Your interview invitation — {job_title}"
    body = f"""Hi {candidate.name},

Thank you for your interest in the {job_title} position.

We'd like to invite you to complete a short AI-powered interview as the first step in our process. It takes around 30 minutes and can be done from anywhere.

Start your interview here:
{apply_link}

What to expect:
— Upload your CV to personalise your interview questions.
— The interview is 30 minutes. You'll be asked about your experience and technical background.
— Camera access is required. Copy-pasting is disabled.
— The timer starts when you click "Begin Interview", so make sure you're ready.

Best of luck.

—
HireOS Hiring Platform
"""
    status, error = _deliver(candidate, subject, body)
    print(f"📧 Interview invite to {candidate.email}: {status}" + (f" — {error}" if error else ""))
    return _save(db, candidate, "interview_invite", subject, body, status,
                 assessment_link=apply_link)


def send_interview_result_email(db: Session, candidate: Candidate, job_title: str,
                                 selected: bool, feedback: str,
                                 next_stage_name: str | None = None,
                                 next_stage_description: str | None = None) -> Notification:
    if selected:
        subject = f"Great news — you've advanced to the next round ({job_title})"
        body = f"""Hi {candidate.name},

Thank you for completing your interview for the {job_title} role.

We're pleased to let you know that you've been selected to move forward.

Feedback:
{feedback}

Next step — {next_stage_name or "Next Round"}:
{next_stage_description or "We will be in touch with details shortly."}

We'll reach out within 24-48 hours. Feel free to reply to this email with any questions.

—
HireOS Hiring Platform
"""
    else:
        subject = f"Update on your application — {job_title}"
        body = f"""Hi {candidate.name},

Thank you for completing your interview for the {job_title} role.

After careful review, we've decided to move forward with other candidates at this stage.

Feedback:
{feedback}

We appreciate the effort you put in and encourage you to apply again in the future.

—
HireOS Hiring Platform
"""
    notification_type = "selected" if selected else "rejected"
    status, error = _deliver(candidate, subject, body)
    print(f"📧 Result email to {candidate.email}: {status}" + (f" — {error}" if error else ""))
    return _save(db, candidate, notification_type, subject, body, status)


def send_stage_advancement_email(db: Session, candidate: Candidate, job_title: str,
                                  stage_name: str, stage_description: str,
                                  custom_body: str | None = None) -> Notification:
    subject = f"Next step in your application — {stage_name}"
    body = custom_body or f"""Hi {candidate.name},

You've been selected to move forward to: {stage_name}.

{stage_description}

We'll be in touch shortly with more details.

—
HireOS Hiring Platform
"""
    status, error = _deliver(candidate, subject, body)
    print(f"📧 Stage email to {candidate.email}: {status}" + (f" — {error}" if error else ""))
    return _save(db, candidate, "stage_advancement", subject, body, status)


def send_rejection_notification(db: Session, candidate: Candidate,
                                 campaign_id: str) -> Notification:
    subject = "Update on your application"
    body = f"""Hi {candidate.name},

Thank you for your interest in the position. After careful evaluation, we've decided to move forward with other candidates at this time.

We encourage you to apply for future openings.

Best regards,
HireOS Hiring Platform
"""
    status, error = _deliver(candidate, subject, body)
    print(f"📧 Rejection email to {candidate.email}: {status}" + (f" — {error}" if error else ""))
    return _save(db, candidate, "rejected", subject, body, status, campaign_id)
