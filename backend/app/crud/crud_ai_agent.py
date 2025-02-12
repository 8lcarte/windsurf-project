from typing import Any, Dict, List, Optional, Union
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.crud.base import CRUDBase
from app.models.ai_agent import AIAgent
from app.models.agent_transaction import AgentTransaction
from app.schemas.ai_agent import AgentCreate, AgentUpdate, AgentSpendingPattern, AgentActivityLog, AgentRiskMetrics
from datetime import datetime, timezone

class CRUDAgent(CRUDBase[AIAgent, AgentCreate, AgentUpdate]):
    async def create(
        self, db: AsyncSession, *, obj_in: AgentCreate
    ) -> AIAgent:
        db_obj = AIAgent(
            name=obj_in.name,
            description=obj_in.description,
            status=obj_in.status,
            daily_spend_limit=obj_in.daily_spend_limit,
            monthly_spend_limit=obj_in.monthly_spend_limit,
            allowed_merchant_categories=obj_in.allowed_merchant_categories,
            allowed_merchants=obj_in.allowed_merchants,
            allowed_transaction_types=obj_in.allowed_transaction_types,
            risk_level=obj_in.risk_level,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: AIAgent,
        obj_in: Union[AgentUpdate, Dict[str, Any]]
    ) -> AIAgent:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        
        update_data["updated_at"] = datetime.now(timezone.utc)
        return await super().update(db, db_obj=db_obj, obj_in=update_data)

    async def get_spending_patterns(
        self, db: AsyncSession, *, agent_id: int
    ) -> AgentSpendingPattern:
        # Get total spend
        total_spend_query = select(func.sum(AgentTransaction.amount))\
            .where(AgentTransaction.agent_id == agent_id)
        total_spend = await db.execute(total_spend_query)
        total_spend = total_spend.scalar() or 0

        # Get spend by category
        category_spend_query = select(
            AgentTransaction.merchant_category,
            func.sum(AgentTransaction.amount)
        ).where(
            AgentTransaction.agent_id == agent_id
        ).group_by(
            AgentTransaction.merchant_category
        )
        category_spend = await db.execute(category_spend_query)
        category_spend = dict(category_spend.fetchall())

        # Get spend by merchant
        merchant_spend_query = select(
            AgentTransaction.merchant_name,
            func.sum(AgentTransaction.amount)
        ).where(
            AgentTransaction.agent_id == agent_id
        ).group_by(
            AgentTransaction.merchant_name
        )
        merchant_spend = await db.execute(merchant_spend_query)
        merchant_spend = dict(merchant_spend.fetchall())

        return AgentSpendingPattern(
            total_spend=total_spend,
            spend_by_category=category_spend,
            spend_by_merchant=merchant_spend
        )

    async def get_activity_log(
        self,
        db: AsyncSession,
        *,
        agent_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[AgentActivityLog]:
        query = select(AgentTransaction)\
            .where(AgentTransaction.agent_id == agent_id)\
            .order_by(AgentTransaction.created_at.desc())\
            .offset(skip)\
            .limit(limit)
        
        result = await db.execute(query)
        transactions = result.scalars().all()

        activity_logs = []
        for transaction in transactions:
            activity_logs.append(
                AgentActivityLog(
                    timestamp=transaction.created_at,
                    action_type="transaction",
                    details={
                        "transaction_id": transaction.id,
                        "amount": transaction.amount,
                        "merchant": transaction.merchant_name,
                        "category": transaction.merchant_category,
                        "status": transaction.status
                    }
                )
            )
        return activity_logs

    async def get_risk_metrics(
        self,
        db: AsyncSession,
        *,
        agent_id: int
    ) -> AgentRiskMetrics:
        # Get total transaction count
        total_tx_query = select(func.count(AgentTransaction.id))\
            .where(AgentTransaction.agent_id == agent_id)
        total_tx = await db.execute(total_tx_query)
        total_tx = total_tx.scalar() or 0

        # Get failed transaction count
        failed_tx_query = select(func.count(AgentTransaction.id))\
            .where(
                AgentTransaction.agent_id == agent_id,
                AgentTransaction.status == "failed"
            )
        failed_tx = await db.execute(failed_tx_query)
        failed_tx = failed_tx.scalar() or 0

        # Get high-risk transaction count
        high_risk_tx_query = select(func.count(AgentTransaction.id))\
            .where(
                AgentTransaction.agent_id == agent_id,
                AgentTransaction.risk_level == "high"
            )
        high_risk_tx = await db.execute(high_risk_tx_query)
        high_risk_tx = high_risk_tx.scalar() or 0

        # Calculate risk score (example implementation)
        risk_score = 0
        if total_tx > 0:
            risk_score = (failed_tx + high_risk_tx * 2) / total_tx * 100

        return AgentRiskMetrics(
            total_transactions=total_tx,
            failed_transactions=failed_tx,
            high_risk_transactions=high_risk_tx,
            risk_score=risk_score,
            risk_factors=[
                "high_failure_rate" if failed_tx/total_tx > 0.1 else None,
                "high_risk_tx_volume" if high_risk_tx/total_tx > 0.2 else None
            ] if total_tx > 0 else []
        )

agent = CRUDAgent(AIAgent) 