from fastapi import APIRouter, HTTPException
from ..schemas import AnalyzeRequest, AnalyzeResponse
# NEW: Import from the segregated llm service
from ..services.llm import analysis_service

router = APIRouter()

@router.post("/analyze", response_model=AnalyzeResponse, tags=["Analysis"])
async def analyze_resume_and_job(request: AnalyzeRequest):
    if not request.resumeText or not request.jobDescriptionText:
        raise HTTPException(status_code=400, detail="Resume/JD cannot be empty.")

    try:
        # Call the specific, segregated function
        score, suggestions = await analysis_service.get_llm_analysis(
            resume=request.resumeText,
            job_description=request.jobDescriptionText
        )
        return AnalyzeResponse(relevancyScore=score, suggestions=suggestions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")