from fastapi import APIRouter
from app.api.v1.routers import auth, notifications, openai_functions

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(openai_functions.router, prefix="/openai-functions", tags=["openai-functions"])
