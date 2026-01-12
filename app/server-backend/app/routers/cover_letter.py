from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from requests import Session
from ..schemas import AnalyzeRequest, CoverLetterSchema, JobDescriptionRequest
from ..services.llm import cover_letter_service
from ..security import get_current_user_id
from .. import database
from ..services import resume_service, tailoring_service, gcs_service, pdf_service
from ..config import settings
from ..logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(
    prefix="/cover-letter",
    tags=["Cover Letter"]
)

@router.post("/generate", response_model=CoverLetterSchema)
async def generate_cover_letter_endpoint(
    request: AnalyzeRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    """
    Receives a resume and job description, calls the LLM to generate a
    cover letter, and returns the text.
    """
    if not request.resumeText or not request.jobDescriptionText:
        raise HTTPException(status_code=400, detail="Resume and Job Description cannot be empty.")
    
    user_profile = resume_service.get_user_profile_by_id(db=db, user_id=user_id)
    if not user_profile:
        raise HTTPException(status_code=404, detail="User profile not found.")
    
    # Get Personal Info Text
    pi_text = ""
    if user_profile.personal_info_url:
        clean_pi_path = user_profile.personal_info_url.replace(f"https://storage.googleapis.com/{settings.BUCKET_NAME}/", "")
        pi_bytes = gcs_service.download_file_as_bytes(clean_pi_path)
        pi_metadata = gcs_service.get_file_metadata(clean_pi_path)
        pi_text = pdf_service.extract_text_from_file_bytes(pi_bytes, pi_metadata.get("content_type", ""))

    try:
        cover_letter = await cover_letter_service.generate_cover_letter_text(
            resume=request.resumeText,
            job_description=request.jobDescriptionText,
            personal_info=pi_text
        )
        return CoverLetterSchema(cover_letter_text=cover_letter)
    except Exception as e:
        logger.error(f"Failed to generate cover letter: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate cover letter: {e}")
    
    
# --- Endpoint for compiling the final PDF ---
@router.post("/compile-pdf", response_class=FileResponse)
async def compile_cover_letter_pdf_endpoint(
    request: CoverLetterSchema, # The request body will contain the final text
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    """
    Receives final cover letter text, merges it with user profile data,
    and compiles it into a downloadable PDF.
    """
    try:
        # 1. Fetch the user's profile from the database
        user_profile = resume_service.get_user_profile_by_id(db=db, user_id=current_user_id)
        if not user_profile:
            raise HTTPException(status_code=404, detail="User profile not found.")

        # 2. Call the compiler service with the profile and the final text
        pdf_path = await tailoring_service.compile_cover_letter_to_pdf(
            user_profile=user_profile,
            cover_letter_text=request.cover_letter_text
        )
        
        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            filename='Cover_Letter.pdf'
        )
    except Exception as e:
        logger.error(f"Failed to compile Cover Letter PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to compile Cover Letter PDF: {e}")
    
    
# --- Generate from Master CV ---
@router.post("/generate-from-profile", response_model=CoverLetterSchema)
async def generate_cover_letter_from_profile(
    request: JobDescriptionRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    """
    Generates a cover letter using the user's uploaded Master CV and the provided JD.
    """
    if not request.job_description:
        raise HTTPException(status_code=400, detail="Job Description cannot be empty.")

    # Fetch User Profile & CV
    user_profile = resume_service.get_user_profile_by_id(db, user_id)
    if not user_profile or not user_profile.cv_url:
        raise HTTPException(status_code=404, detail="Master CV not found. Please upload one in your Profile.")

    try:
        # Get CV Text
        clean_cv_path = user_profile.cv_url.replace(f"https://storage.googleapis.com/{settings.BUCKET_NAME}/", "")
        cv_bytes = gcs_service.download_file_as_bytes(clean_cv_path)
        cv_metadata = gcs_service.get_file_metadata(clean_cv_path)
        cv_text = pdf_service.extract_text_from_file_bytes(cv_bytes, cv_metadata.get("content_type", ""))
        if not cv_text:
             raise HTTPException(status_code=400, detail="Could not extract text from Master CV.")

        # Get Personal Info Text
        clean_pi_path = user_profile.personal_info_url.replace(f"https://storage.googleapis.com/{settings.BUCKET_NAME}/", "")
        pi_bytes = gcs_service.download_file_as_bytes(clean_pi_path)
        pi_metadata = gcs_service.get_file_metadata(clean_pi_path)
        pi_text = pdf_service.extract_text_from_file_bytes(pi_bytes, pi_metadata.get("content_type", ""))

        # Call LLM
        cover_letter = await cover_letter_service.generate_cover_letter_text(
            resume=cv_text,
            job_description=request.job_description,
            personal_info=pi_text
        )
        
        return CoverLetterSchema(cover_letter_text=cover_letter)

    except Exception as e:
        logger.error(f"Cover Letter Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate cover letter: {e}")