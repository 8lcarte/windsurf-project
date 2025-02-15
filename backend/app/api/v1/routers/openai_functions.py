from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ....crud import crud_virtual_card, crud_transaction
from ....core import security
from ....db.database import get_db
from ....schemas.virtual_card import VirtualCardCreate, VirtualCardUpdate
from ....schemas.transaction import TransactionCreate, TransactionStatus

router = APIRouter()

# Card Management Function Models
class CreateVirtualCardRequest(BaseModel):
    user_id: int = Field(..., description="ID of the user creating the card")
    card_name: str = Field(..., description="Name/label for the virtual card")
    spending_limit: float = Field(..., description="Monthly spending limit for the card")
    merchant_categories: Optional[List[str]] = Field(None, description="Allowed merchant categories")

class UpdateCardLimitsRequest(BaseModel):
    card_id: int = Field(..., description="ID of the virtual card to update")
    new_spending_limit: float = Field(..., description="New monthly spending limit")
    merchant_categories: Optional[List[str]] = Field(None, description="Updated allowed merchant categories")

class DisableCardRequest(BaseModel):
    card_id: int = Field(..., description="ID of the virtual card to disable")

# Transaction Function Models
class MakePurchaseRequest(BaseModel):
    card_id: int = Field(..., description="ID of the virtual card to use")
    amount: float = Field(..., description="Purchase amount")
    merchant: str = Field(..., description="Merchant name")
    merchant_category: str = Field(..., description="Merchant category code")

class VerifyTransactionRequest(BaseModel):
    transaction_id: int = Field(..., description="ID of the transaction to verify")

# Card Management Functions
@router.post("/create_virtual_card", response_model=Dict)
async def create_virtual_card(
    request: CreateVirtualCardRequest,
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_active_user)
):
    """Create a new virtual card with specified limits and categories"""
    try:
        card_data = VirtualCardCreate(
            user_id=request.user_id,
            card_name=request.card_name,
            spending_limit=request.spending_limit,
            merchant_categories=request.merchant_categories
        )
        card = crud_virtual_card.create(db, obj_in=card_data)
        return {
            "status": "success",
            "card_id": card.id,
            "message": f"Virtual card '{request.card_name}' created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/update_card_limits", response_model=Dict)
async def update_card_limits(
    request: UpdateCardLimitsRequest,
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_active_user)
):
    """Update spending limits and merchant categories for a virtual card"""
    try:
        card = crud_virtual_card.get(db, id=request.card_id)
        if not card:
            raise HTTPException(status_code=404, detail="Virtual card not found")
            
        update_data = VirtualCardUpdate(
            spending_limit=request.new_spending_limit,
            merchant_categories=request.merchant_categories
        )
        updated_card = crud_virtual_card.update(db, db_obj=card, obj_in=update_data)
        return {
            "status": "success",
            "card_id": updated_card.id,
            "message": "Card limits updated successfully"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/disable_card", response_model=Dict)
async def disable_card(
    request: DisableCardRequest,
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_active_user)
):
    """Disable a virtual card"""
    try:
        card = crud_virtual_card.get(db, id=request.card_id)
        if not card:
            raise HTTPException(status_code=404, detail="Virtual card not found")
            
        update_data = VirtualCardUpdate(is_active=False)
        crud_virtual_card.update(db, db_obj=card, obj_in=update_data)
        return {
            "status": "success",
            "card_id": request.card_id,
            "message": "Card disabled successfully"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Transaction Functions
@router.post("/make_purchase", response_model=Dict)
async def make_purchase(
    request: MakePurchaseRequest,
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_active_user)
):
    """Process a purchase transaction using a virtual card"""
    try:
        # Verify card exists and is active
        card = crud_virtual_card.get(db, id=request.card_id)
        if not card:
            raise HTTPException(status_code=404, detail="Virtual card not found")
        if not card.is_active:
            raise HTTPException(status_code=400, detail="Card is disabled")
            
        # Create transaction
        transaction_data = TransactionCreate(
            card_id=request.card_id,
            amount=request.amount,
            merchant=request.merchant,
            merchant_category=request.merchant_category
        )
        transaction = crud_transaction.create(db, obj_in=transaction_data)
        return {
            "status": "success",
            "transaction_id": transaction.id,
            "message": "Purchase processed successfully"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify_transaction", response_model=Dict)
async def verify_transaction(
    request: VerifyTransactionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_active_user)
):
    """Verify a transaction's authenticity and compliance with card limits"""
    try:
        transaction = crud_transaction.get(db, id=request.transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
            
        # Get associated card
        card = crud_virtual_card.get(db, id=transaction.card_id)
        if not card:
            raise HTTPException(status_code=404, detail="Associated virtual card not found")
            
        # Verify transaction is within card limits
        if transaction.amount > card.spending_limit:
            return {
                "status": "failed",
                "transaction_id": request.transaction_id,
                "message": "Transaction exceeds card spending limit"
            }
            
        # Verify merchant category is allowed
        if card.merchant_categories and transaction.merchant_category not in card.merchant_categories:
            return {
                "status": "failed",
                "transaction_id": request.transaction_id,
                "message": "Merchant category not allowed for this card"
            }
            
        return {
            "status": "success",
            "transaction_id": request.transaction_id,
            "message": "Transaction verified successfully"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/get_transaction_status/{transaction_id}", response_model=Dict)
async def get_transaction_status(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(security.get_current_active_user)
):
    """Get the current status of a transaction"""
    try:
        transaction = crud_transaction.get(db, id=transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
            
        return {
            "status": "success",
            "transaction_id": transaction_id,
            "transaction_status": transaction.status,
            "amount": transaction.amount,
            "merchant": transaction.merchant,
            "timestamp": transaction.created_at
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))