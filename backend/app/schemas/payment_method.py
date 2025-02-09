from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class PaymentMethodBase(BaseModel):
    type: str
    provider: str
    last_four: Optional[str] = None
    is_default: bool = False
    is_active: bool = True

class PaymentMethodCreate(PaymentMethodBase):
    user_id: int
    provider_payment_id: str

class PaymentMethodUpdate(PaymentMethodBase):
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None

class PaymentMethodInDBBase(PaymentMethodBase):
    id: int
    user_id: int
    provider_payment_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PaymentMethod(PaymentMethodInDBBase):
    pass
