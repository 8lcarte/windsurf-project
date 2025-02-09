import secrets
import string
from datetime import datetime, timedelta
from typing import Tuple

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.crud.crud_user import user
from app.models.user import User

def generate_verification_code(length: int = 6) -> str:
    """Generate a random verification code."""
    return ''.join(secrets.choice(string.digits) for _ in range(length))

def generate_reset_token() -> str:
    """Generate a secure reset token."""
    return secrets.token_urlsafe(32)

async def create_verification_code(db: AsyncSession, user_obj: User) -> str:
    """Create and save a new verification code for a user."""
    code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.VERIFICATION_CODE_EXPIRE_MINUTES)
    
    # Update user with new verification code
    await user.update(
        db,
        db_obj=user_obj,
        obj_in={
            "verification_code": code,
            "verification_code_expires_at": expires_at
        }
    )
    return code

async def verify_email(db: AsyncSession, email: str, code: str) -> User:
    """Verify a user's email with the provided code."""
    user_obj = await user.get_by_email(db, email=email)
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user_obj.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    if not user_obj.verification_code or not user_obj.verification_code_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code found"
        )
    
    if user_obj.verification_code != code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    if user_obj.verification_code_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired"
        )
    
    # Mark email as verified and activate user
    await user.update(
        db,
        db_obj=user_obj,
        obj_in={
            "email_verified": True,
            "is_active": True,
            "verification_code": None,
            "verification_code_expires_at": None
        }
    )
    return user_obj

async def create_password_reset_token(db: AsyncSession, user_obj: User) -> str:
    """Create and save a password reset token for a user."""
    token = generate_reset_token()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
    
    # Update user with new reset token
    await user.update(
        db,
        db_obj=user_obj,
        obj_in={
            "password_reset_token": token,
            "password_reset_expires_at": expires_at
        }
    )
    return token

async def verify_password_reset_token(db: AsyncSession, token: str) -> User:
    """Verify a password reset token and return the user."""
    user_obj = await user.get_by_reset_token(db, token=token)
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )
    
    if user_obj.password_reset_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token expired"
        )
    
    return user_obj

async def check_user_lock_status(user_obj: User) -> None:
    """Check if a user is locked due to failed login attempts."""
    if user_obj.locked_until and user_obj.locked_until > datetime.utcnow():
        minutes_left = int((user_obj.locked_until - datetime.utcnow()).total_seconds() / 60)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account locked. Try again in {minutes_left} minutes"
        )

async def update_login_attempt(db: AsyncSession, user_obj: User, success: bool) -> None:
    """Update user's login attempt status."""
    if success:
        # Reset failed attempts on successful login
        await user.update(
            db,
            db_obj=user_obj,
            obj_in={
                "failed_login_attempts": 0,
                "locked_until": None,
                "last_login": datetime.utcnow()
            }
        )
    else:
        # Increment failed attempts and possibly lock account
        failed_attempts = user_obj.failed_login_attempts + 1
        locked_until = None
        
        if failed_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            locked_until = datetime.utcnow() + timedelta(minutes=settings.ACCOUNT_LOCKOUT_MINUTES)
        
        await user.update(
            db,
            db_obj=user_obj,
            obj_in={
                "failed_login_attempts": failed_attempts,
                "locked_until": locked_until
            }
        )
