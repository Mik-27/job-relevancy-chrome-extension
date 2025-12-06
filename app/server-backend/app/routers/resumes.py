from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from typing import List

from .. import database, schemas
from ..services import gcs_service, pdf_service, resume_service
from ..security import get_current_user_id, validate_token_and_get_user_id
from ..config import settings

router = APIRouter(
    prefix="/resumes",
    tags=["Resumes"]
)


@router.post("/upload", status_code=201)
async def upload_resume(
    token: str = Form(...),
    company: str = Form("General"),
    autoscore: bool = Form(False),
    file: UploadFile = File(...), 
    db: Session = Depends(database.get_db)
):
    
    # --- THIS IS THE KEY CHANGE ---
    # Manually call our validation function with the token from the form.
    # If it fails, it will raise an HTTPException and stop execution.
    current_user_id = validate_token_and_get_user_id(token)
    
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are allowed.")

    try:
        pdf_bytes = await file.read()
        extracted_text = pdf_service.extract_text_from_pdf_bytes(pdf_bytes)

        # Create GCS Path and upload the file
        destination_path = f"public/{current_user_id}/{company}/{file.filename}"
        await file.seek(0)
        await gcs_service.upload_file_to_gcs(file, destination_path)

        # Create a new resume record in the database
        resume_service.create_resume_entry(
            db=db,
            user_id=current_user_id,
            filename=file.filename,
            storage_path=destination_path,
            content=extracted_text,
            company=company,
            autoscore=autoscore
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
def list_resumes(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(database.get_db)):
    """Retrieves a list of all uploaded resumes with signed URLs."""
    resumes = resume_service.get_all_resumes_for_user(db=db, user_id=current_user_id)
    
    # Convert ORM objects to Pydantic models and inject Signed URLs
    results = []
    for r in resumes:
        resume_model = schemas.ResumeBase.model_validate(r)
        if r.storage_path:
            # Ensure we don't have double domains from old data
            clean_path = r.storage_path.replace(f"https://storage.googleapis.com/{settings.BUCKET_NAME}/", "")
            # Generate the secure link
            resume_model.file_url = gcs_service.generate_signed_url(clean_path)
        results.append(resume_model)
        
    return results


@router.get("/{resume_id}/content", response_model=str)
def get_resume_content(resume_id: int, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(database.get_db)):
    """Retrieves the full parsed text content of a specific resume."""
    content = resume_service.get_resume_content_by_id(db=db, resume_id=resume_id, user_id=current_user_id)
    if content is None:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return content

@router.delete("/{resume_id}", status_code=204)
def delete_resume(resume_id: int, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(database.get_db)):
    """Deletes a resume by its ID from the database and cloud storage."""
    deleted_resume = resume_service.delete_resume_by_id(db=db, resume_id=resume_id, user_id=current_user_id)
    if deleted_resume is None:
        raise HTTPException(status_code=404, detail="Resume not found.")
    
    # A 204 No Content response is standard for a successful DELETE
    return