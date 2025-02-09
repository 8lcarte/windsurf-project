from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.spending_analytics_service import SpendingAnalyticsService

router = APIRouter()

@router.get("/summary")
async def get_spending_summary(
    period: str = Query("monthly", regex="^(daily|weekly|monthly|yearly|all)$"),
    card_id: Optional[int] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get spending summary with category breakdown."""
    return await SpendingAnalyticsService.get_spending_summary(
        db=db,
        user_id=current_user.id,
        card_id=card_id,
        period=period,
        end_date=end_date
    )

@router.get("/trends")
async def get_spending_trends(
    period: str = Query("monthly", regex="^(daily|weekly|monthly|yearly)$"),
    num_periods: int = Query(12, ge=1, le=60),
    card_id: Optional[int] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get spending trends over time."""
    return await SpendingAnalyticsService.get_spending_trends(
        db=db,
        user_id=current_user.id,
        card_id=card_id,
        period=period,
        num_periods=num_periods,
        end_date=end_date
    )

@router.get("/merchant-insights")
async def get_merchant_insights(
    period: str = Query("monthly", regex="^(daily|weekly|monthly|yearly|all)$"),
    card_id: Optional[int] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get insights about merchant spending patterns."""
    return await SpendingAnalyticsService.get_merchant_insights(
        db=db,
        user_id=current_user.id,
        card_id=card_id,
        period=period,
        end_date=end_date
    )

@router.get("/cards/{card_id}/limits-analysis")
async def get_spending_limits_analysis(
    card_id: int,
    period: str = Query("monthly", regex="^(daily|weekly|monthly|yearly)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analyze spending against configured limits."""
    return await SpendingAnalyticsService.get_spending_limits_analysis(
        db=db,
        card_id=card_id,
        period=period
    )
