from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
import google_auth_oauthlib.flow
from ..config import settings
from ..database import get_db, User
from ..security import get_current_user_id # You might need a cookie-based approach for the callback or pass state
from sqlalchemy.orm import Session

router = APIRouter(prefix="/auth", tags=["Auth"])

SCOPES = ['https://www.googleapis.com/auth/gmail.compose']

@router.get("/google/login")
def login_google():
    """Generates the Google Login URL."""
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        'client_secret.json', # You need to download this from GCP Credentials
        scopes=SCOPES
    )
    flow.redirect_uri = f"{settings.API_BASE_URL}/auth/google/callback" # Update your redirect URI in GCP to match this
    authorization_url, state = flow.authorization_url(
        access_type='offline', # CRITICAL: Gets the refresh token
        include_granted_scopes='true'
    )
    return {"url": authorization_url}

@router.get("/google/callback")
def callback_google(code: str, db: Session = Depends(get_db)):
    """Exchanges code for tokens and saves to DB."""
    # NOTE: In a real app, you need to pass the user_id via the 'state' parameter 
    # to know WHO is logging in. For simplicity here, we assume a flow.
    
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        'client_secret.json',
        scopes=SCOPES,
        state=state
    )
    flow.redirect_uri = f"{settings.API_BASE_URL}/auth/google/callback"
    flow.fetch_token(code=code)
    
    credentials = flow.credentials
    
    # Save credentials.refresh_token to the User table in Supabase
    # You need the logic here to identify the current user (e.g. via state param)
    
    return {"message": "Gmail Connected Successfully"}