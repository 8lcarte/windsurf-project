from typing import Optional
from pydantic import BaseModel, condecimal
from datetime import datetime
from decimal import Decimal
from app.models.transaction import TransactionType, TransactionStatus

class Location(BaseModel):
    city: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[condecimal(max_digits=9, decimal_places=6)] = None
    longitude: Optional[condecimal(max_digits=9, decimal_places=6)] = None

class TransactionBase(BaseModel):
    amount: condecimal(max_digits=10, decimal_places=2)
    currency: str = "USD"
    type: TransactionType
    description: Optional[str] = None
    
    # Merchant information
    merchant_name: Optional[str] = None
    merchant_category: Optional[str] = None
    merchant_id: Optional[str] = None
    merchant_country: Optional[str] = None
    
    # Transaction characteristics
    is_online: bool = False
    is_international: bool = False
    is_contactless: bool = False
    is_recurring: bool = False
    
    # Location
    location: Optional[Location] = None
    
    provider: str

class TransactionCreate(TransactionBase):
    user_id: int
    virtual_card_id: Optional[int] = None
    payment_method_id: Optional[int] = None

class TransactionUpdate(BaseModel):
    status: TransactionStatus
    provider_transaction_id: Optional[str] = None
    completed_at: Optional[datetime] = None

class TransactionInDBBase(TransactionBase):
    id: int
    user_id: int
    virtual_card_id: Optional[int]
    payment_method_id: Optional[int]
    status: TransactionStatus
    provider_transaction_id: Optional[str]
    
    # Risk information
    risk_score: Optional[int] = None
    risk_factors: Optional[str] = None
    
    # Error information
    decline_reason: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    
    # Location data (flattened from Location model)
    location_city: Optional[str] = None
    location_country: Optional[str] = None
    location_postal_code: Optional[str] = None
    location_lat: Optional[Decimal] = None
    location_lon: Optional[Decimal] = None
    
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

class Transaction(TransactionInDBBase):
    pass
