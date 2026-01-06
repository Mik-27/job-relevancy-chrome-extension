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
    
    # --- NEW: Logic to Sign the URL ---
    # Convert the ORM object to a Pydantic model so we can modify the cv_url
    response = schemas.UserSchema.model_validate(user_profile)
    
    # If a CV path exists in the DB, generate a temporary signed URL for it
    if response.cv_url:
        signed_url = gcs_service.generate_signed_url(response.cv_url)
        if signed_url:
            response.cv_url = signed_url
    
    return response

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


# --- Endpoint to upload Master CV ---
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
        public_url = await gcs_service.upload_file_to_gcs(file, destination_path)

        # Update DB with URL
        user.cv_url = destination_path
        db.commit()
        db.refresh(user)
        
        # When returning the user immediately, we also need to sign the URL
        # so the frontend can display it right away
        response = schemas.UserSchema.model_validate(user)
        response.cv_url = gcs_service.generate_signed_url(destination_path)
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload CV: {e}")


# --- Endpoint to upload Personal Info ---
@router.post("/me/personal-info", response_model=schemas.UserSchema)
async def upload_user_personal_info(
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
        destination_path = f"public/{current_user_id}/Personal_Info/personal_info"
        public_url = await gcs_service.upload_file_to_gcs(file, destination_path)

        # Update DB with URL
        user.personal_info_url = destination_path
        db.commit()
        db.refresh(user)
        
        # When returning the user immediately, we also need to sign the URL
        # so the frontend can display it right away
        response = schemas.UserSchema.model_validate(user)
        response.personal_info_url = gcs_service.generate_signed_url(destination_path)
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload Personal Info: {e}")
    

# --- Endpoint to get user status ---
@router.get("/status", response_model=schemas.UserStatusSchema)
def get_user_status(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    """
    Returns minimal info: Name, Email, and whether a Master CV is uploaded.
    Used by the extension to check readiness without fetching full profile data.
    """
    user = db.query(database.User).filter(database.User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "first_name": user.first_name or "User",
        "email": user.email,
        "has_master_cv": bool(user.cv_url) # Check if URL exists
    }