from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from .. import database, schemas
from ..security import get_current_user_id
from ..services.llm import interview_service
from ..services import resume_service, gcs_service, pdf_service
from ..config import settings

router = APIRouter(prefix="/interview-rounds", tags=["Interview Rounds"])

# 1. Get all rounds for an application
@router.get("/{app_id}", response_model=List[schemas.InterviewRoundResponse])
def get_rounds(
    app_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    return db.query(database.InterviewRound).filter(
        database.InterviewRound.application_id == app_id,
        database.InterviewRound.user_id == user_id
    ).order_by(database.InterviewRound.round_number).all()

# 2. Create a round
@router.post("/", response_model=schemas.InterviewRoundResponse)
def create_round(
    round_data: schemas.InterviewRoundCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    new_round = database.InterviewRound(**round_data.model_dump(), user_id=user_id)
    db.add(new_round)
    db.commit()
    db.refresh(new_round)
    return new_round

# 3. Generate Prep (The AI Action)
@router.post("/{round_id}/generate", response_model=schemas.InterviewRoundResponse)
async def generate_round_prep(
    round_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    # Fetch Round
    round_record = db.query(database.InterviewRound).filter(database.InterviewRound.id == round_id, database.InterviewRound.user_id == user_id).first()
    if not round_record: raise HTTPException(status_code=404, detail="Round not found")

    # Fetch App (for JD)
    app_record = db.query(database.Application).filter(database.Application.id == round_record.application_id).first()
    if not app_record.job_description: raise HTTPException(status_code=400, detail="Job Description missing.")

    # Fetch Resume (Master CV or Text) - Simplified for brevity (reuse your existing logic)
    user_profile = resume_service.get_user_profile_by_id(db, user_id)
    resume_text = "Profile Summary: " + user_profile.first_name # Fallback
    if user_profile and user_profile.cv_url:
         clean_path = user_profile.cv_url.replace(f"https://storage.googleapis.com/{settings.BUCKET_NAME}/", "")
         resume_text = pdf_service.extract_text_from_pdf_bytes(gcs_service.download_file_as_bytes(clean_path))

    # Generate
    prep_content = await interview_service.generate_round_prep(resume_text, app_record.job_description, round_record.interview_type)
    
    # Save
    round_record.prep_material = prep_content
    db.commit()
    db.refresh(round_record)
    return round_record

# 4. Update (Feedback/Status)
@router.patch("/{round_id}", response_model=schemas.InterviewRoundResponse)
def update_round(
    round_id: UUID,
    update_data: schemas.InterviewRoundUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    round_record = db.query(database.InterviewRound).filter(database.InterviewRound.id == round_id, database.InterviewRound.user_id == user_id).first()
    if not round_record: raise HTTPException(status_code=404, detail="Round not found")
    
    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(round_record, key, value)
    
    db.commit()
    db.refresh(round_record)
    return round_record

# 5. Delete
@router.delete("/{round_id}", status_code=204)
def delete_round(round_id: UUID, user_id: str = Depends(get_current_user_id), db: Session = Depends(database.get_db)):
    db.query(database.InterviewRound).filter(database.InterviewRound.id == round_id, database.InterviewRound.user_id == user_id).delete()
    db.commit()
    return