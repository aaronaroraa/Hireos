from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class JobCreate(BaseModel):
    title: str
    description: str
    skills_required: Optional[List[str]] = None

class JobResponse(BaseModel):
    id: str
    company_id: str
    title: str
    description: str
    skills_required: Optional[List[str]] = None
    status: str

    class Config:
        from_attributes = True

class JDGenerateRequest(BaseModel):
    title: str
    skills: List[str]
