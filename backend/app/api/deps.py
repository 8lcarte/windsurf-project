from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.schemas.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

# Mock user storage (this would normally come from a database)
mock_users = {}

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[User]:
    """Get the current user from the token."""
    if not token:
        return None
        
    if not token.startswith("mock_token_"):
        return None
        
    email = token.replace("mock_token_", "")
    user = mock_users.get(email)
    if not user:
        return None
        
    return user

async def get_current_active_user(
    current_user: Optional[User] = Depends(get_current_user),
) -> User:
    """Get the current active user."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_active_superuser(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Get the current active superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user
