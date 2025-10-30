from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from typing import List

from .. import database, schemas
from ..services import gcs_service, pdf_service, resume_service

router = APIRouter(
    prefix="/resumes",
    tags=["Resumes"]
)

@router.post("/upload", status_code=201)
async def upload_resume(
    company: str = Form("General"), 
    file: UploadFile = File(...), 
    db: Session = Depends(database.get_db)
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are allowed.")

    try:
        pdf_bytes = await file.read()
        extracted_text = pdf_service.extract_text_from_pdf_bytes(pdf_bytes)

        # Create GCS Path and upload the file
        destination_path = f"public/{company}/{file.filename}"
        await file.seek(0)
        gcs_service.upload_file_to_gcs(file, destination_path)

        # Create a new resume record in the database
        resume_service.create_resume_entry(
            db=db,
            filename=file.filename,
            storage_path=destination_path,
            content=extracted_text,
            company=company
        )

        return {
            "filename": file.filename, 
            "company": company,
            "content": extracted_text, 
            "message": "Upload successful"
        }

    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred during file processing.")
    

@router.get("/", response_model=List[schemas.ResumeBase])
def list_resumes(db: Session = Depends(database.get_db)):
    """Retrieves a list of all uploaded resumes (ID and filename)."""
    return resume_service.get_all_resumes(db=db)


@router.get("/{resume_id}/content", response_model=str)
def get_resume_content(resume_id: int, db: Session = Depends(database.get_db)):
    """Retrieves the full parsed text content of a specific resume."""
    content = resume_service.get_resume_content_by_id(db=db, resume_id=resume_id)
    if content is None:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return content