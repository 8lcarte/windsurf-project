from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.spending_analytics_service import SpendingAnalyticsService

class VisualizationService:
    @classmethod
    async def get_spending_pie_chart(
        cls,
        db: AsyncSession,
        user_id: int,
        card_id: Optional[int] = None,
        period: str = "monthly",
        category_code: Optional[str] = None  # For drill-down into subcategories
    ) -> Dict[str, Any]:
        """Generate data for a pie chart showing category spending breakdown."""
        summary = await SpendingAnalyticsService.get_spending_summary(
            db=db,
            user_id=user_id,
            card_id=card_id,
            period=period
        )

        # Filter for subcategories if category_code is provided
        if category_code:
            filtered_breakdown = [
                cat for cat in summary["category_breakdown"]
                if cat["category_code"].startswith(f"{category_code}.")
            ]
            title_prefix = f"{category_code.replace('_', ' ').title()} -"
        else:
            filtered_breakdown = summary["category_breakdown"]
            title_prefix = ""

        # Add drill-down metadata
        chart_data = {
            "chart_type": "pie",
            "title": f"{title_prefix} Spending by Category - {period.capitalize()}",
            "labels": [cat["category_name"] for cat in filtered_breakdown],
            "datasets": [{
                "data": [cat["total_spend"] for cat in filtered_breakdown],
                "backgroundColor": [
                    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
                    "#FF9F40", "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"
                ][:len(filtered_breakdown)]
            }],
            "drill_down": {
                "type": "category" if not category_code else "subcategory",
                "current_level": category_code or "root",
                "items": [{
                    "category_code": cat["category_code"],
                    "has_children": '.' in cat["category_code"] if category_code else True
                } for cat in filtered_breakdown]
            }
        }

        # Add time comparison data
        if period != "all":
            previous_period = await cls._get_previous_period_data(
                db, user_id, card_id, period, filtered_breakdown
            )
            chart_data["comparison"] = previous_period

        return chart_data

    @classmethod
    async def _get_previous_period_data(
        cls,
        db: AsyncSession,
        user_id: int,
        card_id: Optional[int],
        period: str,
        current_breakdown: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Get comparison data from the previous period."""
        # Calculate previous period's end date
        current_end = datetime.now(timezone.utc)
        if period == "daily":
            previous_end = current_end - timedelta(days=1)
        elif period == "weekly":
            previous_end = current_end - timedelta(weeks=1)
        elif period == "monthly":
            # Move to the last day of previous month
            first_of_month = current_end.replace(day=1)
            previous_end = first_of_month - timedelta(days=1)
        elif period == "yearly":
            previous_end = current_end.replace(year=current_end.year - 1)
        else:
            return None

        # Get previous period's data
        previous_summary = await SpendingAnalyticsService.get_spending_summary(
            db=db,
            user_id=user_id,
            card_id=card_id,
            period=period,
            end_date=previous_end
        )

        # Calculate changes
        changes = []
        for current_cat in current_breakdown:
            previous_cat = next(
                (cat for cat in previous_summary["category_breakdown"]
                 if cat["category_code"] == current_cat["category_code"]),
                None
            )

            if previous_cat:
                change_amount = current_cat["total_spend"] - previous_cat["total_spend"]
                change_percent = (
                    ((current_cat["total_spend"] / previous_cat["total_spend"]) - 1) * 100
                    if previous_cat["total_spend"] > 0 else float('inf')
                )
            else:
                change_amount = current_cat["total_spend"]
                change_percent = float('inf')

            changes.append({
                "category_code": current_cat["category_code"],
                "category_name": current_cat["category_name"],
                "previous_spend": previous_cat["total_spend"] if previous_cat else 0,
                "change_amount": change_amount,
                "change_percent": change_percent
            })

        return {
            "previous_period_start": previous_summary["start_date"],
            "previous_period_end": previous_summary["end_date"],
            "changes": changes
        }

    @classmethod
    async def get_spending_trend_line(
        cls,
        db: AsyncSession,
        user_id: int,
        card_id: Optional[int] = None,
        period: str = "monthly",
        num_periods: int = 12,
        category_code: Optional[str] = None  # For category-specific trends
    ) -> Dict[str, Any]:
        """Generate data for a line chart showing spending trends."""
        # Get overall trends
        trends = await SpendingAnalyticsService.get_spending_trends(
            db=db,
            user_id=user_id,
            card_id=card_id,
            period=period,
            num_periods=num_periods
        )

        # Prepare base chart data
        chart_data = {
            "chart_type": "line",
            "title": f"Spending Trends - Past {num_periods} {period.capitalize()} Periods",
            "labels": [trend["period_start"].split("T")[0] for trend in trends["trends"]],
            "datasets": [{
                "label": "Total Spend",
                "data": [trend["total_spend"] for trend in trends["trends"]],
                "borderColor": "#36A2EB",
                "fill": False
            }],
            "interactions": {
                "click": {
                    "type": "date_drill_down",
                    "available_periods": [
                        {"value": "yearly", "label": "Yearly"},
                        {"value": "monthly", "label": "Monthly"},
                        {"value": "weekly", "label": "Weekly"},
                        {"value": "daily", "label": "Daily"}
                    ],
                    "current_period": period
                },
                "hover": {
                    "type": "point_details",
                    "fields": [
                        "total_spend",
                        "transaction_count",
                        "average_transaction"
                    ]
                }
            }
        }

        # Add moving averages
        if len(trends["trends"]) >= 3:
            moving_avg = []
            window_size = 3
            data = [trend["total_spend"] for trend in trends["trends"]]
            
            for i in range(len(data)):
                if i < window_size - 1:
                    moving_avg.append(None)
                else:
                    window = data[i-window_size+1:i+1]
                    moving_avg.append(sum(window) / window_size)

            chart_data["datasets"].append({
                "label": f"{window_size}-Period Moving Average",
                "data": moving_avg,
                "borderColor": "#FF6384",
                "borderDash": [5, 5],
                "fill": False
            })

        # Add category breakdown if viewing a specific category
        if category_code:
            category_data = []
            for trend in trends["trends"]:
                cat_spend = next(
                    (cat["total_spend"] for cat in trend.get("category_breakdown", [])
                     if cat["category_code"] == category_code),
                    0
                )
                category_data.append(cat_spend)

            chart_data["datasets"].append({
                "label": category_code.replace('_', ' ').title(),
                "data": category_data,
                "borderColor": "#FFCE56",
                "fill": False
            })

        return chart_data

    @classmethod
    async def get_category_bar_chart(
        cls,
        db: AsyncSession,
        user_id: int,
        card_id: Optional[int] = None,
        period: str = "monthly",
        top_n: int = 5,
        category_code: Optional[str] = None,  # For drill-down into subcategories
        view_type: str = "spend"  # 'spend' or 'transactions'
    ) -> Dict[str, Any]:
        """Generate data for a bar chart showing top spending categories."""
        summary = await SpendingAnalyticsService.get_spending_summary(
            db=db,
            user_id=user_id,
            card_id=card_id,
            period=period
        )
        
        # Filter for subcategories if category_code is provided
        if category_code:
            filtered_breakdown = [
                cat for cat in summary["category_breakdown"]
                if cat["category_code"].startswith(f"{category_code}.")
            ]
            title_prefix = f"{category_code.replace('_', ' ').title()} -"
        else:
            filtered_breakdown = summary["category_breakdown"]
            title_prefix = ""

        # Sort by selected metric
        if view_type == "transactions":
            sort_key = "transaction_count"
            metric_label = "Transaction Count"
        else:  # view_type == "spend"
            sort_key = "total_spend"
            metric_label = "Total Spend"

        top_categories = sorted(
            filtered_breakdown,
            key=lambda x: x[sort_key],
            reverse=True
        )[:top_n]

        # Prepare chart data
        chart_data = {
            "chart_type": "bar",
            "title": f"{title_prefix} Top {top_n} Categories by {metric_label} - {period.capitalize()}",
            "labels": [cat["category_name"] for cat in top_categories],
            "datasets": [{
                "label": metric_label,
                "data": [cat[sort_key] for cat in top_categories],
                "backgroundColor": [
                    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"
                ][:top_n]
            }],
            "interactions": {
                "click": {
                    "type": "category_drill_down",
                    "current_level": category_code or "root",
                    "items": [{
                        "category_code": cat["category_code"],
                        "has_children": '.' in cat["category_code"] if category_code else True
                    } for cat in top_categories]
                },
                "hover": {
                    "type": "category_details",
                    "fields": [
                        "total_spend",
                        "transaction_count",
                        "average_transaction",
                        "percentage"
                    ]
                }
            },
            "view_options": {
                "type": "toggle",
                "current": view_type,
                "options": [
                    {"value": "spend", "label": "By Spend"},
                    {"value": "transactions", "label": "By Transactions"}
                ]
            }
        }

        # Add time comparison if not viewing all-time data
        if period != "all":
            previous_period = await cls._get_previous_period_data(
                db, user_id, card_id, period, top_categories
            )
            chart_data["comparison"] = previous_period

        return chart_data

    @classmethod
    async def get_limits_gauge_charts(
        cls,
        db: AsyncSession,
        card_id: int,
        period: str = "monthly"
    ) -> Dict[str, Any]:
        """Generate data for gauge charts showing spending limits usage."""
        analysis = await SpendingAnalyticsService.get_spending_limits_analysis(
            db=db,
            card_id=card_id,
            period=period
        )
        
        gauges = {
            "overall": {
                "chart_type": "gauge",
                "title": "Overall Spending Limit Usage",
                "value": analysis["overall_limits"].get("percentage_used", 0),
                "min": 0,
                "max": 100,
                "zones": [
                    {"min": 0, "max": 60, "color": "#4BC0C0"},   # Green
                    {"min": 60, "max": 80, "color": "#FFCE56"},  # Yellow
                    {"min": 80, "max": 100, "color": "#FF6384"}  # Red
                ]
            },
            "categories": {}
        }
        
        # Add gauge for each category
        for category, data in analysis["category_limits"].items():
            gauges["categories"][category] = {
                "chart_type": "gauge",
                "title": f"{category.replace('_', ' ').title()} Limit Usage",
                "value": data["percentage_used"],
                "min": 0,
                "max": 100,
                "zones": [
                    {"min": 0, "max": 60, "color": "#4BC0C0"},
                    {"min": 60, "max": 80, "color": "#FFCE56"},
                    {"min": 80, "max": 100, "color": "#FF6384"}
                ]
            }
            
        return gauges

    @classmethod
    async def get_merchant_bubble_chart(
        cls,
        db: AsyncSession,
        user_id: int,
        card_id: Optional[int] = None,
        period: str = "monthly",
        top_n: int = 20,
        category_code: Optional[str] = None,  # For filtering by category
        merchant_name: Optional[str] = None  # For merchant-specific details
    ) -> Dict[str, Any]:
        """Generate data for a bubble chart showing merchant spending patterns."""
        insights = await SpendingAnalyticsService.get_merchant_insights(
            db=db,
            user_id=user_id,
            card_id=card_id,
            period=period
        )
        
        # Filter merchants if category provided
        filtered_merchants = [
            m for m in insights["merchant_insights"]
            if not category_code or m["merchant_category"].startswith(category_code)
        ]

        # If merchant_name is provided, focus on that merchant's history
        if merchant_name:
            merchant_data = next(
                (m for m in filtered_merchants if m["merchant_name"] == merchant_name),
                None
            )
            if merchant_data:
                return await cls._get_merchant_detail_chart(
                    db, user_id, card_id, merchant_name, period
                )
            return None

        # Get top N merchants by spend
        top_merchants = sorted(
            filtered_merchants,
            key=lambda x: x["total_spend"],
            reverse=True
        )[:top_n]
        
        chart_data = {
            "chart_type": "bubble",
            "title": f"Merchant Spending Patterns - {period.capitalize()}",
            "labels": [m["merchant_name"] for m in top_merchants],
            "datasets": [{
                "label": "Merchant Transactions",
                "data": [{
                    "x": m["average_transaction"],        # x-axis: avg transaction size
                    "y": m["transactions_per_day"],       # y-axis: frequency
                    "r": m["total_spend"] / 100          # bubble size: total spend
                } for m in top_merchants],
                "backgroundColor": "rgba(54, 162, 235, 0.6)"
            }],
            "interactions": {
                "click": {
                    "type": "merchant_drill_down",
                    "action": "view_merchant_details"
                },
                "hover": {
                    "type": "merchant_details",
                    "fields": [
                        "merchant_name",
                        "merchant_category",
                        "total_spend",
                        "transaction_count",
                        "average_transaction",
                        "transactions_per_day",
                        "days_since_last"
                    ]
                }
            },
            "filters": {
                "category": {
                    "type": "category_filter",
                    "current": category_code,
                    "available": list(set(
                        m["merchant_category"].split('.')[0]
                        for m in filtered_merchants
                    ))
                }
            }
        }

        # Add axis explanations
        chart_data["axes"] = {
            "x": {
                "label": "Average Transaction Amount ($)",
                "description": "Higher values indicate larger individual purchases"
            },
            "y": {
                "label": "Transactions per Day",
                "description": "Higher values indicate more frequent purchases"
            },
            "size": {
                "label": "Total Spend",
                "description": "Larger bubbles indicate higher total spending"
            }
        }

        return chart_data

    @classmethod
    async def _get_merchant_detail_chart(
        cls,
        db: AsyncSession,
        user_id: int,
        card_id: Optional[int],
        merchant_name: str,
        period: str
    ) -> Dict[str, Any]:
        """Generate detailed chart data for a specific merchant."""
        # Get merchant's transaction history
        query = select(Transaction).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.merchant_name == merchant_name,
                Transaction.status == TransactionStatus.COMPLETED
            )
        ).order_by(Transaction.created_at)

        if card_id:
            query = query.where(Transaction.virtual_card_id == card_id)

        result = await db.execute(query)
        transactions = result.scalars().all()

        # Prepare time series data
        time_series = []
        running_total = 0
        for tx in transactions:
            running_total += float(tx.amount)
            time_series.append({
                "date": tx.created_at.isoformat(),
                "amount": float(tx.amount),
                "running_total": running_total
            })

        return {
            "chart_type": "merchant_detail",
            "title": f"Transaction History - {merchant_name}",
            "datasets": [
                {
                    "type": "bar",
                    "label": "Transaction Amount",
                    "data": [tx["amount"] for tx in time_series],
                    "yAxisID": "amount"
                },
                {
                    "type": "line",
                    "label": "Running Total",
                    "data": [tx["running_total"] for tx in time_series],
                    "yAxisID": "total",
                    "borderColor": "#FF6384"
                }
            ],
            "labels": [tx["date"].split("T")[0] for tx in time_series],
            "axes": {
                "amount": {
                    "position": "left",
                    "title": "Transaction Amount ($)"
                },
                "total": {
                    "position": "right",
                    "title": "Running Total ($)"
                }
            },
            "interactions": {
                "hover": {
                    "type": "transaction_details",
                    "fields": [
                        "date",
                        "amount",
                        "running_total"
                    ]
                }
            }
        }
