import hashlib
from ..logging_config import get_logger
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from ..schemas import AnalyzeRequest, ScoreResponse, SuggestionsResponse, LogAnalysisRequest
from sqlalchemy.orm import Session
from ..services.llm import analysis_service, extraction_service
from ..services import resume_service
from ..database import AnalysisLog, get_db
from ..security import get_current_user_id

logger = get_logger(__name__)

router = APIRouter(
    prefix="/analyze",
    tags=["Analysis"]
)


def generate_input_hash(resume_text: str, job_description: str) -> str:
    """Generates a SHA-256 hash with aggressive normalization."""
    
    resume_text = resume_text.strip()
    job_description = job_description.strip()
    
    def normalize(text: str) -> str:
        if not text:
            return ""
        
        # 1. Remove surrounding quotes if they got stuck (e.g. '"Hello"')
        if text.startswith('"') and text.endswith('"'):
            text = text[1:-1]
            
        # 2. Unescape literal newlines (turn \n characters into real newlines)
        text = text.replace('\\n', '\n')
        
        # 3. Standardize newlines (Windows \r\n -> Unix \n)
        text = text.replace('\r\n', '\n')
        
        # 4. Strip leading/trailing whitespace
        return text.strip()

    clean_resume = normalize(resume_text)
    clean_jd = normalize(job_description)
    
    content = f"{clean_resume}|{clean_jd}"
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


@router.post("/score", response_model=ScoreResponse)
async def get_score_endpoint(
    request: AnalyzeRequest,
    force_refresh: bool = Query(False),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    A fast endpoint that returns only the relevancy score.
    """
    logger.debug(f"Score request - resumeText length: {len(request.resumeText) if request.resumeText else 0}, jobDescriptionText length: {len(request.jobDescriptionText) if request.jobDescriptionText else 0}")
    
    if not request.resumeText or not request.jobDescriptionText:
        logger.error(f"Empty data received - resumeText: {bool(request.resumeText)}, jobDescriptionText: {bool(request.jobDescriptionText)}")
        raise HTTPException(status_code=400, detail="Resume or Job Description cannot be empty.")
    
    current_hash = generate_input_hash(request.resumeText, request.jobDescriptionText)
    
    # Check cache unless force_refresh is True
    if not force_refresh:
        cached_log = db.query(AnalysisLog).filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.input_hash == current_hash
        ).order_by(AnalysisLog.created_at.desc()).first()

        if cached_log and cached_log.relevancy_score is not None:
            logger.info("CACHE HIT: Returning score from DB.")
            return ScoreResponse(relevancyScore=cached_log.relevancy_score)
        
    logger.debug(f"Cache lookup for score with hash {current_hash}: {cached_log}")
    
    try:
        score = await analysis_service.get_relevancy_score(
            resume=request.resumeText,
            job_description=request.jobDescriptionText
        )
        logger.info(f"Score computed: {score}")
        return ScoreResponse(relevancyScore=score)
    except Exception as e:
        logger.error(f"Error in /score: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get score: {e}")


@router.post("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions_endpoint(
    request: AnalyzeRequest, 
    force_refresh: bool = Query(False), 
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    """
    A slower endpoint that returns only the detailed improvement suggestions.
    """
    logger.debug(f"Suggestions request - resumeText length: {len(request.resumeText) if request.resumeText else 0}, jobDescriptionText length: {len(request.jobDescriptionText) if request.jobDescriptionText else 0}")
    
    if not request.resumeText or not request.jobDescriptionText:
        logger.error(f"Empty data received - resumeText: {bool(request.resumeText)}, jobDescriptionText: {bool(request.jobDescriptionText)}")

        raise HTTPException(status_code=400, detail="Resume or Job Description cannot be empty.")
    
    current_hash = generate_input_hash(request.resumeText, request.jobDescriptionText)
    
    # Check cache unless force_refresh is True
    if not force_refresh:
        cached_log = db.query(AnalysisLog).filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.input_hash == current_hash
        ).order_by(AnalysisLog.created_at.desc()).first()

        if cached_log and cached_log.relevancy_score is not None:
            logger.info("CACHE HIT: Returning suggestions from DB.")
            return SuggestionsResponse(suggestions=cached_log.suggestions)
    
    logger.debug(f"Cache lookup for suggestions with hash {current_hash}: {cached_log}")

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
    
    content = resume_service.get_resume_content_by_id(db=db, resume_id=request.resume_id, user_id=user_id)
    
    input_hash = generate_input_hash(content, request.job_description)
    
    # 2. Save to DB
    try:
        log_entry = AnalysisLog(
            user_id=user_id,
            job_description=request.job_description,
            relevancy_score=request.relevancy_score,
            suggestions=[s.model_dump() for s in request.suggestions],
            job_role=metadata.get('job_role'),
            company_name=metadata.get('company_name'),
            job_external_id=metadata.get('job_id'),
            resume_source=request.resume_source,
            resume_id=request.resume_id,
            resume_snapshot=request.resume_text,
            input_hash=input_hash
        )
        db.add(log_entry)
        db.commit()
        logger.info(f"Logged analysis for user {user_id}: {metadata.get('job_role')} at {metadata.get('company_name')}")
    except Exception as e:
        logger.error(f"Failed to save analysis log: {e}")


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