from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

# Import the schema that defines the shape of our incoming request body
from ..schemas import AnalyzeRequest 

# Import the high-level service that orchestrates the tailoring process
from ..services import tailoring_service

router = APIRouter(
    prefix="/tailor",
    tags=["Tailoring"]
)

@router.post("/", response_class=FileResponse)
async def tailor_resume_and_generate_pdf(request: AnalyzeRequest):
    """
    The main production endpoint for the resume tailoring feature.
    
    Receives a user's resume text and a job description, then:
    1. Calls the LLM to get tailored, structured content.
    2. Populates a LaTeX template with this content.
    3. Compiles the template into a PDF.
    4. Returns the generated PDF for the user to download.
    """
    # Basic input validation
    if not request.resumeText or not request.jobDescriptionText:
        raise HTTPException(
            status_code=400, 
            detail="Resume text and Job Description text cannot be empty."
        )

    try:
        # Call the main service function with the data from the request.
        # This single function call kicks off the entire complex workflow.
        pdf_path = await tailoring_service.generate_tailored_resume_pdf(
            resume_text=request.resumeText,
            job_description=request.jobDescriptionText
        )
        
        # If the service succeeds, it returns the path to the final PDF.
        # FileResponse streams this file back to the user.
        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            # This is the default filename the user will see in their download prompt.
            filename='Tailored_Resume.pdf'
        )
        
    except Exception as e:
        # If anything in the service fails (LLM call, PDF compilation),
        # we catch the exception and return a server error.
        print(f"An error occurred in the tailoring endpoint: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"An internal server error occurred during PDF generation: {e}"
        )