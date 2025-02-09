from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy import Column, Integer, String, JSON, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class CardTemplate(Base):
    __tablename__ = "card_templates"
    __versioned__ = {}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)
    
    # Card settings
    spending_limits = Column(JSON, default=dict)  # Period-based limits
    category_spending_limits = Column(JSON, default=dict)  # Category-specific limits
    subcategory_spending_limits = Column(JSON, default=dict)  # Subcategory-specific limits
    
    # Merchant controls
    allowed_merchant_categories = Column(JSON)  # List of allowed merchant category codes
    blocked_merchant_categories = Column(JSON)  # List of blocked merchant category codes
    allowed_merchants = Column(JSON)  # List of allowed merchant IDs
    blocked_merchants = Column(JSON)  # List of blocked merchant IDs
    
    # Geographic controls
    allowed_countries = Column(JSON)  # List of allowed country codes
    blocked_countries = Column(JSON)  # List of blocked country codes
    
    # Transaction type controls
    allow_online_transactions = Column(Boolean, default=True)
    allow_contactless_transactions = Column(Boolean, default=True)
    allow_cash_withdrawals = Column(Boolean, default=False)
    allow_international_transactions = Column(Boolean, default=False)
    
    # Auto-expiry settings
    auto_expiry_enabled = Column(Boolean, default=False)
    auto_expiry_days = Column(Integer)  # Number of days until card expires
    auto_renewal_enabled = Column(Boolean, default=False)
    
    # Emergency settings
    auto_freeze_on_suspicious = Column(Boolean, default=True)
    suspicious_activity_threshold = Column(JSON)  # Thresholds for suspicious activity

    # Version tracking
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    parent_version_id = Column(Integer, ForeignKey('card_templates.id'), nullable=True)
    is_active = Column(Boolean, default=True)

    # Analytics
    usage_count = Column(Integer, default=0)
    success_rate = Column(Integer, default=100)  # Percentage of successful transactions
    avg_monthly_spend = Column(Integer, default=0)  # Average monthly spend per card
    total_cards = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="card_templates")
    cards = relationship("VirtualCard", back_populates="template")
    parent_version = relationship("CardTemplate", remote_side=[id])

    def to_dict(self) -> Dict:
        """Convert template to dictionary format."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "spending_limits": self.spending_limits,
            "category_spending_limits": self.category_spending_limits,
            "subcategory_spending_limits": self.subcategory_spending_limits,
            "allowed_merchant_categories": self.allowed_merchant_categories,
            "blocked_merchant_categories": self.blocked_merchant_categories,
            "allowed_merchants": self.allowed_merchants,
            "blocked_merchants": self.blocked_merchants,
            "allowed_countries": self.allowed_countries,
            "blocked_countries": self.blocked_countries,
            "allow_online_transactions": self.allow_online_transactions,
            "allow_contactless_transactions": self.allow_contactless_transactions,
            "allow_cash_withdrawals": self.allow_cash_withdrawals,
            "allow_international_transactions": self.allow_international_transactions,
            "auto_expiry_enabled": self.auto_expiry_enabled,
            "auto_expiry_days": self.auto_expiry_days,
            "auto_renewal_enabled": self.auto_renewal_enabled,
            "auto_freeze_on_suspicious": self.auto_freeze_on_suspicious,
            "suspicious_activity_threshold": self.suspicious_activity_threshold
        }
