from sqlalchemy.orm import Session
from .. import database
from . import gcs_service

def get_user_profile_by_id(db: Session, user_id: str):
    """Retrieves a user's profile from the public.users table."""
    # Note: We are querying the 'users' table here, not the 'resumes' table.
    # You will need to create a 'User' model in database.py
    return db.query(database.User).filter(database.User.id == user_id).first()

def get_all_resumes_for_user(db: Session, user_id: str):
    """Retrieves all resumes, returning only basic info."""
    return db.query(database.Resume)\
            .filter(database.Resume.user_id == user_id)\
            .order_by(
                database.Resume.autoscore.desc(),
                database.Resume.created_at.desc()
            )\
            .all()

def get_resume_content_by_id(db: Session, resume_id: int, user_id: str) -> str | None:
    """Retrieves the full text content of a single resume by its ID."""
    resume = db.query(database.Resume)\
               .filter(database.Resume.id == resume_id, database.Resume.user_id == user_id)\
               .first()
    return resume.content if resume else None

def create_resume_entry(db: Session, user_id: str, filename: str, storage_path: str, content: str, company: str, autoscore: bool) -> database.Resume:
    """Creates a new record for an uploaded resume in the database."""
    new_resume = database.Resume(
        user_id=user_id,
        filename=filename,
        storage_path=storage_path,
        content=content,
        company=company,
        autoscore=autoscore
    )
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)
    return new_resume

# ... existing imports

def get_autoscore_count(db: Session, user_id: str) -> int:
    """Returns the number of resumes with autoscore enabled for a user."""
    return db.query(database.Resume).filter(
        database.Resume.user_id == user_id, 
        database.Resume.autoscore == True
    ).count()

def update_resume_autoscore(db: Session, user_id: str, resume_id: int, autoscore: bool) -> database.Resume | None:
    """Updates the autoscore status of a resume."""
    resume = db.query(database.Resume).filter(
        database.Resume.id == resume_id, 
        database.Resume.user_id == user_id
    ).first()
    
    if not resume:
        return None
        
    resume.autoscore = autoscore
    db.commit()
    db.refresh(resume)
    return resume


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