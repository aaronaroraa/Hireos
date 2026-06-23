from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class AssessmentBase(BaseModel):
    title: str
    type: str
    config: Optional[Dict[str, Any]] = None

class AssessmentCreate(AssessmentBase):
    job_id: str

class AssessmentResponse(AssessmentBase):
    id: str
    job_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class SubmissionBase(BaseModel):
    code_snapshot: str
    candidate_id: str

class SubmissionCreate(SubmissionBase):
    pass

class SubmissionResponse(SubmissionBase):
    id: str
    assessment_id: str
    status: str
    score: Optional[int]
    feedback: Optional[str]
    submitted_at: datetime

    class Config:
        from_attributes = True
