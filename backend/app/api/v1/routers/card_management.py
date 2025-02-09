from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, conint

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.card_management_service import CardManagementService

router = APIRouter()

# Schema definitions
class CardTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    spending_limits: Optional[dict] = None
    category_spending_limits: Optional[dict] = None
    subcategory_spending_limits: Optional[dict] = None
    allowed_merchant_categories: Optional[List[str]] = None
    blocked_merchant_categories: Optional[List[str]] = None
    allowed_merchants: Optional[List[str]] = None
    blocked_merchants: Optional[List[str]] = None
    allowed_countries: Optional[List[str]] = None
    blocked_countries: Optional[List[str]] = None
    allow_online_transactions: Optional[bool] = True
    allow_contactless_transactions: Optional[bool] = True
    allow_cash_withdrawals: Optional[bool] = False
    allow_international_transactions: Optional[bool] = False
    auto_expiry_enabled: Optional[bool] = False
    auto_expiry_days: Optional[int] = None
    auto_renewal_enabled: Optional[bool] = False
    auto_freeze_on_suspicious: Optional[bool] = True
    suspicious_activity_threshold: Optional[dict] = None

class BulkCardCreate(BaseModel):
    template_id: Optional[int] = None
    count: conint(gt=0, lt=101)  # Limit to 100 cards at a time
    base_name: str
    currency: str = "USD"
    cardholder_name: str
    spending_limits: Optional[dict] = None
    category_spending_limits: Optional[dict] = None

class BulkCardUpdate(BaseModel):
    card_ids: List[int]
    updates: dict

class BulkCardFreeze(BaseModel):
    card_ids: List[int]
    reason: str
    duration: Optional[int] = None  # Hours until auto-unfreeze

class CardClone(BaseModel):
    count: conint(gt=0, lt=11)  # Limit to 10 clones at a time
    name_prefix: Optional[str] = None

# Endpoints
@router.post("/templates")
async def create_template(
    template: CardTemplateBase,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new card template."""
    return await CardManagementService.create_template(
        db=db,
        user_id=current_user.id,
        template_data=template.dict(exclude_unset=True)
    )

@router.post("/templates/{template_id}/apply")
async def apply_template(
    template_id: int,
    card_ids: List[int],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Apply a template to multiple cards."""
    cards, errors = await CardManagementService.apply_template_to_cards(
        db=db,
        template_id=template_id,
        card_ids=card_ids
    )
    return {
        "success": len(cards),
        "errors": errors,
        "updated_cards": [card.to_dict() for card in cards]
    }

@router.post("/bulk/create")
async def bulk_create_cards(
    data: BulkCardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create multiple cards in bulk."""
    cards, errors = await CardManagementService.bulk_create_cards(
        db=db,
        user_id=current_user.id,
        template_id=data.template_id,
        count=data.count,
        base_name=data.base_name,
        currency=data.currency,
        cardholder_name=data.cardholder_name,
        spending_limits=data.spending_limits,
        category_spending_limits=data.category_spending_limits
    )
    return {
        "success": len(cards),
        "errors": errors,
        "created_cards": [card.to_dict() for card in cards]
    }

@router.post("/cards/{card_id}/clone")
async def clone_card(
    card_id: int,
    data: CardClone,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clone a card one or multiple times."""
    cards, errors = await CardManagementService.clone_card(
        db=db,
        card_id=card_id,
        count=data.count,
        name_prefix=data.name_prefix
    )
    return {
        "success": len(cards),
        "errors": errors,
        "cloned_cards": [card.to_dict() for card in cards]
    }

@router.post("/bulk/update")
async def bulk_update_cards(
    data: BulkCardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update multiple cards with the same settings."""
    cards, errors = await CardManagementService.bulk_update_cards(
        db=db,
        card_ids=data.card_ids,
        updates=data.updates
    )
    return {
        "success": len(cards),
        "errors": errors,
        "updated_cards": [card.to_dict() for card in cards]
    }

@router.post("/bulk/freeze")
async def bulk_freeze_cards(
    data: BulkCardFreeze,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Freeze multiple cards."""
    cards, errors = await CardManagementService.bulk_freeze_cards(
        db=db,
        card_ids=data.card_ids,
        reason=data.reason,
        duration=data.duration
    )
    return {
        "success": len(cards),
        "errors": errors,
        "frozen_cards": [card.to_dict() for card in cards]
    }

@router.post("/maintenance/process-auto-unfreezes")
async def process_auto_unfreezes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Process cards that should be automatically unfrozen."""
    cards, errors = await CardManagementService.process_auto_unfreezes(db=db)
    return {
        "success": len(cards),
        "errors": errors,
        "unfrozen_cards": [card.to_dict() for card in cards]
    }

@router.post("/maintenance/process-auto-renewals")
async def process_auto_renewals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Process cards that need automatic renewal."""
    cards, errors = await CardManagementService.process_auto_renewals(db=db)
    return {
        "success": len(cards),
        "errors": errors,
        "renewed_cards": [card.to_dict() for card in cards]
    }
