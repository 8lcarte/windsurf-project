from typing import List, Optional
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.schemas.transaction import TransactionCreate, TransactionUpdate

class CRUDTransaction(CRUDBase[Transaction, TransactionCreate, TransactionUpdate]):
    async def get_by_user(
        self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Transaction]:
        """Get all transactions for a specific user."""
        result = await db.execute(
            select(Transaction)
            .filter(Transaction.user_id == user_id)
            .order_by(Transaction.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_virtual_card(
        self, db: AsyncSession, *, virtual_card_id: int, skip: int = 0, limit: int = 100
    ) -> List[Transaction]:
        """Get all transactions for a specific virtual card."""
        result = await db.execute(
            select(Transaction)
            .filter(Transaction.virtual_card_id == virtual_card_id)
            .order_by(Transaction.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_payment_method(
        self, db: AsyncSession, *, payment_method_id: int, skip: int = 0, limit: int = 100
    ) -> List[Transaction]:
        """Get all transactions for a specific payment method."""
        result = await db.execute(
            select(Transaction)
            .filter(Transaction.payment_method_id == payment_method_id)
            .order_by(Transaction.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_provider_id(
        self, db: AsyncSession, *, provider_transaction_id: str
    ) -> Optional[Transaction]:
        """Get a transaction by its provider transaction ID."""
        result = await db.execute(
            select(Transaction)
            .filter(Transaction.provider_transaction_id == provider_transaction_id)
        )
        return result.scalar_one_or_none()

    async def complete_transaction(
        self, db: AsyncSession, *, transaction_id: int, provider_transaction_id: str
    ) -> Optional[Transaction]:
        """Mark a transaction as completed."""
        result = await db.execute(
            select(Transaction).filter(Transaction.id == transaction_id)
        )
        transaction = result.scalar_one_or_none()
        if transaction:
            transaction.status = TransactionStatus.COMPLETED
            transaction.provider_transaction_id = provider_transaction_id
            transaction.completed_at = datetime.utcnow()
            await db.commit()
            await db.refresh(transaction)
        return transaction

    async def fail_transaction(
        self, db: AsyncSession, *, transaction_id: int
    ) -> Optional[Transaction]:
        """Mark a transaction as failed."""
        result = await db.execute(
            select(Transaction).filter(Transaction.id == transaction_id)
        )
        transaction = result.scalar_one_or_none()
        if transaction:
            transaction.status = TransactionStatus.FAILED
            await db.commit()
            await db.refresh(transaction)
        return transaction

transaction = CRUDTransaction(Transaction)
