from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, schemas
from ..security import get_current_user_id

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
    # Optional: Fetch company name to make title better
    title = data.title
    if data.application_id:
        app = db.query(database.Application).filter(database.Application.id == data.application_id).first()
        if app:
            title = f"Mock Interview: {app.company_name}"

    new_session = database.InterviewSession(
        user_id=user_id,
        application_id=data.application_id,
        title=title
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session