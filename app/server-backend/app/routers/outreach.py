from datetime import datetime, timezone
import json
import io
import uuid
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
import pandas as pd
from sqlalchemy import or_
from sqlalchemy.orm import Session
from google.cloud import pubsub_v1

from ..logging_config import get_logger
from ..config import settings
from ..security import get_current_user_id, validate_token_and_get_user_id
from .. import database
from ..services import resume_service, gcs_service, pdf_service
from ..database import OutreachHistory
from ..schemas import OutreachHistorySchema, PaginatedOutreachHistory

logger = get_logger(__name__)

router = APIRouter(prefix="/outreach", tags=["Outreach"])

publisher = pubsub_v1.PublisherClient()
topic_path = f"projects/{settings.GCP_PROJECT_ID}/topics/cold-outreach-topic"

# TODO: N8N LinkedIn scraper optimizations
# TODO: N8N Generic scraper optimizations

def normalize_dataframe(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Helper to convert DataFrame to list of dicts and normalize keys.
    Expects columns: name, email, company.
    """
    df = df.fillna("")
    df.columns = [c.lower().strip() for c in df.columns]
    records = df.to_dict(orient='records')
    
    normalized = []
    for r in records:
        job_link = r.get('job link') or r.get('job url') or r.get('url') or r.get('link')
        
        name = r.get('name') or r.get('full name') or r.get('contact')
        email = r.get('email') or r.get('email address')
        if name or email:
            normalized.append({
                "name": name.strip() if name else "",
                "email": email.strip() if email else "",
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
    logger.info(f"Background: Processing outreach for {user_id}")
    
    final_contacts_list = []
    try:
        logger.info("Background: Parsing inputs...")
        if file_bytes:
            # Determine format based on filename or try both
            if file_filename and file_filename.endswith('.csv'):
                logger.info("Background: Detected CSV file.")
                df = pd.read_csv(io.BytesIO(file_bytes))
            else:
                logger.info("Background: Detected Excel file.")
                df = pd.read_excel(io.BytesIO(file_bytes))
            final_contacts_list = normalize_dataframe(df)
        
        elif contacts_json:
            logger.info("Background: Parsing JSON contacts.")
            parsed = json.loads(contacts_json)
            # Handle { "contacts": [...] } vs [...]
            final_contacts_list = parsed.get('contacts', parsed) if isinstance(parsed, dict) else parsed

    except Exception as e:
        logger.error(f"Background Error: Parsing failed - {e}")
        return

    if not final_contacts_list:
        logger.error("Background Error: No contacts found.")
        return

    # FETCH USER CONTEXT (MASTER CV)
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
        logger.error(f"Background Error: Context fetch failed - {e}")
        user_context = "User profile unavailable."


    # LOG TO DATABASE & PREPARE MESSAGE PAYLOAD
    messages_to_publish = []
    
    try:
        for contact in final_contacts_list:
            record_id = contact.get('id')
            db_record = None
            
            if record_id:
                db_record = db.query(OutreachHistory).filter(
                    OutreachHistory.id == record_id,
                    OutreachHistory.user_id == user_id
                ).first()
                
                if db_record:
                    db_record.updated_at = datetime.now(timezone.utc)
                    db_record.status = "queued"
                else:
                    # ID provided but record doesn't exist - create new with that ID
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
            else:
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
            
            message_payload = {
                "record_id": record_id,
                "user_id": user_id,
                "name": contact.get('name'),
                "email": contact.get('email'),
                "company": contact.get('company'),
                "job_link": contact.get('job_link'),
                "user_context": user_context 
            }
            messages_to_publish.append(message_payload)
            
        db.commit()
        logger.info(f"Background: Logged {len(final_contacts_list)} contacts to DB.")
        
        # Publish to Pub/Sub
        for msg in messages_to_publish:
            data_str = json.dumps(msg)
            data_bytes = data_str.encode("utf-8")
            
            # Publish returns a future, result() blocks until sent (fast)
            future = publisher.publish(topic_path, data_bytes)
            future.result() 
            
        logger.info(f"Background: Successfully published {len(messages_to_publish)} messages to Pub/Sub.")
        
    except Exception as e:
        logger.error(f"Background Error: DB Logging failed - {e}")
        return

    
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

# --- GET Endpoint with Pagination & Search ---
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
    
    query = db.query(OutreachHistory).filter(OutreachHistory.user_id == user_id)

    # Apply Search Filter (if provided)
    if search:
        search_term = f"%{search}%"
        # Search in Prospect Name OR Company Name
        query = query.filter(
            or_(
                OutreachHistory.prospect_name.ilike(search_term),
                OutreachHistory.company_name.ilike(search_term)
            )
        )

    total_records = query.count()
    offset = (page - 1) * limit
    
    records = query.order_by(OutreachHistory.created_at.desc())\
                   .offset(offset)\
                   .limit(limit)\
                   .all()

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