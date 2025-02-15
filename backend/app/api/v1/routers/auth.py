from datetime import datetime, timedelta
from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from typing import Any, Dict

from app.core.config import settings
from app.schemas.token import Token
from app.schemas.user import User, UserCreate
from app.api.deps import mock_users, oauth2_scheme, get_current_user

router = APIRouter()

@router.post("/register", response_model=Dict[str, Any])
async def register(user_in: UserCreate = Body(...)) -> Any:
    """Register a new user."""
    if user_in.email in mock_users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    now = datetime.utcnow()
    user = User(
        id=len(mock_users) + 1,
        email=user_in.email,
        full_name=user_in.full_name,
        is_active=True,
        is_superuser=False,
        created_at=now,
        updated_at=now,
        email_verified=False,  # Start with unverified email
        last_login=None
    )
    mock_users[user_in.email] = user
    
    # Return response in the format expected by frontend
    return {
        "success": True,
        "data": {
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzM5NDA2ODAzLCJleHAiOjE3Mzk0OTMyMDN9.-64vgGGPUVfVk8TpYaZ6-DYXTnerufHj3lm09vm_kw0",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "fullName": user.full_name
            }
        }
    }

@router.post("/login", response_model=Dict[str, Any])
async def login(*, email: str = Body(...), password: str = Body(...)) -> Any:
    """Login user with email and password."""
    user = mock_users.get(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    # Return response in the format expected by frontend
    return {
        "success": True,
        "data": {
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzM5NDA2ODAzLCJleHAiOjE3Mzk0OTMyMDN9.-64vgGGPUVfVk8TpYaZ6-DYXTnerufHj3lm09vm_kw0",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "fullName": user.full_name
            }
        }
    }

@router.get("/me", response_model=Dict[str, Any])
async def get_current_user_info(current_user: User = Depends(get_current_user)) -> Any:
    """Get current user info."""
    return {
        "success": True,
        "data": {
            "user": {
                "id": str(current_user.id),
                "email": current_user.email,
                "fullName": current_user.full_name
            }
        }
    }

@router.post("/test-token", response_model=Dict[str, Any])
async def test_token(token: str = Depends(oauth2_scheme)) -> Any:
    """Test access token."""
    if not token.startswith("mock_token_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    
    email = token.replace("mock_token_", "")
    user = mock_users.get(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    
    return {
        "success": True,
        "data": {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "fullName": user.full_name
            }
        }
    }
