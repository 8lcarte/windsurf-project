from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, List

from app.api.deps import get_current_user
from app.crud.crud_payment_method import payment_method
from app.db.session import get_db
from app.models.user import User
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate, PaymentMethod

router = APIRouter()

@router.post("/", response_model=PaymentMethod)
async def create_method(
    *,
    db: AsyncSession = Depends(get_db),
    method_in: PaymentMethodCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new payment method.
    """
    method = await payment_method.create(db, obj_in=method_in, owner_id=current_user.id)
    return method

@router.get("/", response_model=List[PaymentMethod])
async def read_methods(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Retrieve payment methods.
    """
    methods = await payment_method.get_by_user(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    return methods

@router.get("/{method_id}", response_model=PaymentMethod)
async def read_method(
    *,
    db: AsyncSession = Depends(get_db),
    method_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get payment method by ID.
    """
    method = await payment_method.get(db, id=method_id)
    if not method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found",
        )
    if method.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return method

@router.put("/{method_id}", response_model=PaymentMethod)
async def update_method(
    *,
    db: AsyncSession = Depends(get_db),
    method_id: int,
    method_in: PaymentMethodUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update payment method.
    """
    method = await payment_method.get(db, id=method_id)
    if not method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found",
        )
    if method.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    method = await payment_method.update(db, db_obj=method, obj_in=method_in)
    return method

@router.delete("/{method_id}", response_model=PaymentMethod)
async def delete_method(
    *,
    db: AsyncSession = Depends(get_db),
    method_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Delete payment method.
    """
    method = await payment_method.get(db, id=method_id)
    if not method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found",
        )
    if method.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    method = await payment_method.remove(db, id=method_id)
    return method
