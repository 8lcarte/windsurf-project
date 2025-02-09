from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy import func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.merchant_category import MerchantCategory
from app.models.virtual_card import VirtualCard
from app.services.merchant_category_service import MerchantCategoryService

class SpendingAnalyticsService:
    @staticmethod
    def _get_date_range(
        period: str,
        end_date: Optional[datetime] = None
    ) -> Tuple[datetime, datetime]:
        """Get start and end dates for a period."""
        if end_date is None:
            end_date = datetime.now(timezone.utc)
            
        if period == "daily":
            start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "weekly":
            start_date = end_date - timedelta(days=end_date.weekday())
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "monthly":
            start_date = end_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == "yearly":
            start_date = end_date.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == "all":
            start_date = datetime.min.replace(tzinfo=timezone.utc)
        else:
            raise ValueError(f"Invalid period: {period}")
            
        return start_date, end_date

    @classmethod
    async def get_spending_summary(
        cls,
        db: AsyncSession,
        user_id: int,
        card_id: Optional[int] = None,
        period: str = "monthly",
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Get spending summary for a user or specific card."""
        start_date, end_date = cls._get_date_range(period, end_date)
        
        # Base query for completed transactions
        query = (
            select(
                func.count(Transaction.id).label("transaction_count"),
                func.sum(Transaction.amount).label("total_spend"),
                func.avg(Transaction.amount).label("average_transaction"),
                func.min(Transaction.amount).label("smallest_transaction"),
                func.max(Transaction.amount).label("largest_transaction"),
            )
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.status == TransactionStatus.COMPLETED,
                    Transaction.type == TransactionType.PURCHASE,
                    Transaction.created_at.between(start_date, end_date)
                )
            )
        )
        
        if card_id:
            query = query.where(Transaction.virtual_card_id == card_id)
            
        result = await db.execute(query)
        stats = result.mappings().first()
        
        # Get category breakdown
        category_query = (
            select(
                MerchantCategory.code,
                MerchantCategory.name,
                func.count(Transaction.id).label("transaction_count"),
                func.sum(Transaction.amount).label("total_spend"),
            )
            .join(Transaction, Transaction.merchant_category == MerchantCategory.code)
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.status == TransactionStatus.COMPLETED,
                    Transaction.type == TransactionType.PURCHASE,
                    Transaction.created_at.between(start_date, end_date)
                )
            )
            .group_by(MerchantCategory.code, MerchantCategory.name)
            .order_by(desc("total_spend"))
        )
        
        if card_id:
            category_query = category_query.where(Transaction.virtual_card_id == card_id)
            
        category_result = await db.execute(category_query)
        categories = category_result.mappings().all()
        
        # Calculate percentages for category breakdown
        total_spend = Decimal(str(stats["total_spend"] or 0))
        category_breakdown = []
        for cat in categories:
            cat_spend = Decimal(str(cat["total_spend"] or 0))
            percentage = (cat_spend / total_spend * 100) if total_spend > 0 else Decimal(0)
            category_breakdown.append({
                "category_code": cat["code"],
                "category_name": cat["name"],
                "transaction_count": cat["transaction_count"],
                "total_spend": float(cat_spend),
                "percentage": float(percentage)
            })
            
        return {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "summary": {
                "transaction_count": stats["transaction_count"] or 0,
                "total_spend": float(stats["total_spend"] or 0),
                "average_transaction": float(stats["average_transaction"] or 0),
                "smallest_transaction": float(stats["smallest_transaction"] or 0),
                "largest_transaction": float(stats["largest_transaction"] or 0)
            },
            "category_breakdown": category_breakdown
        }

    @classmethod
    async def get_spending_trends(
        cls,
        db: AsyncSession,
        user_id: int,
        card_id: Optional[int] = None,
        period: str = "monthly",
        num_periods: int = 12,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Get spending trends over time."""
        if end_date is None:
            end_date = datetime.now(timezone.utc)
            
        trends = []
        current_end = end_date
        
        for _ in range(num_periods):
            period_start, period_end = cls._get_date_range(period, current_end)
            
            # Get spending for this period
            query = (
                select(
                    func.count(Transaction.id).label("transaction_count"),
                    func.sum(Transaction.amount).label("total_spend"),
                )
                .where(
                    and_(
                        Transaction.user_id == user_id,
                        Transaction.status == TransactionStatus.COMPLETED,
                        Transaction.type == TransactionType.PURCHASE,
                        Transaction.created_at.between(period_start, period_end)
                    )
                )
            )
            
            if card_id:
                query = query.where(Transaction.virtual_card_id == card_id)
                
            result = await db.execute(query)
            stats = result.mappings().first()
            
            trends.append({
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "transaction_count": stats["transaction_count"] or 0,
                "total_spend": float(stats["total_spend"] or 0)
            })
            
            # Move to previous period
            if period == "daily":
                current_end = current_end - timedelta(days=1)
            elif period == "weekly":
                current_end = current_end - timedelta(weeks=1)
            elif period == "monthly":
                current_end = (current_end.replace(day=1) - timedelta(days=1))
            elif period == "yearly":
                current_end = current_end.replace(year=current_end.year - 1)
                
        return {
            "period": period,
            "num_periods": num_periods,
            "trends": list(reversed(trends))  # Return in chronological order
        }

    @classmethod
    async def get_merchant_insights(
        cls,
        db: AsyncSession,
        user_id: int,
        card_id: Optional[int] = None,
        period: str = "monthly",
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Get insights about merchant spending patterns."""
        start_date, end_date = cls._get_date_range(period, end_date)
        
        # Get merchant spending patterns
        query = (
            select(
                Transaction.merchant_name,
                Transaction.merchant_category,
                func.count(Transaction.id).label("transaction_count"),
                func.sum(Transaction.amount).label("total_spend"),
                func.avg(Transaction.amount).label("average_transaction"),
                func.min(Transaction.created_at).label("first_transaction"),
                func.max(Transaction.created_at).label("last_transaction"),
            )
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.status == TransactionStatus.COMPLETED,
                    Transaction.type == TransactionType.PURCHASE,
                    Transaction.created_at.between(start_date, end_date)
                )
            )
            .group_by(Transaction.merchant_name, Transaction.merchant_category)
            .order_by(desc("total_spend"))
        )
        
        if card_id:
            query = query.where(Transaction.virtual_card_id == card_id)
            
        result = await db.execute(query)
        merchants = result.mappings().all()
        
        merchant_insights = []
        for merchant in merchants:
            # Calculate frequency
            first_tx = merchant["first_transaction"]
            last_tx = merchant["last_transaction"]
            days_between = (last_tx - first_tx).days + 1
            transactions_per_day = merchant["transaction_count"] / days_between
            
            merchant_insights.append({
                "merchant_name": merchant["merchant_name"],
                "merchant_category": merchant["merchant_category"],
                "transaction_count": merchant["transaction_count"],
                "total_spend": float(merchant["total_spend"]),
                "average_transaction": float(merchant["average_transaction"]),
                "first_transaction": first_tx.isoformat(),
                "last_transaction": last_tx.isoformat(),
                "transactions_per_day": float(transactions_per_day),
                "days_since_last": (end_date - last_tx).days
            })
            
        return {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "merchant_insights": merchant_insights
        }

    @classmethod
    async def get_spending_limits_analysis(
        cls,
        db: AsyncSession,
        card_id: int,
        period: str = "monthly",
    ) -> Dict[str, Any]:
        """Analyze spending against limits."""
        card = await db.get(VirtualCard, card_id)
        if not card:
            raise ValueError("Card not found")
            
        analysis = {
            "overall_limits": {},
            "category_limits": {},
            "subcategory_limits": {}
        }
        
        # Analyze overall limits
        if period in card.spending_limits:
            limit = Decimal(str(card.spending_limits[period]))
            current = Decimal(str(card.current_spend.get(period, {}).get("amount", 0)))
            percentage = (current / limit * 100) if limit > 0 else Decimal(0)
            
            analysis["overall_limits"] = {
                "limit": float(limit),
                "current_spend": float(current),
                "remaining": float(limit - current),
                "percentage_used": float(percentage)
            }
            
        # Analyze category limits
        for category, limits in card.category_spending_limits.items():
            if period in limits:
                limit = Decimal(str(limits[period]))
                current = Decimal(str(
                    card.category_current_spend.get(category, {})
                    .get(period, {})
                    .get("amount", 0)
                ))
                percentage = (current / limit * 100) if limit > 0 else Decimal(0)
                
                analysis["category_limits"][category] = {
                    "limit": float(limit),
                    "current_spend": float(current),
                    "remaining": float(limit - current),
                    "percentage_used": float(percentage),
                    "transaction_count": card.category_transaction_counts.get(category, 0)
                }
                
        # Analyze subcategory limits
        for subcategory, limits in card.subcategory_spending_limits.items():
            if period in limits:
                limit = Decimal(str(limits[period]))
                current = Decimal(str(
                    card.subcategory_current_spend.get(subcategory, {})
                    .get(period, {})
                    .get("amount", 0)
                ))
                percentage = (current / limit * 100) if limit > 0 else Decimal(0)
                
                analysis["subcategory_limits"][subcategory] = {
                    "limit": float(limit),
                    "current_spend": float(current),
                    "remaining": float(limit - current),
                    "percentage_used": float(percentage),
                    "transaction_count": card.subcategory_transaction_counts.get(subcategory, 0)
                }
                
        return analysis
