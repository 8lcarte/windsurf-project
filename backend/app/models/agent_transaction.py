from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, Enum, ForeignKey, Numeric
from sqlalchemy.orm import relationship
import enum

from . import Base

class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FAILED = "failed"
    COMPLETED = "completed"

class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AgentTransaction(Base):
    __tablename__ = "agent_transactions"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("ai_agents.id"), nullable=False)
    virtual_card_id = Column(Integer, ForeignKey("virtual_cards.id"), nullable=False)
    
    # Transaction details
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    merchant_name = Column(String)
    merchant_category = Column(String)
    merchant_id = Column(String)
    
    # Status and tracking
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    external_transaction_id = Column(String)  # Reference to payment processor transaction
    
    # AI Context and Reasoning
    conversation_context = Column(JSON)  # Stores the conversation leading to this transaction
    decision_reasoning = Column(JSON)  # Stores the AI's reasoning for the transaction
    user_intent = Column(String)  # Captured user intent for the transaction
    
    # Risk Assessment
    risk_score = Column(Integer)  # 0-100 risk score
    risk_level = Column(Enum(RiskLevel))
    risk_factors = Column(JSON)  # List of identified risk factors
    
    # Validation
    validation_results = Column(JSON)  # Results of various validation checks
    validation_errors = Column(JSON)  # Any validation errors encountered
    requires_manual_review = Column(Boolean, default=False)
    manual_review_reason = Column(String)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    agent = relationship("AIAgent", back_populates="transactions")
    virtual_card = relationship("VirtualCard", back_populates="agent_transactions") 