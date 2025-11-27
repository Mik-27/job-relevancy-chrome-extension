import json
import httpx
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional
from sqlalchemy.orm import Session

from ..config import settings
from ..security import get_current_user_id
from .. import database
# Import services to handle DB, GCS, and PDF parsing
from ..services import resume_service, gcs_service, pdf_service 

router = APIRouter(prefix="/outreach", tags=["Outreach"])

@router.post("/trigger")
async def trigger_cold_outreach(
    file: Optional[UploadFile] = File(None),
    contacts_json: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db) # Need DB access
):
    """
    Accepts a file or list of contacts.
    Fetches the user's Master CV context.
    Forwards everything to n8n.
    """
    
    if not file and not contacts_json:
        raise HTTPException(status_code=400, detail="Must provide either a file or a list of contacts.")

    n8n_url = settings.N8N_WEBHOOK_TEST_URL
    
    # --- NEW: Fetch User Context (Master CV) ---
    user_context = ""
    try:
        # 1. Get profile
        user_profile = resume_service.get_user_profile_by_id(db, user_id)
        
        if user_profile and user_profile.cv_url:
            # 2. Clean the GCS path (remove domain if present)
            clean_path = user_profile.cv_url.replace(f"https://storage.googleapis.com/{settings.BUCKET_NAME}/", "")
            
            # 3. Download PDF bytes
            pdf_bytes = gcs_service.download_file_as_bytes(clean_path)
            
            # 4. Extract text
            cv_text = pdf_service.extract_text_from_pdf_bytes(pdf_bytes)
            
            if cv_text:
                user_context = cv_text
            else:
                # Fallback if PDF is empty/unreadable
                user_context = f"Name: {user_profile.first_name} {user_profile.last_name}\nLinkedIn: {user_profile.linkedin_profile}"
        
        elif user_profile:
             # Fallback if no CV uploaded
             user_context = f"Name: {user_profile.first_name} {user_profile.last_name}\nLinkedIn: {user_profile.linkedin_profile}"
             
    except Exception as e:
        print(f"Error fetching user context: {e}")
        # Don't fail the whole request, just send minimal context
        user_context = "User profile unavailable."

    # --- Prepare Payload ---
    files = {}
    data = {
        "user_id": user_id,
        "user_context": user_context # Sending the full resume text
    }

    if file:
        file_content = await file.read()
        files["data"] = (file.filename, file_content, file.content_type)

    if contacts_json:
        try:
            json.loads(contacts_json) 
            data["contacts_json"] = contacts_json # Matches your frontend key
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format in contacts list.")

    headers = {
        "X-API-KEY": settings.N8N_WEBHOOK_SECRET
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(n8n_url, data=data, files=files, headers=headers, timeout=30.0) # Increased timeout for file operations
            response.raise_for_status()
        except Exception as e:
            print(f"Failed to call n8n: {e}")
            raise HTTPException(status_code=502, detail="Failed to trigger automation workflow.")

    return {"message": "Outreach workflow started successfully"}