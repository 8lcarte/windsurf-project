from fastapi import APIRouter

from app.api.v1.routers import (
    auth,
    users,
    virtual_cards,
    payment_methods,
    transactions,
    social,
    spending_analytics,
    visualizations,
    templates,
)
from app.api.v1.endpoints import ai_advisor

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(social.router, prefix="/auth/social", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(
    virtual_cards.router, prefix="/virtual-cards", tags=["virtual-cards"]
)
api_router.include_router(
    payment_methods.router, prefix="/payment-methods", tags=["payment-methods"]
)
api_router.include_router(
    spending_analytics.router, prefix="/analytics/spending", tags=["analytics"]
)
api_router.include_router(
    visualizations.router, prefix="/visualizations", tags=["visualizations"]
)
api_router.include_router(
    transactions.router, prefix="/transactions", tags=["transactions"]
)
api_router.include_router(
    templates.router, prefix="/templates", tags=["templates"]
)
api_router.include_router(
    ai_advisor.router, prefix="/ai-advisor", tags=["ai-advisor"]
)
