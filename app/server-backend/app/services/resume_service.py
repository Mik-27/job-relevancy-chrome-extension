from sqlalchemy.orm import Session
from .. import database
from . import gcs_service

def get_all_resumes_for_user(db: Session, user_id: str):
    """Retrieves all resumes, returning only basic info."""
    return db.query(database.Resume)\
            .filter(database.Resume.user_id == user_id)\
            .order_by(database.Resume.created_at.desc())\
            .all()

def get_resume_content_by_id(db: Session, resume_id: int, user_id: str) -> str | None:
    """Retrieves the full text content of a single resume by its ID."""
    resume = db.query(database.Resume)\
               .filter(database.Resume.id == resume_id, database.Resume.user_id == user_id)\
               .first()
    return resume.content if resume else None

def create_resume_entry(db: Session, user_id: str, filename: str, storage_path: str, content: str, company: str) -> database.Resume:
    """Creates a new record for an uploaded resume in the database."""
    new_resume = database.Resume(
        user_id=user_id,
        filename=filename,
        storage_path=storage_path,
        content=content,
        company=company
    )
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)
    return new_resume

def delete_resume_by_id(db: Session, resume_id: int, user_id: str) -> database.Resume | None:
    """Finds a resume, deletes its file from GCS, then deletes the DB record."""
    resume_to_delete = db.query(database.Resume)\
                         .filter(database.Resume.id == resume_id, database.Resume.user_id == user_id)\
                         .first()
    
    if not resume_to_delete:
        return None # Resume not found

    # Important: Delete the file from GCS first.
    if resume_to_delete.storage_path:
        gcs_service.delete_file_from_gcs(resume_to_delete.storage_path)

    # Now, delete the record from the database.
    db.delete(resume_to_delete)
    db.commit()
    
    return resume_to_delete