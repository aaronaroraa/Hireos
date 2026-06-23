"""
Resume upload API — parse PDF resumes and create candidates.
Requires authentication. Tenant-isolated via JWT.
"""
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import shutil

from app.api.deps import get_db, get_current_user, AuthenticatedUser
from app.services.resume_parser import parse_resume
from app.models.candidate import Candidate
from app.models.core import Job

router = APIRouter()

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE_MB = 10


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    job_id: str = Form(...),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Upload a PDF resume → parse → create Candidate.
    Requires auth. Job must belong to the user's company.
    """
    # File type validation (magic bytes + content type)
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Tenant isolation — verify job belongs to this company
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_user.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or access denied.")

    file_location = os.path.join(UPLOAD_DIR, file.filename)
    try:
        # Read and validate file size
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_FILE_SIZE_MB}MB.")

        # Validate PDF magic bytes
        if not contents[:5] == b"%PDF-":
            raise HTTPException(status_code=400, detail="Invalid PDF file.")

        # Parse
        parsed_data = parse_resume(contents)

        # Derive name from filename as fallback
        derived_name = file.filename.replace(".pdf", "").replace("_", " ").title()

        db_candidate = Candidate(
            job_id=job_id,
            name=derived_name,
            status="Applied",
            parsed_skills=parsed_data.get("extracted_skills", []),
            experience_years=parsed_data.get("experience_years", 0),
            education=parsed_data.get("education", ""),
            resume_text=parsed_data.get("raw_text", ""),
        )
        db.add(db_candidate)
        db.commit()
        db.refresh(db_candidate)

        return {
            "message": "Resume uploaded and candidate created",
            "candidate_id": db_candidate.id,
            "parsed_data": parsed_data,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
    finally:
        if os.path.exists(file_location):
            os.remove(file_location)
