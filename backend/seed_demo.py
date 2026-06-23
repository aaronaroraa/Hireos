"""
Seed demo data for a HireOS sales demo / prototype.

Usage (locally or against a remote DB):
    export DATABASE_URL="postgresql://...supabase..."   # omit to use local sqlite
    python seed_demo.py

Creates: one company (with the HireOS persona), a few jobs, and three distinct
demo candidates — each with their own role, skills, experience, and a unique
application id. Idempotent: re-running refreshes the demo candidates.
"""
import uuid

import app.main  # noqa: F401 — registers all models/tables
from app.db.session import SessionLocal
from app.models.core import Company, Job
from app.models.candidate import Candidate
from app.models.portal import TimelineEvent, PortalMessage
from app.models.interview import InterviewSession
from app.services import portal_service


DEMO_CANDIDATES = [
    ("Priya Sharma", "priya@example.com", "Backend Engineer at Razorpay", 4,
     ["Go", "PostgreSQL", "Kubernetes", "Redis", "gRPC"],
     "Senior Backend Engineer", ["Go", "PostgreSQL", "Kubernetes"],
     "Backend Engineer at Razorpay. Built a payments ledger handling 50k TPS in Go. "
     "Led the migration to Kubernetes. Designed an idempotent webhook delivery system."),
    ("Marcus Lee", "marcus@example.com", "ML Engineer at Scale AI", 6,
     ["Python", "PyTorch", "NLP", "Ray", "AWS"],
     "Machine Learning Engineer", ["Python", "PyTorch", "NLP"],
     "ML Engineer at Scale AI. Built LLM evaluation pipelines and a RAG system over 10M "
     "documents. Published two papers on model distillation."),
    ("Aisha Khan", "aisha@example.com", "Frontend Engineer at Figma", 3,
     ["TypeScript", "React", "WebGL", "Rust", "WASM"],
     "Senior Frontend Engineer", ["TypeScript", "React", "WebGL"],
     "Frontend Engineer at Figma. Built the multiplayer cursor layer in WebGL. Shipped a "
     "Rust/WASM rendering path that cut frame time by 40%."),
]


def run():
    db = SessionLocal()
    try:
        company = db.query(Company).first()
        if not company:
            company = Company(id=str(uuid.uuid4()), name="HireOS")
            db.add(company)
            db.commit()
            db.refresh(company)
        company.name = "HireOS"
        company.agent_name = "HireOS"
        company.agent_tagline = "AI Hiring Platform"
        db.commit()

        def make_job(title, skills):
            job = db.query(Job).filter(Job.title == title, Job.company_id == company.id).first()
            if not job:
                job = Job(id=str(uuid.uuid4()), company_id=company.id, title=title,
                          description=f"{title} role.", skills_required=skills)
                db.add(job)
                db.commit()
                db.refresh(job)
            return job

        for name, email, role, exp, skills, job_title, job_skills, cv in DEMO_CANDIDATES:
            # Clear any prior demo record for a clean reseed
            for old in db.query(Candidate).filter(Candidate.email == email).all():
                db.query(TimelineEvent).filter(TimelineEvent.candidate_id == old.id).delete()
                db.query(PortalMessage).filter(PortalMessage.candidate_id == old.id).delete()
                db.query(InterviewSession).filter(InterviewSession.candidate_id == old.id).delete()
                db.delete(old)
            db.commit()

            job = make_job(job_title, job_skills)
            c = Candidate(
                id=str(uuid.uuid4()), job_id=job.id, name=name, email=email,
                status="Mock Interview", parsed_skills=skills, experience_years=exp,
                current_company=role, resume_text=cv,
            )
            db.add(c)
            db.commit()
            db.refresh(c)

            portal_service.add_timeline_event(
                db, c.id, "application_registered", "Application registered",
                "Your CV was reviewed and your application is now registered with HireOS.")
            portal_service.add_agent_message(
                db, c.id,
                f"Hi {name.split()[0]}, I'm HireOS, your AI Hiring Agent. Your first-round chat "
                f"interview is ready whenever you are — head to the Schedule tab to begin.")

            print(f"{name:14} | {email:20} | app id: {c.id.replace('-', '')[:6].upper()} | {exp}y | {role}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
