from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal

from app.crud.base import CRUDBase
from app.models.virtual_card import VirtualCard
from app.schemas.virtual_card import VirtualCardCreate, VirtualCardUpdate

class CRUDVirtualCard(CRUDBase[VirtualCard, VirtualCardCreate, VirtualCardUpdate]):
    async def get_by_user(
        self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[VirtualCard]:
        """Get all virtual cards for a specific user."""
        result = await db.execute(
            select(VirtualCard)
            .filter(VirtualCard.user_id == user_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_active_cards(
        self, db: AsyncSession, *, user_id: int
    ) -> List[VirtualCard]:
        """Get all active virtual cards for a user."""
        result = await db.execute(
            select(VirtualCard)
            .filter(VirtualCard.user_id == user_id, VirtualCard.is_active == True)
        )
        return result.scalars().all()

    async def get_by_card_number(
        self, db: AsyncSession, *, card_number: str
    ) -> Optional[VirtualCard]:
        """Get a virtual card by its card number."""
        result = await db.execute(
            select(VirtualCard).filter(VirtualCard.card_number == card_number)
        )
        return result.scalar_one_or_none()

    async def update_balance(
        self, db: AsyncSession, *, card_id: int, amount: Decimal
    ) -> Optional[VirtualCard]:
        """Update the balance of a virtual card."""
        result = await db.execute(
            select(VirtualCard).filter(VirtualCard.id == card_id)
        )
        card = result.scalar_one_or_none()
        if card:
            card.balance += amount
            await db.commit()
            await db.refresh(card)
        return card

virtual_card = CRUDVirtualCard(VirtualCard)
