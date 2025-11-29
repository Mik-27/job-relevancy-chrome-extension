from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from .. import database, schemas
from ..services.llm import autofill_service
from ..services import resume_service, gcs_service, pdf_service
from ..security import get_current_user_id
from ..config import settings

router = APIRouter(prefix="/autofill", tags=["Autofill"])

@router.post("/generate-responses", response_model=schemas.AutofillResponse)
async def generate_responses(
    request: schemas.AutofillRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    try:
        # 1. Fetch User Context (Profile + Master CV)
        # (This logic is reused from outreach.py - consider moving to a helper utility)
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
        
        return schemas.AutofillResponse(mappings=mappings)

    except Exception as e:
        print(f"Autofill Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))