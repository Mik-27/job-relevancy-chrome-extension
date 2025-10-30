from sqlalchemy.orm import Session
from .. import database, schemas

def get_all_resumes(db: Session):
    """Retrieves all resumes, returning only basic info."""
    return db.query(database.Resume).order_by(database.Resume.created_at.desc()).all()

def get_resume_content_by_id(db: Session, resume_id: int) -> str | None:
    """Retrieves the full text content of a single resume by its ID."""
    resume = db.query(database.Resume).filter(database.Resume.id == resume_id).first()
    return resume.content if resume else None

def create_resume_entry(db: Session, filename: str, storage_path: str, content: str, company: str) -> database.Resume:
    """Creates a new record for an uploaded resume in the database."""
    new_resume = database.Resume(
        filename=filename,
        storage_path=storage_path,
        content=content,
        company=company
    )
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)
    return new_resume