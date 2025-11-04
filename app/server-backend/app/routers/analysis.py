from fastapi import APIRouter, HTTPException
from ..schemas import AnalyzeRequest, ScoreResponse, SuggestionsResponse
from ..services.llm import analysis_service

router = APIRouter(
    prefix="/analyze",
    tags=["Analysis"]
)

@router.post("/score", response_model=ScoreResponse)
async def get_score_endpoint(request: AnalyzeRequest):
    """
    A fast endpoint that returns only the relevancy score.
    """
    if not request.resumeText or not request.jobDescriptionText:
        raise HTTPException(status_code=400, detail="Resume and JD cannot be empty.")

    try:
        score = await analysis_service.get_relevancy_score(
            resume=request.resumeText,
            job_description=request.jobDescriptionText
        )
        return ScoreResponse(relevancyScore=score)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get score: {e}")


@router.post("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions_endpoint(request: AnalyzeRequest):
    """
    A slower endpoint that returns only the detailed improvement suggestions.
    """
    if not request.resumeText or not request.jobDescriptionText:
        raise HTTPException(status_code=400, detail="Resume and JD cannot be empty.")

    try:
        suggestions = await analysis_service.get_suggestions(
            resume=request.resumeText,
            job_description=request.jobDescriptionText
        )
        return SuggestionsResponse(suggestions=suggestions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {e}")