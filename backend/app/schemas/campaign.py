from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CampaignResponse(BaseModel):
    id: str
    job_id: str
    company_id: str
    total_uploaded: int
    target_shortlist: int
    scored_count: int
    shortlisted_count: int
    rejected_count: int
    status: str
    progress_percent: int
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
