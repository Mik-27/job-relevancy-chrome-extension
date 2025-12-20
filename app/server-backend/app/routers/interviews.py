from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import database, schemas
from ..security import get_current_user_id
from ..services import resume_service
from ..services.llm import interview_service

router = APIRouter(prefix="/interviews", tags=["Interviews"])

@router.get("/{app_id}", response_model=schemas.InterviewPrepResponse)
def get_interview_prep(
    app_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    """Check if a kit already exists."""
    prep = db.query(database.InterviewPrep).filter(
        database.InterviewPrep.application_id == app_id,
        database.InterviewPrep.user_id == user_id
    ).first()
    
    if not prep:
        raise HTTPException(status_code=404, detail="No prep kit found.")
    return prep

@router.post("/{app_id}/generate", response_model=schemas.InterviewPrepResponse)
async def generate_interview_prep(
    app_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    # 1. Get Application Data
    application = db.query(database.Application).filter(
        database.Application.id == app_id, 
        database.Application.user_id == user_id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
        
    if not application.job_description:
        raise HTTPException(status_code=400, detail="Job Description is missing. Please add it first.")

    # 2. Get User's Master Resume (or text)
    # Ideally, we grab the master CV text.
    # Reusing logic from outreach/tailor:
    user_profile = resume_service.get_user_profile_by_id(db, user_id)
    # ... (Add logic here to fetch resume text from GCS or use a fallback) ...
    # For simplicity, let's assume we have a helper 'get_master_cv_text(user_id, db)'
    # You can copy the logic from outreach.py for now
    from ..services.gcs_service import download_file_as_bytes
    from ..services.pdf_service import extract_text_from_pdf_bytes
    from ..config import settings
    
    resume_text = "User Profile Summary: " + str(user_profile.first_name) # Fallback
    if user_profile and user_profile.cv_url:
        clean_path = user_profile.cv_url.replace(f"https://storage.googleapis.com/{settings.BUCKET_NAME}/", "")
        resume_text = extract_text_from_pdf_bytes(download_file_as_bytes(clean_path))

    # 3. Generate Kit
    try:
        content = await interview_service.generate_interview_kit(resume_text, application.job_description)
        
        # 4. Save to DB (Update if exists, or Create new)
        existing = db.query(database.InterviewPrep).filter(database.InterviewPrep.application_id == app_id).first()
        if existing:
            existing.content = content
            db.commit()
            db.refresh(existing)
            return existing
        else:
            new_prep = database.InterviewPrep(application_id=app_id, user_id=user_id, content=content)
            db.add(new_prep)
            db.commit()
            db.refresh(new_prep)
            return new_prep

    except Exception as e:
        print(f"Gen Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate kit.")