from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, schemas
from ..security import get_current_user_id
from ..services.llm import report_service
from ..logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/live-interview-sessions", tags=["Live Interview","Live Interview Sessions"])

@router.get("/", response_model=List[schemas.InterviewSessionResponse])
def get_user_sessions(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    return db.query(database.InterviewSession).filter(
        database.InterviewSession.user_id == user_id
    ).order_by(database.InterviewSession.created_at.desc()).all()

@router.get("/{session_id}/messages", response_model=List[schemas.InterviewMessageBase])
def get_session_messages(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    # Verify ownership
    session = db.query(database.InterviewSession).filter(
        database.InterviewSession.id == session_id,
        database.InterviewSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return db.query(database.InterviewMessage).filter(
        database.InterviewMessage.session_id == session_id
    ).order_by(database.InterviewMessage.created_at.asc()).all()

@router.post("/", response_model=schemas.InterviewSessionResponse)
def create_session(
    data: schemas.InterviewSessionCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    try:
        title = None
        round_record = None
        if data.application_id:
            app = db.query(database.Application).filter(database.Application.id == data.application_id).first()
            if data.round_id and app:
                round_record = db.query(database.InterviewRound).filter(
                    database.InterviewRound.id == data.round_id,
                    database.InterviewRound.application_id == data.application_id
                ).first()
                if round_record:
                    title = f"Mock {round_record.interview_type.replace('_', ' ')} Interview: {app.company_name} - Round {round_record.round_number}"
            elif app:
                title = f"Mock Interview: {app.company_name}"
        else:
            title = "Mock Interview - Generic"

        new_session = database.InterviewSession(
            user_id=user_id,
            application_id=data.application_id or None,
            round_id=data.round_id or None,
            title=title,
            status="created"
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        logger.info(f"Created new interview session {new_session.id} for user {user_id}: {title}")
        
        if round_record:
            return {**new_session.__dict__, "duration_minutes": round_record.duration_minutes}
        return new_session
    
    except Exception as e:
        logger.error(f"Error creating interview session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create interview session")

# --- Get Single Session with Report ---
@router.get("/{session_id}", response_model=schemas.InterviewSessionResponse)
def get_interview_session(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    """Fetch details of a single session, including the report if completed."""
    session = db.query(database.InterviewSession).filter(
        database.InterviewSession.id == session_id,
        database.InterviewSession.user_id == user_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return session


# --- End Session & Generate Report ---
@router.post("/{session_id}/end", response_model=schemas.ShadowReportSchema)
async def end_session_and_generate_report(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    # 1. Fetch Session
    session = db.query(database.InterviewSession).filter(
        database.InterviewSession.id == session_id,
        database.InterviewSession.user_id == user_id
    ).first()
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    
    application = db.query(database.Application).filter(
        database.Application.id == session.application_id,
        database.Application.user_id == user_id
    ).first()

    # 2. Fetch Transcript
    messages = db.query(database.InterviewMessage).filter(
        database.InterviewMessage.session_id == session_id
    ).order_by(database.InterviewMessage.created_at.asc()).all()
    
    transcript_text = "\n".join([f"{msg.role.upper()}: {msg.content}" for msg in messages])

    # 3. Fetch Context (JD)
    job_context = application.job_description if application and application.job_description else "No Job Description provided."

    # 4. Generate Report
    try:
        report_data = await report_service.generate_interview_report(job_context, transcript_text)
        
        # 5. Save to DB
        session.status = "completed"
        session.report = report_data
        db.commit()
        
        return report_data
        
    except Exception as e:
        print(f"Report Generation Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")