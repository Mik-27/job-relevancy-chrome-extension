from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from ..schemas import AnalyzeRequest, ScoreResponse, SuggestionsResponse, LogAnalysisRequest
from sqlalchemy.orm import Session
from ..services.llm import analysis_service, extraction_service
from ..database import AnalysisLog, get_db
from ..security import get_current_user_id

router = APIRouter(
    prefix="/analyze",
    tags=["Analysis"]
)

@router.post("/score", response_model=ScoreResponse)
async def get_score_endpoint(request: AnalyzeRequest, user_id: str = Depends(get_current_user_id)):
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
async def get_suggestions_endpoint(request: AnalyzeRequest, user_id: str = Depends(get_current_user_id)):
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
    
    
# --- NEW: Background Task Function ---
async def process_analysis_log(
    user_id: str,
    request: LogAnalysisRequest,
    db: Session
):
    """
    1. Extracts metadata using LLM.
    2. Saves record to DB.
    """
    # 1. Extract Metadata (This takes 1-2 seconds, which is why we do it in background)
    metadata = await extraction_service.extract_job_metadata(request.job_description, request.job_url)
    
    # 2. Save to DB
    try:
        log_entry = AnalysisLog(
            user_id=user_id,
            job_description=request.job_description,
            relevancy_score=request.relevancy_score,
            suggestions=request.suggestions,
            job_role=metadata.get('job_role'),
            company_name=metadata.get('company_name'),
            job_external_id=metadata.get('job_id'),
            resume_source=request.resume_source,
            resume_id=request.resume_id,
            resume_snapshot=request.resume_text
        )
        db.add(log_entry)
        db.commit()
        print(f"Logged analysis for user {user_id}: {metadata.get('job_role')} at {metadata.get('company_name')}")
    except Exception as e:
        print(f"Failed to save analysis log: {e}")


# --- NEW: Logging Endpoint ---
@router.post("/log", status_code=202)
async def log_analysis_event(
    request: LogAnalysisRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Receives analysis results and queues a background task to extract metadata
    and save the log. Returns immediately.
    """
    background_tasks.add_task(process_analysis_log, user_id, request, db)
    return {"status": "Logging queued"}