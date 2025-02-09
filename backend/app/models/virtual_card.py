from datetime import datetime, timedelta
from typing import List, Dict, Optional
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Numeric, JSON, Enum
from sqlalchemy.orm import relationship
import enum

from . import Base

class CardStatus(str, enum.Enum):
    ACTIVE = "active"
    FROZEN = "frozen"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

class SpendingLimitType(str, enum.Enum):
    OVERALL = "overall"  # Applies to all transactions
    CATEGORY = "category"  # Applies to specific merchant category
    SUBCATEGORY = "subcategory"  # Applies to specific merchant subcategory

class SpendingLimitPeriod(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    TOTAL = "total"

class VirtualCard(Base):
    __tablename__ = "virtual_cards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    card_number = Column(String, unique=True, nullable=False)
    expiry_month = Column(Integer, nullable=False)
    expiry_year = Column(Integer, nullable=False)
    cvv = Column(String, nullable=False)
    cardholder_name = Column(String, nullable=False)
    balance = Column(Numeric(10, 2), default=0.0)
    currency = Column(String(3), default="USD")
    status = Column(Enum(CardStatus), default=CardStatus.ACTIVE)
    stripe_card_id = Column(String, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Overall spending limits
    spending_limits = Column(JSON, default=dict)  # {"daily": 100.00, "monthly": 1000.00}
    current_spend = Column(JSON, default=dict)  # {"daily": {"amount": 50.00, "last_reset": "2025-02-08T00:00:00Z"}}
    last_spend_reset = Column(JSON, default=dict)  # {"daily": "2025-02-08T00:00:00Z"}
    
    # Category-specific spending limits
    category_spending_limits = Column(JSON, default=dict)  # {"food_and_drink": {"daily": 50.00, "monthly": 500.00}}
    category_current_spend = Column(JSON, default=dict)  # {"food_and_drink": {"daily": {"amount": 25.00, "last_reset": "2025-02-08T00:00:00Z"}}}
    category_last_spend_reset = Column(JSON, default=dict)  # {"food_and_drink": {"daily": "2025-02-08T00:00:00Z"}}
    
    # Subcategory-specific spending limits
    subcategory_spending_limits = Column(JSON, default=dict)  # {"food_and_drink.restaurants": {"daily": 30.00}}
    subcategory_current_spend = Column(JSON, default=dict)  # {"food_and_drink.restaurants": {"daily": {"amount": 15.00, "last_reset": "2025-02-08T00:00:00Z"}}}
    subcategory_last_spend_reset = Column(JSON, default=dict)  # {"food_and_drink.restaurants": {"daily": "2025-02-08T00:00:00Z"}}
    
    # Transaction tracking by category
    category_transaction_counts = Column(JSON, default=dict)  # {"food_and_drink": 5}
    subcategory_transaction_counts = Column(JSON, default=dict)  # {"food_and_drink.restaurants": 3}
    
    # Merchant Controls
    allowed_merchant_categories = Column(JSON, default=list)  # ["5811", "5812"]
    blocked_merchant_categories = Column(JSON, default=list)  # ["5813", "5814"]
    allowed_merchants = Column(JSON, default=list)  # ["merchant_id_1", "merchant_id_2"]
    blocked_merchants = Column(JSON, default=list)  # ["merchant_id_3", "merchant_id_4"]
    
    # Geographic Controls
    allowed_countries = Column(JSON, default=list)  # ["US", "CA"]
    blocked_countries = Column(JSON, default=list)  # ["XX", "YY"]
    
    # Transaction Controls
    allow_online_transactions = Column(Boolean, default=True)
    allow_contactless_transactions = Column(Boolean, default=True)
    allow_cash_withdrawals = Column(Boolean, default=False)
    allow_international_transactions = Column(Boolean, default=False)
    
    # Card Usage
    last_transaction_at = Column(DateTime, nullable=True)
    failed_transaction_count = Column(Integer, default=0)
    total_transaction_count = Column(Integer, default=0)
    total_spend = Column(Numeric(10, 2), default=0.0)
    
    # Template relationship
    template_id = Column(Integer, ForeignKey("card_templates.id"))
    template = relationship("CardTemplate", back_populates="cards")
    
    # Auto-expiry fields
    auto_expiry_enabled = Column(Boolean, default=False)
    auto_renewal_enabled = Column(Boolean, default=False)
    
    # Emergency controls
    last_suspicious_activity = Column(DateTime)
    freeze_reason = Column(String)
    auto_unfreeze_at = Column(DateTime)
    
    # Bulk operation fields
    batch_id = Column(String, index=True)  # For tracking bulk operations
    parent_card_id = Column(Integer, ForeignKey("virtual_cards.id"))  # For card cloning
    child_cards = relationship("VirtualCard", 
                              backref="parent_card",
                              remote_side=[id],
                              cascade="all, delete-orphan")

    # Relationships
    owner = relationship("User", back_populates="virtual_cards")
    transactions = relationship("Transaction", back_populates="virtual_card")
    
    def apply_template(self, template: "CardTemplate") -> None:
        """Apply settings from a card template."""
        self.spending_limits = template.spending_limits
        self.category_spending_limits = template.category_spending_limits
        self.subcategory_spending_limits = template.subcategory_spending_limits
        self.allowed_merchant_categories = template.allowed_merchant_categories
        self.blocked_merchant_categories = template.blocked_merchant_categories
        self.allowed_merchants = template.allowed_merchants
        self.blocked_merchants = template.blocked_merchants
        self.allowed_countries = template.allowed_countries
        self.blocked_countries = template.blocked_countries
        self.allow_online_transactions = template.allow_online_transactions
        self.allow_contactless_transactions = template.allow_contactless_transactions
        self.allow_cash_withdrawals = template.allow_cash_withdrawals
        self.allow_international_transactions = template.allow_international_transactions
        self.auto_expiry_enabled = template.auto_expiry_enabled
        self.auto_renewal_enabled = template.auto_renewal_enabled
        
        if template.auto_expiry_enabled and template.auto_expiry_days:
            new_expiry = datetime.utcnow() + timedelta(days=template.auto_expiry_days)
            self.expiry_month = new_expiry.month
            self.expiry_year = new_expiry.year
    
    def clone(self) -> "VirtualCard":
        """Create a clone of this card with the same settings."""
        clone = VirtualCard(
            user_id=self.user_id,
            card_number=None,  # Will be generated
            expiry_month=self.expiry_month,
            expiry_year=self.expiry_year,
            cvv=None,  # Will be generated
            cardholder_name=self.cardholder_name,
            currency=self.currency,
            spending_limits=self.spending_limits.copy(),
            category_spending_limits=self.category_spending_limits.copy(),
            subcategory_spending_limits=self.subcategory_spending_limits.copy(),
            allowed_merchant_categories=self.allowed_merchant_categories.copy() if self.allowed_merchant_categories else None,
            blocked_merchant_categories=self.blocked_merchant_categories.copy() if self.blocked_merchant_categories else None,
            allowed_merchants=self.allowed_merchants.copy() if self.allowed_merchants else None,
            blocked_merchants=self.blocked_merchants.copy() if self.blocked_merchants else None,
            allowed_countries=self.allowed_countries.copy() if self.allowed_countries else None,
            blocked_countries=self.blocked_countries.copy() if self.blocked_countries else None,
            allow_online_transactions=self.allow_online_transactions,
            allow_contactless_transactions=self.allow_contactless_transactions,
            allow_cash_withdrawals=self.allow_cash_withdrawals,
            allow_international_transactions=self.allow_international_transactions,
            template_id=self.template_id,
            parent_card_id=self.id,
            auto_expiry_enabled=self.auto_expiry_enabled,
            auto_renewal_enabled=self.auto_renewal_enabled
        )
        return clone
    
    def freeze(self, reason: str, duration: Optional[int] = None) -> None:
        """Freeze the card with an optional auto-unfreeze duration in hours."""
        self.status = CardStatus.FROZEN
        self.freeze_reason = reason
        if duration:
            self.auto_unfreeze_at = datetime.utcnow() + timedelta(hours=duration)
    
    def unfreeze(self) -> None:
        """Unfreeze the card."""
        self.status = CardStatus.ACTIVE
        self.freeze_reason = None
        self.auto_unfreeze_at = None
