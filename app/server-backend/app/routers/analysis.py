from fastapi import APIRouter, HTTPException
from app.schemas import AnalyzeRequest, AnalyzeResponse
from app.services import llm_service

router = APIRouter()

@router.post("/analyze", response_model=AnalyzeResponse, tags=["Analysis"])
async def analyze_resume_and_job(request: AnalyzeRequest):
    if not request.resumeText or not request.jobDescriptionText:
        raise HTTPException(status_code=400, detail="Resume and Job Description cannot be empty.")

    try:
        score, suggestions = await llm_service.get_llm_analysis(
            resume=request.resumeText,
            job_description=request.jobDescriptionText
        )
        return AnalyzeResponse(relevancyScore=score, suggestions=suggestions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {e}")