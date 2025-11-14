from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
import jwt
from .config import settings
from typing import Optional

# This scheme will ONLY be used for header-based authentication.
# auto_error=False means it will return None if the header is missing, not raise an error.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# --- 1. The Core Validation Logic ---
# This is a regular function, not a dependency. It does the actual work.
def validate_token_and_get_user_id(token: Optional[str]) -> str:
    """
    Decodes and validates a JWT, returning the user ID.
    Raises HTTPException if the token is invalid, expired, or missing.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token, 
            settings.SUPABASE_JWT_SECRET, 
            algorithms=["HS256"],
            audience="authenticated"
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception

        return user_id
        
    except jwt.PyJWTError as e:
        print(f"JWT Error: {e}")
        raise credentials_exception

# --- 2. The Standard Dependency for JSON-based endpoints ---
def get_current_user_id(token: Optional[str] = Depends(oauth2_scheme)) -> str:
    """
    A dependency for endpoints that use header-based authentication.
    """
    return validate_token_and_get_user_id(token)

# --- 3. A Placeholder Dependency for Form-based endpoints ---
# This dependency does nothing on its own. It's just a placeholder.
async def get_form_data_for_auth(request: Request):
    """
    This dependency is a placeholder. It allows the endpoint to receive the
    request object, which is needed to parse the form data.
    """
    return await request.form()