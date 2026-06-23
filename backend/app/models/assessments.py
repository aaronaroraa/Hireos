import uuid
from sqlalchemy import Column, String, Text, ForeignKey, Integer, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False) # e.g., 'coding', 'multiple_choice'
    config = Column(JSON, nullable=True) # E.g. {"time_limit": 60, "language": "python"}
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job")
    submissions = relationship("AssessmentSubmission", back_populates="assessment")

class AssessmentSubmission(Base):
    __tablename__ = "assessment_submissions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    assessment_id = Column(String, ForeignKey("assessments.id"), index=True)
    candidate_id = Column(String, nullable=False, index=True) # Eventually links to User/Candidate model
    status = Column(String, default="pending") # 'pending', 'evaluating', 'completed'
    score = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)
    code_snapshot = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    assessment = relationship("Assessment", back_populates="submissions")
