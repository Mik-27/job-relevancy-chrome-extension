from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from requests import Session
from ..schemas import AnalyzeRequest, CoverLetterSchema
from ..services.llm import cover_letter_service
from ..security import get_current_user_id
from .. import database
from ..services import resume_service, tailoring_service

router = APIRouter(
    prefix="/cover-letter",
    tags=["Cover Letter"]
)

@router.post("/generate", response_model=CoverLetterSchema)
async def generate_cover_letter_endpoint(
    request: AnalyzeRequest,
    user_id: str = Depends(get_current_user_id) # Protect the endpoint
):
    """
    Receives a resume and job description, calls the LLM to generate a
    cover letter, and returns the text.
    """
    if not request.resumeText or not request.jobDescriptionText:
        raise HTTPException(status_code=400, detail="Resume and Job Description cannot be empty.")

    try:
        cover_letter = await cover_letter_service.generate_cover_letter_text(
            resume=request.resumeText,
            job_description=request.jobDescriptionText
        )
        return CoverLetterSchema(cover_letter_text=cover_letter)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate cover letter: {e}")
    
    
# --- NEW: Endpoint for compiling the final PDF ---
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
        raise HTTPException(status_code=500, detail=f"Failed to compile Cover Letter PDF: {e}")