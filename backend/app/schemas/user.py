from typing import Optional
from pydantic import BaseModel, EmailStr, constr
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: Optional[bool] = False  # Default to False until email verified

class UserCreate(UserBase):
    password: constr(min_length=8, max_length=100)  # Add password constraints

class UserUpdate(UserBase):
    password: Optional[constr(min_length=8, max_length=100)] = None
    current_password: Optional[str] = None  # Required when changing password

class UserInDBBase(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    email_verified: bool
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    hashed_password: str
    verification_code: Optional[str] = None
    verification_code_expires_at: Optional[datetime] = None
    password_reset_token: Optional[str] = None
    password_reset_expires_at: Optional[datetime] = None
    last_password_change: datetime
    failed_login_attempts: int
    locked_until: Optional[datetime] = None

# Email verification schemas
class EmailVerification(BaseModel):
    email: EmailStr
    verification_code: str

# Password reset schemas
class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: constr(min_length=8, max_length=100)

# Change password schema
class PasswordChange(BaseModel):
    current_password: str
    new_password: constr(min_length=8, max_length=100)

# Two-Factor Authentication schemas
class TwoFactorSetup(BaseModel):
    """Response schema for 2FA setup."""
    secret: str
    qr_code: str
    backup_codes: list[str]

class TwoFactorEnable(BaseModel):
    """Request schema for enabling 2FA."""
    token: str
    recovery_email: Optional[EmailStr] = None

class TwoFactorVerify(BaseModel):
    """Request schema for verifying 2FA token."""
    token: str

class TwoFactorDisable(BaseModel):
    """Request schema for disabling 2FA."""
    password: str
    token: str

# Social Login schemas
class SocialLogin(BaseModel):
    """Request schema for social login."""
    provider: str  # 'google' or 'github'
    code: str
    state: str

class SocialAuthUrl(BaseModel):
    """Response schema for social auth URL."""
    url: str
    state: str

class SocialUserInfo(BaseModel):
    """Response schema for social user info."""
    provider: str
    social_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
