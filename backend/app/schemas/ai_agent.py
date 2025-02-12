from typing import Optional, List, Dict
from pydantic import BaseModel, condecimal
from datetime import datetime
from decimal import Decimal

from app.models.ai_agent import AgentStatus

class AgentBase(BaseModel):
    name: str
    description: Optional[str] = None
    openai_assistant_id: Optional[str] = None

class AgentCreate(AgentBase):
    daily_spend_limit: Optional[condecimal(max_digits=10, decimal_places=2)] = None
    monthly_spend_limit: Optional[condecimal(max_digits=10, decimal_places=2)] = None
    allowed_merchant_categories: Optional[List[str]] = None
    blocked_merchant_categories: Optional[List[str]] = None
    allowed_merchants: Optional[List[str]] = None
    blocked_merchants: Optional[List[str]] = None
    max_transaction_amount: Optional[condecimal(max_digits=10, decimal_places=2)] = None
    require_approval_above: Optional[condecimal(max_digits=10, decimal_places=2)] = None

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    openai_assistant_id: Optional[str] = None
    status: Optional[AgentStatus] = None
    daily_spend_limit: Optional[condecimal(max_digits=10, decimal_places=2)] = None
    monthly_spend_limit: Optional[condecimal(max_digits=10, decimal_places=2)] = None
    allowed_merchant_categories: Optional[List[str]] = None
    blocked_merchant_categories: Optional[List[str]] = None
    allowed_merchants: Optional[List[str]] = None
    blocked_merchants: Optional[List[str]] = None
    max_transaction_amount: Optional[condecimal(max_digits=10, decimal_places=2)] = None
    require_approval_above: Optional[condecimal(max_digits=10, decimal_places=2)] = None

class AgentInDBBase(AgentBase):
    id: int
    status: AgentStatus
    daily_spend_limit: Optional[Decimal] = None
    monthly_spend_limit: Optional[Decimal] = None
    current_daily_spend: Decimal
    current_monthly_spend: Decimal
    last_daily_reset: Optional[datetime] = None
    last_monthly_reset: Optional[datetime] = None
    allowed_merchant_categories: List[str]
    blocked_merchant_categories: List[str]
    allowed_merchants: List[str]
    blocked_merchants: List[str]
    max_transaction_amount: Optional[Decimal] = None
    require_approval_above: Optional[Decimal] = None
    total_spend: Decimal
    total_transactions: int
    last_transaction_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Agent(AgentInDBBase):
    """Response model for AI agent"""
    pass

class AgentInDB(AgentInDBBase):
    """Internal model for AI agent"""
    pass

# Analytics schemas
class AgentSpendingPattern(BaseModel):
    daily_spending: Dict[str, Decimal]  # Date -> Amount
    monthly_spending: Dict[str, Decimal]  # Month -> Amount
    category_spending: Dict[str, Decimal]  # Category -> Amount
    merchant_spending: Dict[str, Decimal]  # Merchant -> Amount

class AgentActivityLog(BaseModel):
    timestamp: datetime
    action: str
    details: Dict[str, str]
    status: str
    transaction_id: Optional[int] = None

class AgentRiskMetrics(BaseModel):
    overall_risk_score: int  # 0-100
    risk_factors: Dict[str, int]  # Factor -> Score
    high_risk_transactions: int
    suspicious_patterns: List[str]
    monthly_risk_trend: Dict[str, int]  # Month -> Risk Score 