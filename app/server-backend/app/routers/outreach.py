from datetime import datetime, timezone
import json
import io
import httpx
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
import pandas as pd
from typing import List, Optional, Dict, Any
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..config import settings
from ..security import get_current_user_id, validate_token_and_get_user_id
from .. import database
from ..services import resume_service, gcs_service, pdf_service
from ..database import OutreachHistory
from ..schemas import OutreachHistorySchema, PaginatedOutreachHistory

router = APIRouter(prefix="/outreach", tags=["Outreach"])

# TODO: N8N LinkedIn scraper optimizations
# TODO: N8N Generic scraper optimizations

def normalize_dataframe(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Helper to convert DataFrame to list of dicts and normalize keys.
    Expects columns: name, email, company.
    """
    # 1. Fill NaN with empty strings
    df = df.fillna("")
    
    # 2. Lowercase headers to ensure matching (Name -> name)
    df.columns = [c.lower().strip() for c in df.columns]
    
    # 3. Convert to list of dicts
    records = df.to_dict(orient='records')
    
    # 4. Validate/Filter keys
    normalized = []
    for r in records:
        # --- NEW: Extract job link (Must be INSIDE the loop) ---
        job_link = r.get('job link') or r.get('job url') or r.get('url') or r.get('link')
        
        # Only keep rows that have at least an email or name
        if r.get('name') or r.get('email'):
            normalized.append({
                "name": r.get('name', '').strip(),
                "email": r.get('email', '').strip(),
                "company": r.get('company', '').strip(),
                "job_link": str(job_link).strip() if job_link else ""
            })
            
    return normalized


async def process_outreach_background(
    user_id: str,
    file_bytes: Optional[bytes],
    file_filename: Optional[str],
    contacts_json: Optional[str],
    db: Session
):
    print(f"Background: Processing outreach for {user_id}")
    
    # 1. PARSE INPUTS
    final_contacts_list = []
    try:
        print("Background: Parsing inputs...")
        if file_bytes:
            # Determine format based on filename or try both
            if file_filename and file_filename.endswith('.csv'):
                print("Background: Detected CSV file.")
                df = pd.read_csv(io.BytesIO(file_bytes))
            else:
                print("Background: Detected Excel file.")
                df = pd.read_excel(io.BytesIO(file_bytes))
            final_contacts_list = normalize_dataframe(df)
        
        elif contacts_json:
            print("Background: Parsing JSON contacts.")
            parsed = json.loads(contacts_json)
            # Handle { "contacts": [...] } vs [...]
            final_contacts_list = parsed.get('contacts', parsed) if isinstance(parsed, dict) else parsed

    except Exception as e:
        print(f"Background Error: Parsing failed - {e}")
        return

    if not final_contacts_list:
        print("Background Error: No contacts found.")
        return

    # 2. LOG TO DATABASE & PREPARE N8N PAYLOAD
    contacts_for_n8n = []
    
    try:
        for contact in final_contacts_list:
            # Create a unique ID for this specific outreach attempt
            record_id = str(uuid.uuid4())
            
            # Log to DB
            db_record = OutreachHistory(
                id=record_id,
                user_id=user_id,
                prospect_name=contact.get('name'),
                prospect_email=contact.get('email'),
                company_name=contact.get('company'),
                job_link=contact.get('job_link'),
                status="queued"
            )
            db.add(db_record)
            
            # Add record_id to the contact object sent to n8n
            # This allows n8n to update the status of THIS specific row later
            n8n_contact = contact.copy()
            n8n_contact['record_id'] = record_id
            contacts_for_n8n.append(n8n_contact)
            
        db.commit()
    except Exception as e:
        print(f"Background Error: DB Logging failed - {e}")
        return

    # 3. FETCH USER CONTEXT (MASTER CV)
    user_context = ""
    try:
        user_profile = resume_service.get_user_profile_by_id(db, user_id)
        if user_profile and user_profile.cv_url:
            clean_path = user_profile.cv_url.replace(f"https://storage.googleapis.com/{settings.BUCKET_NAME}/", "")
            pdf_bytes = gcs_service.download_file_as_bytes(clean_path)
            cv_text = pdf_service.extract_text_from_pdf_bytes(pdf_bytes)
            user_context = cv_text if cv_text else f"Name: {user_profile.first_name} {user_profile.last_name}"
        elif user_profile:
             user_context = f"Name: {user_profile.first_name} {user_profile.last_name}"
    except Exception as e:
        print(f"Background Error: Context fetch failed - {e}")
        user_context = "User profile unavailable."

    # 4. SEND TO N8N
    n8n_url = settings.N8N_WEBHOOK_URL
    headers = {"X-API-KEY": settings.N8N_WEBHOOK_SECRET}
    
    payload = {
        "user_id": user_id,
        "user_context": user_context,
        "contacts": contacts_for_n8n
    }

    async with httpx.AsyncClient() as client:
        try:
            # We send pure JSON now, simplified!
            await client.post(n8n_url, json=payload, headers=headers, timeout=60.0)
            print("Background: Successfully sent payload to n8n.")
        except Exception as e:
            print(f"Background Error: Sending to n8n failed - {e}")


@router.post("/trigger")
async def trigger_cold_outreach(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    contacts_json: Optional[str] = Form(None),
    token: str = Form(...),
    db: Session = Depends(database.get_db) # Need DB access
):
    """
    Accepts a file or list of contacts.
    Fetches the user's Master CV context.
    Forwards everything to n8n.
    """
    
    # Validate the token to get the user_id
    user_id = validate_token_and_get_user_id(token)
    
    if not file and not contacts_json:
        raise HTTPException(status_code=400, detail="Must provide either a file or a list of contacts.")
    
    # Read file bytes immediately (UploadFile is closed after request ends)
    file_bytes = await file.read() if file else None
    file_name = file.filename if file else None

    # Offload to background task
    background_tasks.add_task(
        process_outreach_background,
        user_id,
        file_bytes,
        file_name,
        contacts_json,
        db
    )

    return {"message": "Outreach started. Emails are being drafted in the background."}

# --- UPDATED: GET Endpoint with Pagination & Search ---
@router.get("/history", response_model=PaginatedOutreachHistory)
def get_outreach_history(
    page: int = 1,
    limit: int = 15,
    search: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    """
    Fetch paginated and filtered outreach history.
    """
    # 1. Base Query
    query = db.query(OutreachHistory).filter(OutreachHistory.user_id == user_id)

    # 2. Apply Search Filter (if provided)
    if search:
        search_term = f"%{search}%"
        # Search in Prospect Name OR Company Name
        query = query.filter(
            or_(
                OutreachHistory.prospect_name.ilike(search_term),
                OutreachHistory.company_name.ilike(search_term)
            )
        )

    # 3. Get Total Count (for pagination UI)
    total_records = query.count()

    # 4. Apply Sorting and Pagination
    # Calculate offset
    offset = (page - 1) * limit
    
    records = query.order_by(OutreachHistory.created_at.desc())\
                   .offset(offset)\
                   .limit(limit)\
                   .all()

    # 5. Calculate Total Pages
    total_pages = (total_records + limit - 1) // limit

    return {
        "items": records,
        "total": total_records,
        "page": page,
        "size": limit,
        "pages": total_pages
    }


@router.patch("/{record_id}/sent", response_model=OutreachHistorySchema)
def mark_outreach_as_sent(
    record_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    """Updates status to 'sent' and records the timestamp."""
    record = db.query(OutreachHistory).filter(
        OutreachHistory.id == record_id,
        OutreachHistory.user_id == user_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    record.status = "sent"
    record.sent_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(record)
    return record