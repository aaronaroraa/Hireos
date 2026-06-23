import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base


class HiringCampaign(Base):
    __tablename__ = "hiring_campaigns"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)

    total_uploaded = Column(Integer, default=0)
    target_shortlist = Column(Integer, default=10)
    scored_count = Column(Integer, default=0)
    shortlisted_count = Column(Integer, default=0)
    rejected_count = Column(Integer, default=0)

    # 'uploading', 'parsing', 'scoring', 'shortlisting', 'completed', 'failed'
    status = Column(String, default="uploading")
    progress_percent = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    job = relationship("Job")
