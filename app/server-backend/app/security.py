from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from .config import settings

# This tells FastAPI that the token is expected in the Authorization header
# as a "Bearer" token. It doesn't validate it, just extracts it.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    """
    A FastAPI dependency that validates the JWT and returns the user's ID.
    This function will be used to protect our endpoints.
    """
    print("here")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the JWT using the secret key from our .env file
        payload = jwt.decode(
            token, 
            settings.SUPABASE_JWT_SECRET, 
            algorithms=["HS256"],
            audience="authenticated"
        )
        print(payload)
        
        # The user's unique ID is stored in the 'sub' (subject) claim
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
        print(f"Successfully authenticated user: {user_id}")
        return user_id
        
    except jwt.PyJWTError as e:
        print(f"JWT Error: {e}")
        raise credentials_exception