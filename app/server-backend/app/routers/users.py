from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from .. import database, schemas
from ..services import resume_service, gcs_service
from ..security import get_current_user_id

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=schemas.UserSchema)
def get_current_user_profile(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    user_profile = resume_service.get_user_profile_by_id(db=db, user_id=current_user_id)
    if not user_profile:
        raise HTTPException(status_code=404, detail="User profile not found.")
    return user_profile

# --- NEW: Endpoint to update text fields ---
@router.put("/me", response_model=schemas.UserSchema)
def update_user_profile(
    profile_data: schemas.UserUpdateSchema,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update fields if they are provided
    update_data = profile_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user

# --- NEW: Endpoint to upload Master CV ---
@router.post("/me/cv", response_model=schemas.UserSchema)
async def upload_user_cv(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    # Validate file type (PDF, DOC, DOCX)
    allowed_types = [
        "application/pdf", 
        "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload PDF or Word documents.")

    user = db.query(database.User).filter(database.User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        # Upload to GCS (overwrite if exists)
        destination_path = f"public/{current_user_id}/cv/master_cv"
        public_url = gcs_service.upload_file_to_gcs(file, destination_path)

        # Update DB with URL
        user.cv_url = public_url
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload CV: {e}")