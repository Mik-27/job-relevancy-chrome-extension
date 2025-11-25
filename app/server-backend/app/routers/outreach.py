import httpx
from fastapi import APIRouter, HTTPException, Depends
from ..schemas import OutreachRequestSchema
from ..config import settings
from ..security import get_current_user_id

router = APIRouter(prefix="/outreach", tags=["Outreach"])

@router.post("/trigger")
async def trigger_cold_outreach(
    request: OutreachRequestSchema,
    user_id: str = Depends(get_current_user_id)
):
    """
    Receives a list of contacts and forwards them to n8n for processing.
    """
    if not request.contacts:
        raise HTTPException(status_code=400, detail="No contacts provided.")

    n8n_url = settings.N8N_WEBHOOK_URL
    if not n8n_url:
        raise HTTPException(status_code=500, detail="N8N Webhook URL not configured.")

    # Prepare payload for n8n. 
    # We include user_id so n8n knows who triggered it (useful for logging).
    payload = {
        "user_id": user_id,
        "contacts": [contact.model_dump() for contact in request.contacts]
    }

    async with httpx.AsyncClient() as client:
        try:
            # Fire and forget (mostly) - we just wait for n8n to accept the payload
            response = await client.post(n8n_url, json=payload)
            response.raise_for_status()
        except Exception as e:
            print(f"Failed to call n8n: {e}")
            raise HTTPException(status_code=502, detail="Failed to trigger automation workflow.")

    return {"message": "Outreach workflow started successfully", "count": len(request.contacts)}