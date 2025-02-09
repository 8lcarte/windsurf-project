from datetime import datetime, timedelta
from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.core.security_utils import (
    create_verification_code,
    verify_email,
    create_password_reset_token,
    verify_password_reset_token,
    check_user_lock_status,
    update_login_attempt
)
from app.core.two_factor import (
    setup_2fa,
    verify_2fa,
    verify_totp,
    verify_backup_code,
    hash_backup_codes
)
from app.core.rate_limiter import check_rate_limit
from app.crud.crud_user import user
from app.db.session import get_db
from app.db.redis import get_redis
from app.api.deps import get_current_user
from app.schemas.token import Token
from app.schemas.user import (
    User, UserCreate, PasswordReset,
    PasswordResetRequest, EmailVerification,
    PasswordChange, TwoFactorSetup, TwoFactorEnable,
    TwoFactorVerify, TwoFactorDisable
)
from app.utils.email import (
    send_verification_email,
    send_reset_password_email,
    send_password_change_notification
)

router = APIRouter()

# Two-Factor Authentication endpoints
@router.post("/2fa/setup", response_model=TwoFactorSetup)
async def setup_two_factor(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Set up 2FA for the current user."""
    if current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled"
        )
    
    secret, qr_code, backup_codes = await setup_2fa(current_user)
    
    # Store secret and hashed backup codes temporarily in Redis
    redis_key = f"2fa_setup:{current_user.id}"
    await redis.setex(
        redis_key,
        300,  # 5 minutes expiry
        json.dumps({
            "secret": secret,
            "backup_codes": backup_codes
        })
    )
    
    return {
        "secret": secret,
        "qr_code": qr_code,
        "backup_codes": backup_codes
    }

@router.post("/2fa/enable")
async def enable_two_factor(
    *,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_user),
    enable_data: TwoFactorEnable
) -> Any:
    """Enable 2FA after verifying the setup."""
    if current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled"
        )
    
    # Get setup data from Redis
    redis_key = f"2fa_setup:{current_user.id}"
    setup_data = await redis.get(redis_key)
    if not setup_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA setup expired. Please start over."
        )
    
    setup_data = json.loads(setup_data)
    secret = setup_data["secret"]
    backup_codes = setup_data["backup_codes"]
    
    # Verify the token
    if not verify_totp(secret, enable_data.token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Enable 2FA
    current_user.two_factor_enabled = True
    current_user.two_factor_secret = secret
    current_user.backup_codes = hash_backup_codes(backup_codes)
    current_user.two_factor_recovery_email = enable_data.recovery_email
    
    # Save changes
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    
    # Clean up Redis
    await redis.delete(redis_key)
    
    return {"message": "2FA enabled successfully"}

@router.post("/2fa/verify")
async def verify_two_factor(
    *,
    db: AsyncSession = Depends(get_db),
    verify_data: TwoFactorVerify,
    user_obj: User
) -> Any:
    """Verify 2FA token and complete login."""
    if not await verify_2fa(user_obj, verify_data.token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA token"
        )
    
    # Generate access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_obj.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/2fa/disable")
async def disable_two_factor(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    disable_data: TwoFactorDisable
) -> Any:
    """Disable 2FA for the current user."""
    if not current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled"
        )
    
    # Verify password
    if not verify_password(disable_data.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    # Verify 2FA token
    if not await verify_2fa(current_user, disable_data.token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA token"
        )
    
    # Disable 2FA
    current_user.two_factor_enabled = False
    current_user.two_factor_secret = None
    current_user.backup_codes = None
    current_user.two_factor_recovery_email = None
    
    # Save changes
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    
    return {"message": "2FA disabled successfully"}

@router.post("/register", response_model=User)
async def register(
    request: Request,
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate = Body(...)
) -> Any:
    """
    Register a new user.
    """
    # Check rate limit
    await check_rate_limit(
        request,
        redis,
        "register",
        settings.RATE_LIMIT_REGISTER_MAX,
        settings.RATE_LIMIT_REGISTER_WINDOW
    )
    
    # Check if user already exists
    existing_user = await user.get_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create new user
    new_user = await user.create(db, obj_in=user_in)
    
    # Generate and send verification code
    verification_code = await create_verification_code(db, new_user)
    send_verification_email(new_user.email, verification_code)
    
    return new_user

@router.post("/verify-email", response_model=User)
async def verify_email_route(
    request: Request,
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
    verification_data: EmailVerification = Body(...)
) -> Any:
    """
    Verify user's email with verification code.
    """
    # Check rate limit
    await check_rate_limit(
        request,
        redis,
        "email_verify",
        settings.RATE_LIMIT_EMAIL_VERIFY_MAX,
        settings.RATE_LIMIT_EMAIL_VERIFY_WINDOW
    )
    
    return await verify_email(db, verification_data.email, verification_data.verification_code)

@router.post("/login", response_model=Token)
async def login(
    request: Request,
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    # Check rate limit
    await check_rate_limit(
        request,
        redis,
        "login",
        settings.RATE_LIMIT_LOGIN_MAX,
        settings.RATE_LIMIT_LOGIN_WINDOW
    )
    
    # Check user exists
    user_obj = await user.get_by_email(db, email=form_data.username)
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    # Check if account is locked
    await check_user_lock_status(user_obj)
    
    # Verify password
    if not verify_password(form_data.password, user_obj.hashed_password):
        await update_login_attempt(db, user_obj, success=False)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    # Check if user is active and email is verified
    if not user_obj.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    if not user_obj.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not verified",
        )
    
    # Check if 2FA is enabled
    if user_obj.two_factor_enabled:
        # Store user info in Redis for 2FA verification
        redis_key = f"2fa_login:{user_obj.id}"
        await redis.setex(
            redis_key,
            300,  # 5 minutes expiry
            json.dumps({"user_id": user_obj.id})
        )
        
        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail="2FA verification required",
            headers={
                "WWW-Authenticate": "Bearer",
                "X-2FA-Required": "true",
                "X-2FA-Session": str(user_obj.id)
            },
        )
    
    # Update successful login
    await update_login_attempt(db, user_obj, success=True)
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user_obj.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/password-reset/request")
async def request_password_reset(
    request: Request,
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
    reset_request: PasswordResetRequest = Body(...)
) -> Any:
    """
    Request a password reset token.
    """
    # Check rate limit
    await check_rate_limit(
        request,
        redis,
        "forgot_password",
        settings.RATE_LIMIT_FORGOT_PASSWORD_MAX,
        settings.RATE_LIMIT_FORGOT_PASSWORD_WINDOW
    )
    
    user_obj = await user.get_by_email(db, email=reset_request.email)
    if user_obj:
        token = await create_password_reset_token(db, user_obj)
        send_reset_password_email(user_obj.email, token)
    
    # Always return success to prevent email enumeration
    return {"msg": "If the email exists, a password reset token has been sent"}

@router.post("/password-reset/verify")
async def reset_password(
    *,
    db: AsyncSession = Depends(get_db),
    reset_data: PasswordReset = Body(...)
) -> Any:
    """
    Reset password using reset token.
    """
    user_obj = await verify_password_reset_token(db, reset_data.token)
    
    # Update password
    await user.update(
        db,
        db_obj=user_obj,
        obj_in={
            "password": reset_data.new_password,
            "password_reset_token": None,
            "password_reset_expires_at": None,
            "last_password_change": datetime.utcnow()
        }
    )
    
    # Send notification
    send_password_change_notification(user_obj.email)
    
    return {"msg": "Password updated successfully"}

@router.post("/password-change", response_model=User)
async def change_password(
    *,
    db: AsyncSession = Depends(get_db),
    password_data: PasswordChange = Body(...),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Change current user's password.
    """
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )
    
    # Update password
    user_obj = await user.update(
        db,
        db_obj=current_user,
        obj_in={
            "password": password_data.new_password,
            "last_password_change": datetime.utcnow()
        }
    )
    
    # Send notification
    send_password_change_notification(user_obj.email)
    
    return user_obj

@router.post("/test-token", response_model=User)
async def test_token(current_user: User = Depends(get_current_user)) -> Any:
    """
    Test access token.
    """
    return current_user
