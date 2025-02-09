from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ARRAY
from sqlalchemy.orm import relationship

from . import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=False)  # Changed to False by default until email is verified
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Email verification
    email_verified = Column(Boolean, default=False)
    verification_code = Column(String, nullable=True)
    verification_code_expires_at = Column(DateTime, nullable=True)
    
    # Password reset
    password_reset_token = Column(String, nullable=True)
    password_reset_expires_at = Column(DateTime, nullable=True)
    last_password_change = Column(DateTime, default=datetime.utcnow)
    
    # Security
    last_login = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    
    # Two-Factor Authentication
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String, nullable=True)
    backup_codes = Column(ARRAY(String), nullable=True)
    two_factor_recovery_email = Column(String, nullable=True)
    
    # Social Login
    social_provider = Column(String, nullable=True)  # 'google' or 'github'
    social_id = Column(String, nullable=True)
    social_picture = Column(String, nullable=True)
    social_access_token = Column(String, nullable=True)
    social_refresh_token = Column(String, nullable=True)
    social_token_expires_at = Column(DateTime, nullable=True)

    # Relationships
    virtual_cards = relationship("VirtualCard", back_populates="owner")
    payment_methods = relationship("PaymentMethod", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
