from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, List
from datetime import datetime, timezone

from app.api.deps import get_current_user
from app.crud.crud_virtual_card import virtual_card
from app.db.session import get_db
from app.models.user import User
from app.models.virtual_card import CardStatus
from app.schemas.virtual_card import (
    VirtualCard,
    VirtualCardCreate,
    VirtualCardUpdate,
    VirtualCardSpendingUpdate,
    VirtualCardMerchantUpdate,
    VirtualCardGeographicUpdate,
    VirtualCardTransactionUpdate,
    VirtualCardFreeze,
)

router = APIRouter()

@router.post("/", response_model=VirtualCard)
async def create_card(
    *,
    db: AsyncSession = Depends(get_db),
    card_in: VirtualCardCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new virtual card.
    """
    card = await virtual_card.create(db, obj_in=card_in, owner_id=current_user.id)
    return card

@router.get("/", response_model=List[VirtualCard])
async def read_cards(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Retrieve virtual cards.
    """
    cards = await virtual_card.get_by_user(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    return cards

@router.get("/{card_id}", response_model=VirtualCard)
async def read_card(
    *,
    db: AsyncSession = Depends(get_db),
    card_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get virtual card by ID.
    """
    card = await virtual_card.get(db, id=card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Virtual card not found",
        )
    if card.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return card

@router.put("/{card_id}", response_model=VirtualCard)
async def update_card(
    *,
    db: AsyncSession = Depends(get_db),
    card_id: int,
    card_in: VirtualCardUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update virtual card.
    """
    card = await virtual_card.get(db, id=card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Virtual card not found",
        )
    if card.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    if card.status == CardStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update a cancelled card",
        )
    card = await virtual_card.update(db, db_obj=card, obj_in=card_in)
    return card

@router.put("/{card_id}/spending-limits", response_model=VirtualCard)
async def update_spending_limits(
    *,
    db: AsyncSession = Depends(get_db),
    card_id: int,
    limits_in: VirtualCardSpendingUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update card spending limits.
    """
    card = await virtual_card.get(db, id=card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Virtual card not found",
        )
    if card.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    if card.status == CardStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update a cancelled card",
        )
    
    # Convert spending limits to dictionary format
    spending_limits = {}
    for limit in limits_in.spending_limits:
        spending_limits[limit.period.value] = float(limit.amount)
    
    card = await virtual_card.update(db, db_obj=card, obj_in={"spending_limits": spending_limits})
    return card

@router.put("/{card_id}/merchant-controls", response_model=VirtualCard)
async def update_merchant_controls(
    *,
    db: AsyncSession = Depends(get_db),
    card_id: int,
    controls_in: VirtualCardMerchantUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update card merchant controls.
    """
    card = await virtual_card.get(db, id=card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Virtual card not found",
        )
    if card.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    if card.status == CardStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update a cancelled card",
        )
    
    update_data = {
        "allowed_merchant_categories": controls_in.merchant_controls.allowed_categories or [],
        "blocked_merchant_categories": controls_in.merchant_controls.blocked_categories or [],
        "allowed_merchants": controls_in.merchant_controls.allowed_merchants or [],
        "blocked_merchants": controls_in.merchant_controls.blocked_merchants or [],
    }
    
    card = await virtual_card.update(db, db_obj=card, obj_in=update_data)
    return card

@router.put("/{card_id}/geographic-controls", response_model=VirtualCard)
async def update_geographic_controls(
    *,
    db: AsyncSession = Depends(get_db),
    card_id: int,
    controls_in: VirtualCardGeographicUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update card geographic controls.
    """
    card = await virtual_card.get(db, id=card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Virtual card not found",
        )
    if card.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    if card.status == CardStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update a cancelled card",
        )
    
    update_data = {
        "allowed_countries": controls_in.geographic_controls.allowed_countries or [],
        "blocked_countries": controls_in.geographic_controls.blocked_countries or [],
    }
    
    card = await virtual_card.update(db, db_obj=card, obj_in=update_data)
    return card

@router.put("/{card_id}/transaction-controls", response_model=VirtualCard)
async def update_transaction_controls(
    *,
    db: AsyncSession = Depends(get_db),
    card_id: int,
    controls_in: VirtualCardTransactionUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update card transaction controls.
    """
    card = await virtual_card.get(db, id=card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Virtual card not found",
        )
    if card.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    if card.status == CardStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update a cancelled card",
        )
    
    update_data = {
        "allow_online_transactions": controls_in.transaction_controls.allow_online,
        "allow_contactless_transactions": controls_in.transaction_controls.allow_contactless,
        "allow_cash_withdrawals": controls_in.transaction_controls.allow_cash_withdrawals,
        "allow_international_transactions": controls_in.transaction_controls.allow_international,
    }
    
    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    card = await virtual_card.update(db, db_obj=card, obj_in=update_data)
    return card

@router.post("/{card_id}/freeze", response_model=VirtualCard)
async def freeze_card(
    *,
    db: AsyncSession = Depends(get_db),
    card_id: int,
    freeze_in: VirtualCardFreeze,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Freeze a virtual card.
    """
    card = await virtual_card.get(db, id=card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Virtual card not found",
        )
    if card.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    if card.status == CardStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot freeze a cancelled card",
        )
    if card.status == CardStatus.FROZEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Card is already frozen",
        )
    
    card = await virtual_card.update(
        db,
        db_obj=card,
        obj_in={"status": CardStatus.FROZEN}
    )
    return card

@router.post("/{card_id}/unfreeze", response_model=VirtualCard)
async def unfreeze_card(
    *,
    db: AsyncSession = Depends(get_db),
    card_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Unfreeze a virtual card.
    """
    card = await virtual_card.get(db, id=card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Virtual card not found",
        )
    if card.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    if card.status == CardStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot unfreeze a cancelled card",
        )
    if card.status != CardStatus.FROZEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Card is not frozen",
        )
    
    card = await virtual_card.update(
        db,
        db_obj=card,
        obj_in={"status": CardStatus.ACTIVE}
    )
    return card

@router.delete("/{card_id}", response_model=VirtualCard)
async def delete_card(
    *,
    db: AsyncSession = Depends(get_db),
    card_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Delete virtual card.
    """
    card = await get_virtual_card(db, id=card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Virtual card not found",
        )
    if card.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    card = await virtual_card.remove(db, id=card_id)
    return card
