from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
import enum

from . import Base

class TransactionType(enum.Enum):
    FUNDING = "funding"
    PURCHASE = "purchase"
    REFUND = "refund"
    WITHDRAWAL = "withdrawal"

class TransactionStatus(enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    virtual_card_id = Column(Integer, ForeignKey("virtual_cards.id"))
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"))
    
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    type = Column(SQLEnum(TransactionType), nullable=False)
    status = Column(SQLEnum(TransactionStatus), nullable=False, default=TransactionStatus.PENDING)
    
    description = Column(String)
    merchant_name = Column(String)
    merchant_category = Column(String)
    merchant_id = Column(String)
    merchant_country = Column(String(2))  # ISO 3166-1 alpha-2
    
    # Transaction characteristics
    is_online = Column(Boolean, default=False)
    is_international = Column(Boolean, default=False)
    is_contactless = Column(Boolean, default=False)
    is_recurring = Column(Boolean, default=False)
    
    # Location data
    location_city = Column(String)
    location_country = Column(String(2))  # ISO 3166-1 alpha-2
    location_postal_code = Column(String)
    location_lat = Column(Numeric(9, 6))
    location_lon = Column(Numeric(9, 6))
    
    # Risk indicators
    risk_score = Column(Integer)  # 0-100
    risk_factors = Column(String)  # JSON string of risk factors
    
    # Error handling
    decline_reason = Column(String)
    error_code = Column(String)
    error_message = Column(String)
    
    provider_transaction_id = Column(String, unique=True)
    provider = Column(String, nullable=False)  # e.g., "stripe"
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)

    # Relationships
    user = relationship("User", back_populates="transactions")
    virtual_card = relationship("VirtualCard", back_populates="transactions")
    payment_method = relationship("PaymentMethod", back_populates="funding_transactions")
