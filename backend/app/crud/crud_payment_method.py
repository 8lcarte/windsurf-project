from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.payment_method import PaymentMethod
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate

class CRUDPaymentMethod(CRUDBase[PaymentMethod, PaymentMethodCreate, PaymentMethodUpdate]):
    async def get_by_user(
        self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[PaymentMethod]:
        """Get all payment methods for a specific user."""
        result = await db.execute(
            select(PaymentMethod)
            .filter(PaymentMethod.user_id == user_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_default(
        self, db: AsyncSession, *, user_id: int
    ) -> Optional[PaymentMethod]:
        """Get the default payment method for a user."""
        result = await db.execute(
            select(PaymentMethod)
            .filter(
                PaymentMethod.user_id == user_id,
                PaymentMethod.is_default == True,
                PaymentMethod.is_active == True
            )
        )
        return result.scalar_one_or_none()

    async def set_default(
        self, db: AsyncSession, *, user_id: int, payment_method_id: int
    ) -> Optional[PaymentMethod]:
        """Set a payment method as default and unset others."""
        # Unset all other default payment methods for the user
        await db.execute(
            update(PaymentMethod)
            .where(
                PaymentMethod.user_id == user_id,
                PaymentMethod.is_default == True
            )
            .values(is_default=False)
        )
        
        # Set the new default payment method
        result = await db.execute(
            select(PaymentMethod)
            .filter(
                PaymentMethod.id == payment_method_id,
                PaymentMethod.user_id == user_id
            )
        )
        payment_method = result.scalar_one_or_none()
        if payment_method:
            payment_method.is_default = True
            await db.commit()
            await db.refresh(payment_method)
        return payment_method

    async def get_by_provider_id(
        self, db: AsyncSession, *, provider_payment_id: str
    ) -> Optional[PaymentMethod]:
        """Get a payment method by its provider payment ID."""
        result = await db.execute(
            select(PaymentMethod)
            .filter(PaymentMethod.provider_payment_id == provider_payment_id)
        )
        return result.scalar_one_or_none()

payment_method = CRUDPaymentMethod(PaymentMethod)
