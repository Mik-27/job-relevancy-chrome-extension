from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, schemas
from ..security import get_current_user_id

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.get("/", response_model=List[schemas.ApplicationResponse])
def get_applications(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    return db.query(database.Application).filter(
        database.Application.user_id == user_id
    ).order_by(database.Application.updated_at.desc()).all()

@router.post("/", response_model=schemas.ApplicationResponse)
def create_application(
    app_data: schemas.ApplicationCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    new_app = database.Application(**app_data.model_dump(), user_id=user_id)
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    return new_app

@router.get("/{app_id}", response_model=schemas.ApplicationResponse)
def get_application(
    app_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    app_record = db.query(database.Application).filter(
        database.Application.id == app_id, 
        database.Application.user_id == user_id
    ).first()
    
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found")
    return app_record

@router.patch("/{app_id}", response_model=schemas.ApplicationResponse)
def update_application(
    app_id: str,
    app_data: schemas.ApplicationUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    app_record = db.query(database.Application).filter(
        database.Application.id == app_id, 
        database.Application.user_id == user_id
    ).first()
    
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found")

    update_data = app_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(app_record, key, value)

    db.commit()
    db.refresh(app_record)
    return app_record

@router.delete("/{app_id}", status_code=204)
def delete_application(
    app_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    app_record = db.query(database.Application).filter(
        database.Application.id == app_id, 
        database.Application.user_id == user_id
    ).first()
    
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found")
        
    db.delete(app_record)
    db.commit()
    return