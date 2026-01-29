import os
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow
from .. import database
from ..security import get_current_user_id

router = APIRouter(prefix="/auth", tags=["Auth"])

# Load config from Environment Variables
GOOGLE_OAUTH_CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
GOOGLE_OAUTH_CLIENT_SECRET = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET")

REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:3000/dashboard/profile")

SCOPES = [
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.modify'
]

def get_flow():
    """Helper to create the OAuth Flow object using env vars."""
    if not GOOGLE_OAUTH_CLIENT_ID or not GOOGLE_OAUTH_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google Client credentials not configured on server.")

    client_config = {
        "web": {
            "client_id": GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": GOOGLE_OAUTH_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    
    return Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )

@router.get("/google/url")
def get_google_auth_url(user_id: str = Depends(get_current_user_id)):
    """
    Generates the Google Login URL.
    """
    try:
        flow = get_flow()
        
        # access_type='offline' is CRITICAL to get a Refresh Token
        # include_granted_scopes='true' enables incremental auth
        # prompt='consent' forces the user to see the allow screen again (ensures we get refresh token)
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        return {"url": authorization_url}
    except Exception as e:
        print(f"Error generating auth URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/google/callback")
def save_google_token(
    payload: dict = Body(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    """
    Exchanges the auth code for tokens and saves the Refresh Token to the DB.
    """
    code = payload.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="No code provided")

    try:
        flow = get_flow()
        # Exchange code for tokens
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # We specifically need the refresh_token to work offline (in Cloud Function)
        if not credentials.refresh_token:
            # This happens if the user has already granted permission previously and we didn't force consent
            print("Warning: No refresh token returned from Google.")
            # In a real app, you might want to fail here or try to re-prompt
            # But usually prompt='consent' in the GET endpoint fixes this.

        # Save to Database
        user = db.query(database.User).filter(database.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Only update if we actually got a refresh token, or if we want to store the access token temporarily
        if credentials.refresh_token:
            user.gmail_refresh_token = credentials.refresh_token
            db.commit()
            print(f"Successfully saved Gmail refresh token for user {user_id}")
        else:
            # If we didn't get a refresh token, check if we already have one. 
            # If not, this is an error state for the background worker.
            if not user.gmail_refresh_token:
                 raise HTTPException(status_code=400, detail="Google didn't return a refresh token. Please revoke access in Google Security settings and try again.")
        
        return {"message": "Gmail connected successfully!"}

    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect Gmail.")