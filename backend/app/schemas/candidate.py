from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime

class CandidateBase(BaseModel):
    name: str = "Unknown Candidate"
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str = "Applied"
    interview_questions: Optional[List[str]] = None
    parsed_skills: Optional[List[str]] = None
    parsed_experience: Optional[Dict[str, Any]] = None
    resume_text: Optional[str] = None
    match_score: Optional[int] = None

class CandidateCreate(CandidateBase):
    job_id: str

class CandidateUpdateStatus(BaseModel):
    status: str

class CandidateResponse(CandidateBase):
    id: str
    job_id: str
    ai_score: Optional[float] = None
    ai_reasoning: Optional[str] = None
    recommendation: Optional[str] = None
    source: Optional[str] = None
    campaign_id: Optional[str] = None
    experience_years: Optional[float] = None
    education: Optional[str] = None
    current_company: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

