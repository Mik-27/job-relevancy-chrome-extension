from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from .. import database, schemas
from ..services.llm import autofill_service, extraction_service
from ..services import resume_service, gcs_service, pdf_service
from ..security import get_current_user_id
from ..config import settings

router = APIRouter(prefix="/autofill", tags=["Autofill"])

# --- Background Logging Task ---
async def log_autofill_event(
    user_id: str,
    job_description: str,
    job_url: str,
    mappings: dict,
    db: Session
):
    """
    1. Extracts Company/Role/ID from the Job Description text.
    2. Saves the autofill event to the database.
    """
    try:
        # Reuse the extraction service we built for analysis!
        metadata = await extraction_service.extract_job_metadata(job_description, job_url)
        
        log_entry = database.AutofillHistory(
            user_id=user_id,
            job_role=metadata.get('job_role'),
            company_name=metadata.get('company_name'),
            job_external_id=metadata.get('job_id'),
            questions_answers=mappings
        )
        
        db.add(log_entry)
        db.commit()
        print(f"Logged autofill event for {user_id} @ {metadata.get('company_name')}")
        
    except Exception as e:
        print(f"Failed to log autofill event: {e}")
        

@router.post("/generate-responses", response_model=schemas.AutofillResponse)
async def generate_responses(
    request: schemas.AutofillRequest,
    background_tasks: BackgroundTasks,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    try:
        # 1. Fetch User Context (Profile + Master CV)
        user_context = ""
        user_profile = resume_service.get_user_profile_by_id(db, current_user_id)
        
        # Base info
        if user_profile:
            user_context += f"Name: {user_profile.first_name} {user_profile.last_name}\n"
            user_context += f"Email: {user_profile.email}\nPhone: {user_profile.phone_number}\n"
            user_context += f"LinkedIn: {user_profile.linkedin_profile}\nLocation: {user_profile.location}\n"
            user_context += f"Website: {user_profile.personal_website}\n"

        # CV info
        if user_profile and user_profile.cv_url:
            clean_path = user_profile.cv_url.replace(f"https://storage.googleapis.com/{settings.BUCKET_NAME}/", "")
            pdf_bytes = gcs_service.download_file_as_bytes(clean_path)
            cv_text = pdf_service.extract_text_from_pdf_bytes(pdf_bytes)
            user_context += f"\n\n--- RESUME DETAILS ---\n{cv_text}"

        # 2. Call LLM
        mappings = await autofill_service.generate_autofill_values(
            user_context=user_context,
            fields=request.fields,
            job_description=request.job_description or ""
        )
        
        clean_mappings = {k: v for k, v in mappings.items() if v is not None}
        
        # Queue Background Logging (Fire and Forget)
        if request.job_description:
            background_tasks.add_task(
                log_autofill_event, 
                current_user_id, 
                request.job_description, 
                request.job_url or "",
                clean_mappings, 
                db
            )
        
        return schemas.AutofillResponse(mappings=clean_mappings)

    except Exception as e:
        print(f"Autofill Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))