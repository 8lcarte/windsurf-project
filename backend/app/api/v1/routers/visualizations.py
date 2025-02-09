from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.visualization_service import VisualizationService

router = APIRouter()

@router.get("/spending/pie-chart")
async def get_spending_pie_chart(
    period: str = Query("monthly", regex="^(daily|weekly|monthly|yearly|all)$"),
    card_id: Optional[int] = None,
    category_code: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get pie chart data showing category spending breakdown."""
    return await VisualizationService.get_spending_pie_chart(
        db=db,
        user_id=current_user.id,
        card_id=card_id,
        period=period,
        category_code=category_code
    )

@router.get("/spending/trend-line")
async def get_spending_trend_line(
    period: str = Query("monthly", regex="^(daily|weekly|monthly|yearly)$"),
    num_periods: int = Query(12, ge=1, le=60),
    card_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get line chart data showing spending trends."""
    return await VisualizationService.get_spending_trend_line(
        db=db,
        user_id=current_user.id,
        card_id=card_id,
        period=period,
        num_periods=num_periods
    )

@router.get("/spending/category-bars")
async def get_category_bar_chart(
    period: str = Query("monthly", regex="^(daily|weekly|monthly|yearly|all)$"),
    top_n: int = Query(5, ge=1, le=20),
    card_id: Optional[int] = None,
    category_code: Optional[str] = None,
    view_type: str = Query("spend", regex="^(spend|transactions)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get bar chart data showing top spending categories."""
    return await VisualizationService.get_category_bar_chart(
        db=db,
        user_id=current_user.id,
        card_id=card_id,
        period=period,
        top_n=top_n,
        category_code=category_code,
        view_type=view_type
    )

@router.get("/cards/{card_id}/limit-gauges")
async def get_limits_gauge_charts(
    card_id: int,
    period: str = Query("monthly", regex="^(daily|weekly|monthly|yearly)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get gauge chart data showing spending limits usage."""
    return await VisualizationService.get_limits_gauge_charts(
        db=db,
        card_id=card_id,
        period=period
    )

@router.get("/spending/merchant-bubbles")
async def get_merchant_bubble_chart(
    period: str = Query("monthly", regex="^(daily|weekly|monthly|yearly|all)$"),
    top_n: int = Query(20, ge=1, le=50),
    card_id: Optional[int] = None,
    category_code: Optional[str] = None,
    merchant_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get bubble chart data showing merchant spending patterns."""
    return await VisualizationService.get_merchant_bubble_chart(
        db=db,
        user_id=current_user.id,
        card_id=card_id,
        period=period,
        top_n=top_n,
        category_code=category_code,
        merchant_name=merchant_name
    )
