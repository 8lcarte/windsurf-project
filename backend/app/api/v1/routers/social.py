import secrets
from datetime import datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.core.config import settings
from app.core.oauth2 import GoogleOAuth2, GitHubOAuth2, get_social_account
from app.core.security import create_access_token
from app.crud.crud_user import user
from app.db.session import get_db
from app.db.redis import get_redis
from app.schemas.token import Token
from app.schemas.user import SocialLogin, SocialAuthUrl

router = APIRouter()

@router.get("/{provider}/authorize", response_model=SocialAuthUrl)
async def get_social_auth_url(
    provider: str,
    redis: Redis = Depends(get_redis),
) -> Any:
    """Get authorization URL for social login."""
    # Generate state token
    state = secrets.token_urlsafe()
    
    # Store state in Redis with expiry
    await redis.setex(
        f"oauth2_state:{state}",
        settings.OAUTH2_STATE_EXPIRE_MINUTES * 60,
        provider
    )
    
    # Get provider-specific auth URL
    if provider == "google":
        url = GoogleOAuth2.get_authorize_url(state)
    elif provider == "github":
        url = GitHubOAuth2.get_authorize_url(state)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {provider}"
        )
    
    return {"url": url, "state": state}

@router.post("/callback", response_model=Token)
async def social_login(
    *,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    login_data: SocialLogin,
) -> Any:
    """Handle social login callback."""
    # Verify state
    redis_key = f"oauth2_state:{login_data.state}"
    stored_provider = await redis.get(redis_key)
    if not stored_provider or stored_provider != login_data.provider:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid state parameter"
        )
    
    # Clean up state
    await redis.delete(redis_key)
    
    try:
        # Get user info from provider
        social_account = await get_social_account(login_data.provider, login_data.code)
        
        # Check if user exists
        db_user = await user.get_by_email(db, email=social_account.email)
        
        if db_user:
            # Update existing user's social info
            update_data = {
                "social_provider": social_account.provider,
                "social_id": social_account.account_id,
                "social_picture": social_account.picture,
                "social_access_token": social_account.access_token,
                "social_refresh_token": social_account.refresh_token,
                "social_token_expires_at": (
                    datetime.utcnow() + timedelta(seconds=social_account.expires_at)
                    if social_account.expires_at else None
                ),
            }
            db_user = await user.update(db, db_obj=db_user, obj_in=update_data)
        else:
            # Create new user
            user_in = {
                "email": social_account.email,
                "full_name": social_account.name,
                "is_active": True,  # Social login users are automatically active
                "email_verified": True,  # Email is verified by the provider
                "social_provider": social_account.provider,
                "social_id": social_account.account_id,
                "social_picture": social_account.picture,
                "social_access_token": social_account.access_token,
                "social_refresh_token": social_account.refresh_token,
                "social_token_expires_at": (
                    datetime.utcnow() + timedelta(seconds=social_account.expires_at)
                    if social_account.expires_at else None
                ),
                # Generate a random password for social users
                "password": secrets.token_urlsafe(32),
            }
            db_user = await user.create(db, obj_in=user_in)
        
        # Generate access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": db_user.email}, expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
