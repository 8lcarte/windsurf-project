from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, List, Optional

from app.api.deps import get_current_user
from app.crud.crud_transaction import transaction
from app.crud.crud_virtual_card import virtual_card
from app.db.session import get_db
from app.models.user import User
from app.models.transaction import TransactionType, TransactionStatus
from app.schemas.transaction import TransactionCreate, Transaction
from app.services.virtual_card_service import VirtualCardService

router = APIRouter()

@router.post("/", response_model=Transaction)
async def create_new_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    transaction_in: TransactionCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new transaction.
    """
    # If virtual card is involved, validate the transaction
    if transaction_in.virtual_card_id:
        card = await virtual_card.get(db, id=transaction_in.virtual_card_id)
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
        
        # For purchases and withdrawals, validate card controls
        if transaction_in.type in [TransactionType.PURCHASE, TransactionType.WITHDRAWAL]:
            try:
                await VirtualCardService.validate_transaction(
                    db=db,
                    card=card,
                    amount=Decimal(str(transaction_in.amount)),
                    merchant_id=transaction_in.merchant_id,
                    merchant_category=transaction_in.merchant_category,
                    country_code=transaction_in.merchant_country,
                    is_online=transaction_in.is_online,
                    is_contactless=transaction_in.is_contactless,
                    is_cash_withdrawal=(transaction_in.type == TransactionType.WITHDRAWAL),
                    is_international=transaction_in.is_international,
                )
            except HTTPException as e:
                # Create failed transaction record
                transaction_dict = transaction_in.dict()
                transaction_dict.update({
                    "status": TransactionStatus.FAILED,
                    "decline_reason": e.detail,
                    "user_id": current_user.id
                })
                transaction_obj = await transaction.create(db, obj_in=transaction_dict)
                
                # Update card statistics
                await VirtualCardService.update_spend(
                    db=db,
                    card=card,
                    amount=Decimal(str(transaction_in.amount)),
                    success=False
                )
                
                raise e
    
    # Create the transaction
    transaction_dict = transaction_in.dict()
    transaction_dict.update({
        "user_id": current_user.id,
        "status": TransactionStatus.PENDING
    })
    
    # If location is provided, flatten it
    if transaction_in.location:
        location_dict = transaction_in.location.dict()
        transaction_dict.update({
            "location_city": location_dict["city"],
            "location_country": location_dict["country"],
            "location_postal_code": location_dict["postal_code"],
            "location_lat": location_dict["latitude"],
            "location_lon": location_dict["longitude"],
        })
    
    transaction_obj = await transaction.create(db, obj_in=transaction_dict)
    
    # If successful and using virtual card, update card spend
    if transaction_obj.status == TransactionStatus.COMPLETED and transaction_in.virtual_card_id:
        await VirtualCardService.update_spend(
            db=db,
            card=card,
            amount=Decimal(str(transaction_in.amount)),
            success=True
        )
    
    return transaction_obj

@router.get("/", response_model=List[Transaction])
async def read_transactions(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Retrieve transactions.
    """
    transactions = await transaction.get_by_user(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    return transactions

@router.get("/{transaction_id}", response_model=Transaction)
async def read_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    transaction_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get transaction by ID.
    """
    transaction_obj = await transaction.get(db, id=transaction_id)
    if not transaction_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    if transaction_obj.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return transaction_obj
