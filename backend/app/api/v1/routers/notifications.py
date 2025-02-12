from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional

from app.api.deps import get_current_user
from app.schemas.user import User

router = APIRouter()

# Mock notifications storage
mock_notifications: List[Dict[str, Any]] = []

@router.get("/", response_model=List[Dict[str, Any]])
async def get_notifications(current_user: Optional[User] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Get user notifications."""
    # If user is not authenticated, return an empty list
    if not current_user:
        return []
    
    # For now, return an empty list since we're using mock data
    return [] 