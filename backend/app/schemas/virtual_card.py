from typing import Optional, List, Dict
from pydantic import BaseModel, condecimal, constr
from datetime import datetime
from decimal import Decimal

from app.models.virtual_card import CardStatus, SpendingLimitPeriod

class SpendingLimit(BaseModel):
    period: SpendingLimitPeriod
    amount: condecimal(max_digits=10, decimal_places=2)

class MerchantControls(BaseModel):
    allowed_categories: Optional[List[str]] = None
    blocked_categories: Optional[List[str]] = None
    allowed_merchants: Optional[List[str]] = None
    blocked_merchants: Optional[List[str]] = None

class GeographicControls(BaseModel):
    allowed_countries: Optional[List[str]] = None
    blocked_countries: Optional[List[str]] = None

class TransactionControls(BaseModel):
    allow_online: Optional[bool] = None
    allow_contactless: Optional[bool] = None
    allow_cash_withdrawals: Optional[bool] = None
    allow_international: Optional[bool] = None

class VirtualCardBase(BaseModel):
    cardholder_name: str
    currency: constr(min_length=3, max_length=3) = "USD"

class VirtualCardCreate(VirtualCardBase):
    user_id: int
    spending_limits: Optional[List[SpendingLimit]] = None
    merchant_controls: Optional[MerchantControls] = None
    geographic_controls: Optional[GeographicControls] = None
    transaction_controls: Optional[TransactionControls] = None

class VirtualCardUpdate(BaseModel):
    cardholder_name: Optional[str] = None
    status: Optional[CardStatus] = None
    spending_limits: Optional[List[SpendingLimit]] = None
    merchant_controls: Optional[MerchantControls] = None
    geographic_controls: Optional[GeographicControls] = None
    transaction_controls: Optional[TransactionControls] = None

class VirtualCardSpendingUpdate(BaseModel):
    spending_limits: List[SpendingLimit]

class VirtualCardMerchantUpdate(BaseModel):
    merchant_controls: MerchantControls

class VirtualCardGeographicUpdate(BaseModel):
    geographic_controls: GeographicControls

class VirtualCardTransactionUpdate(BaseModel):
    transaction_controls: TransactionControls

class VirtualCardFreeze(BaseModel):
    reason: Optional[str] = None

class VirtualCardInDBBase(VirtualCardBase):
    id: int
    user_id: int
    card_number: str
    expiry_month: int
    expiry_year: int
    balance: Decimal
    status: CardStatus
    stripe_card_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    # Spending Limits and Current Spend
    spending_limits: Dict[str, Decimal]
    current_spend: Dict[str, Decimal]
    last_spend_reset: Dict[str, datetime]
    
    # Controls
    allowed_merchant_categories: List[str]
    blocked_merchant_categories: List[str]
    allowed_merchants: List[str]
    blocked_merchants: List[str]
    allowed_countries: List[str]
    blocked_countries: List[str]
    
    # Transaction Controls
    allow_online_transactions: bool
    allow_contactless_transactions: bool
    allow_cash_withdrawals: bool
    allow_international_transactions: bool
    
    # Usage Statistics
    last_transaction_at: Optional[datetime]
    failed_transaction_count: int
    total_transaction_count: int
    total_spend: Decimal

    class Config:
        from_attributes = True

class VirtualCard(VirtualCardInDBBase):
    pass

class VirtualCardInDB(VirtualCardInDBBase):
    cvv: str
