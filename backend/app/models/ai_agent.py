from datetime import datetime
from typing import Optional, Dict
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, Enum, ForeignKey, Numeric
from sqlalchemy.orm import relationship
import enum

from . import Base

class AgentStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class AIAgent(Base):
    __tablename__ = "ai_agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    openai_assistant_id = Column(String, unique=True)
    status = Column(Enum(AgentStatus), default=AgentStatus.ACTIVE)
    
    # Spending control configuration
    daily_spend_limit = Column(Numeric(10, 2))
    monthly_spend_limit = Column(Numeric(10, 2))
    current_daily_spend = Column(Numeric(10, 2), default=0.0)
    current_monthly_spend = Column(Numeric(10, 2), default=0.0)
    last_daily_reset = Column(DateTime)
    last_monthly_reset = Column(DateTime)
    
    # Merchant restrictions
    allowed_merchant_categories = Column(JSON, default=list)
    blocked_merchant_categories = Column(JSON, default=list)
    allowed_merchants = Column(JSON, default=list)
    blocked_merchants = Column(JSON, default=list)
    
    # Transaction limits
    max_transaction_amount = Column(Numeric(10, 2))
    require_approval_above = Column(Numeric(10, 2))
    
    # Usage tracking
    total_spend = Column(Numeric(10, 2), default=0.0)
    total_transactions = Column(Integer, default=0)
    last_transaction_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transactions = relationship("AgentTransaction", back_populates="agent")
    virtual_cards = relationship("VirtualCard", secondary="agent_virtual_cards") 