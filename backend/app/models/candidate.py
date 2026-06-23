import uuid
from sqlalchemy import Column, String, Text, Float, ForeignKey, JSON, DateTime, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String, ForeignKey("jobs.id"), nullable=True, index=True)
    name = Column(String, nullable=False, default="Unknown Candidate")
    email = Column(String, nullable=True, index=True)
    phone = Column(String, nullable=True)
    
    # Kanban Status: 'Applied', 'Screening', 'Assessment', 'Interview', 'Offer', 'Rejected'
    status = Column(String, nullable=False, default="Applied")
    
    # Store AI parsed results directly on the Candidate model for easy access
    parsed_skills = Column(JSON, nullable=True)     # List of strings
    parsed_experience = Column(JSON, nullable=True) # Could be int total_years, or detailed dict
    resume_text = Column(Text, nullable=True)       # The raw extracted text
    
    # A generic score metric (e.g. 0-100 match accuracy calculated from AI)
    match_score = Column(Integer, nullable=True)

    # AI scoring fields (Phase 7)
    ai_score = Column(Float, nullable=True)       # 0-100 match score from AI
    ai_reasoning = Column(Text, nullable=True)     # AI's explanation for the score
    interview_questions = Column(JSON, nullable=True) # AI generated custom questions
    source = Column(String, default="manual")       # 'manual', 'bulk_upload', 'resume_parse'
    campaign_id = Column(String, ForeignKey("hiring_campaigns.id"), nullable=True, index=True)

    # Candidate data from spreadsheet (if no resume)
    experience_years = Column(Float, nullable=True)
    education = Column(String, nullable=True)
    current_company = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job = relationship("Job")
