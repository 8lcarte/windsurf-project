from fastapi import APIRouter
from app.api.v1.routers import auth, notifications

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
