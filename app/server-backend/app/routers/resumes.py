from fastapi import APIRouter, UploadFile, File, HTTPException
from ..services import gcs_service

router = APIRouter()

@router.post("/resumes/upload", tags=["Resumes"])
async def upload_resume(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")
    
    try:
        # Define a destination path within the bucket
        destination_path = f"resumes/{file.filename}" # In a real app, use a unique ID
        file_url = await gcs_service.upload_file_to_gcs(file, destination_path)
        return {"message": "File uploaded successfully", "file_url": file_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {e}")