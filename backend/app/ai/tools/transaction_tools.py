from typing import Dict, List, Optional
from datetime import datetime, timedelta
from langchain.tools import BaseTool
from pydantic import BaseModel

from app.api.deps import get_db
from app.models.virtual_card import VirtualCard
from app.models.transaction import Transaction
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

class GetTransactionHistoryTool(BaseTool):
    name = "get_transaction_history"
    description = """
    Retrieves the transaction history for a user.
    Input should be a JSON string containing user_id and optional parameters like start_date and end_date.
    """

    async def _arun(self, user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict]:
        async with get_db() as db:
            # Build query for virtual cards owned by the user
            query = (
                select(VirtualCard)
                .where(VirtualCard.user_id == user_id)
            )
            
            # Execute query
            result = await db.execute(query)
            cards = result.scalars().all()
            
            # Get transactions from all cards
            transactions = []
            for card in cards:
                card_transactions = await db.execute(
                    select(Transaction)
                    .where(
                        Transaction.card_id == card.id,
                        Transaction.date >= start_date if start_date else True,
                        Transaction.date <= end_date if end_date else True
                    )
                    .order_by(Transaction.date.desc())
                )
                transactions.extend(card_transactions.scalars().all())
            
            # Convert to dictionary format
            return [
                {
                    "id": str(t.id),
                    "date": t.date.isoformat(),
                    "merchant_name": t.merchant_name,
                    "amount": float(t.amount),
                    "category": t.category,
                    "status": t.status
                }
                for t in transactions
            ]

    def _run(self, user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict]:
        raise NotImplementedError("Use async version")

class AnalyzeSpendingPatternsTool(BaseTool):
    name = "analyze_spending_patterns"
    description = """
    Analyzes spending patterns from transaction history.
    Input should be a JSON string containing transaction data.
    """

    async def _arun(self, transactions: List[Dict]) -> Dict:
        # Group transactions by category
        category_totals = {}
        for transaction in transactions:
            category = transaction['category']
            amount = transaction['amount']
            if category in category_totals:
                category_totals[category] += amount
            else:
                category_totals[category] = amount

        # Calculate daily spending averages
        if transactions:
            dates = [datetime.fromisoformat(t['date']) for t in transactions]
            min_date = min(dates)
            max_date = max(dates)
            days = (max_date - min_date).days + 1
            total_spent = sum(t['amount'] for t in transactions)
            daily_average = total_spent / days
        else:
            daily_average = 0

        # Find top merchants
        merchant_totals = {}
        for transaction in transactions:
            merchant = transaction['merchant_name']
            amount = transaction['amount']
            if merchant in merchant_totals:
                merchant_totals[merchant] += amount
            else:
                merchant_totals[merchant] = amount

        top_merchants = sorted(
            [{'name': k, 'total': v} for k, v in merchant_totals.items()],
            key=lambda x: x['total'],
            reverse=True
        )[:5]

        return {
            'category_breakdown': category_totals,
            'daily_average': daily_average,
            'top_merchants': top_merchants,
            'total_transactions': len(transactions),
            'total_spent': sum(t['amount'] for t in transactions)
        }

    def _run(self, transactions: List[Dict]) -> Dict:
        raise NotImplementedError("Use async version")

class GetBudgetRecommendationsTool(BaseTool):
    name = "get_budget_recommendations"
    description = """
    Generates budget recommendations based on spending patterns.
    Input should be a JSON string containing spending analysis data.
    """

    async def _arun(self, spending_analysis: Dict) -> Dict:
        # Calculate recommended budgets based on spending patterns
        category_budgets = {}
        total_spent = spending_analysis['total_spent']
        daily_average = spending_analysis['daily_average']
        monthly_estimate = daily_average * 30

        # Calculate recommended budget for each category
        for category, amount in spending_analysis['category_breakdown'].items():
            percentage_of_total = amount / total_spent
            recommended_monthly = monthly_estimate * percentage_of_total
            
            # Add a 10% buffer for flexibility
            category_budgets[category] = {
                'current_monthly_spend': amount,
                'recommended_budget': recommended_monthly * 1.1,
                'percentage_of_total': percentage_of_total * 100
            }

        return {
            'monthly_budget_total': monthly_estimate * 1.1,  # 10% buffer
            'daily_budget': daily_average * 1.1,
            'category_budgets': category_budgets,
            'recommendations': [
                'Consider setting aside 20% of your income for savings',
                'Try to keep discretionary spending under 30% of your total budget',
                'Set up alerts when you reach 80% of your category budgets'
            ]
        }

    def _run(self, spending_analysis: Dict) -> Dict:
        raise NotImplementedError("Use async version")
