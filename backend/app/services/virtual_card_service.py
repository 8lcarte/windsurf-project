from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Dict, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.crud_virtual_card import virtual_card
from app.models.virtual_card import VirtualCard, CardStatus, SpendingLimitPeriod
from app.services.merchant_category_service import MerchantCategoryService

class VirtualCardService:
    @staticmethod
    def _is_limit_period_expired(last_reset: datetime, period: SpendingLimitPeriod) -> bool:
        """Check if a spending limit period has expired."""
        now = datetime.now(timezone.utc)
        if period == SpendingLimitPeriod.DAILY:
            return (now - last_reset).days >= 1
        elif period == SpendingLimitPeriod.WEEKLY:
            return (now - last_reset).days >= 7
        elif period == SpendingLimitPeriod.MONTHLY:
            # Approximate month as 30 days
            return (now - last_reset).days >= 30
        elif period == SpendingLimitPeriod.YEARLY:
            return (now - last_reset).days >= 365
        return False  # TOTAL never expires
        
    @staticmethod
    def _validate_spend_against_limit(
        current_spend: Dict,
        spending_limits: Dict,
        amount: Decimal,
        period: SpendingLimitPeriod
    ) -> Tuple[bool, str]:
        """Validate spend against a limit for a specific period."""
        limit = Decimal(str(spending_limits.get(period.value, 0)))
        if limit <= 0:
            return True, ""
            
        period_spend = current_spend.get(period.value, {}).get("amount", Decimal("0"))
        if period_spend + amount > limit:
            return False, f"Transaction would exceed {period.value} spending limit of {limit}"
            
        return True, ""

    @staticmethod
    def _get_period_start(period: SpendingLimitPeriod) -> datetime:
        """Get the start datetime for a spending period."""
        now = datetime.now(timezone.utc)
        if period == SpendingLimitPeriod.DAILY:
            return now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == SpendingLimitPeriod.WEEKLY:
            # Start of current week (Monday)
            return (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == SpendingLimitPeriod.MONTHLY:
            # Start of current month
            return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == SpendingLimitPeriod.YEARLY:
            # Start of current year
            return now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        return datetime.min.replace(tzinfo=timezone.utc)  # For TOTAL

    @classmethod
    async def validate_transaction(
        cls,
        db: AsyncSession,
        card: VirtualCard,
        amount: Decimal,
        merchant_id: Optional[str] = None,
        merchant_category: Optional[str] = None,
        merchant_name: Optional[str] = None,
        merchant_description: Optional[str] = None,
        country_code: Optional[str] = None,
        is_online: bool = False,
        is_contactless: bool = False,
        is_cash_withdrawal: bool = False,
        is_international: bool = False,
        payment_method: Optional[str] = None,
    ) -> Tuple[bool, Dict]:
        """
        Validate if a transaction can be processed based on card controls and limits.
        Returns (is_valid, validation_details).
        Raises HTTPException if validation fails.
        """
        validation_details = {
            "merchant_category": None,
            "warnings": [],
            "restrictions": [],
            "required_actions": []
        }

        # Check card status
        if card.status != CardStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Card is {card.status.value}",
            )

        # Check balance
        if card.balance < amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient funds",
            )
            
        # Validate overall spending limits
        for period in SpendingLimitPeriod:
            is_valid, error_msg = cls._validate_spend_against_limit(
                current_spend=card.current_spend,
                spending_limits=card.spending_limits,
                amount=amount,
                period=period
            )
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_msg
                )
                
        # Map merchant category
        mapped_category = await MerchantCategoryService.map_merchant_to_category(
            db=db,
            merchant_name=merchant_name,
            merchant_description=merchant_description,
            mcc=merchant_category,
            transaction_amount=float(amount),
            payment_method=payment_method,
            country_code=country_code
        )
        
        if mapped_category:
            # Validate category spending limits
            category_code = mapped_category.code.split('.')[0]  # Get root category
            if category_code in card.category_spending_limits:
                for period in SpendingLimitPeriod:
                    is_valid, error_msg = cls._validate_spend_against_limit(
                        current_spend=card.category_current_spend.get(category_code, {}),
                        spending_limits=card.category_spending_limits[category_code],
                        amount=amount,
                        period=period
                    )
                    if not is_valid:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Category {mapped_category.name}: {error_msg}"
                        )
            
            # Validate subcategory spending limits
            if mapped_category.code in card.subcategory_spending_limits:
                for period in SpendingLimitPeriod:
                    is_valid, error_msg = cls._validate_spend_against_limit(
                        current_spend=card.subcategory_current_spend.get(mapped_category.code, {}),
                        spending_limits=card.subcategory_spending_limits[mapped_category.code],
                        amount=amount,
                        period=period
                    )
                    if not is_valid:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Subcategory {mapped_category.name}: {error_msg}"
                        )

        # Check transaction type controls
        if is_online and not card.allow_online_transactions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Online transactions not allowed",
            )
        if is_contactless and not card.allow_contactless_transactions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contactless transactions not allowed",
            )
        if is_cash_withdrawal and not card.allow_cash_withdrawals:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cash withdrawals not allowed",
            )
            
        # Map and validate merchant category
        mapped_category = await MerchantCategoryService.map_merchant_to_category(
            db=db,
            merchant_name=merchant_name,
            merchant_description=merchant_description,
            mcc=merchant_category,
            transaction_amount=float(amount),
            payment_method=payment_method,
            country_code=country_code
        )
        
        if mapped_category:
            validation_details["merchant_category"] = {
                "code": mapped_category.code,
                "name": mapped_category.name,
                "path": mapped_category.path
            }
            
            # Get category validation rules
            category_rules = await MerchantCategoryService.validate_category_rules(
                db=db,
                category=mapped_category,
                amount=float(amount),
                payment_method=payment_method or "card_present" if not is_online else "online",
                country_code=country_code or "US"
            )
            
            # Update validation details
            validation_details["warnings"].extend(category_rules["warnings"])
            validation_details["restrictions"].extend(category_rules["restrictions"])
            validation_details["required_actions"].extend(category_rules["required_actions"])
            
            # Check if category is allowed
            if not category_rules["allowed"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Transaction restricted: {', '.join(category_rules['restrictions'])}"
                )
            
            # Check merchant category controls
            if card.allowed_merchant_categories and mapped_category.code not in card.allowed_merchant_categories:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Merchant category {mapped_category.name} not allowed",
                )
            
            if card.blocked_merchant_categories and mapped_category.code in card.blocked_merchant_categories:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Merchant category {mapped_category.name} is blocked",
                )
        if is_international and not card.allow_international_transactions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="International transactions not allowed",
            )

        # Check merchant controls
        if merchant_id:
            if card.blocked_merchants and merchant_id in card.blocked_merchants:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Merchant is blocked",
                )
            if card.allowed_merchants and merchant_id not in card.allowed_merchants:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Merchant is not in allowed list",
                )

        if merchant_category:
            if card.blocked_merchant_categories and merchant_category in card.blocked_merchant_categories:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Merchant category is blocked",
                )
            if card.allowed_merchant_categories and merchant_category not in card.allowed_merchant_categories:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Merchant category is not in allowed list",
                )

        # Check geographic controls
        if country_code:
            if card.blocked_countries and country_code in card.blocked_countries:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Country is blocked",
                )
            if card.allowed_countries and country_code not in card.allowed_countries:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Country is not in allowed list",
                )

        # Check spending limits
        if card.spending_limits:
            current_spend = card.current_spend or {}
            last_spend_reset = card.last_spend_reset or {}

            for period_str, limit in card.spending_limits.items():
                try:
                    period = SpendingLimitPeriod(period_str)
                except ValueError:
                    continue  # Skip invalid periods

                # Get or initialize period spend
                period_spend = Decimal(str(current_spend.get(period_str, 0)))
                last_reset = datetime.fromisoformat(last_spend_reset.get(period_str, "2000-01-01T00:00:00+00:00"))

                # Check if period has expired and reset if needed
                if cls._is_limit_period_expired(last_reset, period):
                    period_spend = Decimal(0)
                    last_reset = cls._get_period_start(period)

                # Check if transaction would exceed limit
                if period_spend + amount > Decimal(str(limit)):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Transaction would exceed {period.value} spending limit",
                    )

        return True

    @classmethod
    async def update_spend(
        cls,
        db: AsyncSession,
        card: VirtualCard,
        amount: Decimal,
        merchant_category: Optional[str] = None,
        success: bool = True
    ) -> VirtualCard:
        """Update card spending statistics after a transaction."""
        now = datetime.now(timezone.utc)
        update_data = {
            "total_spend": float(Decimal(str(card.total_spend)) + amount) if success else card.total_spend,
            "total_transaction_count": card.total_transaction_count + (1 if success else 0),
            "failed_transaction_count": card.failed_transaction_count + (0 if success else 1),
            "last_transaction_at": now,
        }

        if success:
            # Update overall spending limits
            if card.spending_limits:
                current_spend = card.current_spend or {}
                
                for period_str in card.spending_limits.keys():
                    try:
                        period = SpendingLimitPeriod(period_str)
                    except ValueError:
                        continue  # Skip invalid periods

                    # Get or initialize period values
                    period_data = current_spend.get(period_str, {"amount": "0", "last_reset": "2000-01-01T00:00:00+00:00"})
                    period_spend = Decimal(str(period_data["amount"]))
                    last_reset = datetime.fromisoformat(period_data["last_reset"])

                    # Reset period if expired
                    if cls._is_limit_period_expired(last_reset, period):
                        period_spend = Decimal(0)
                        last_reset = cls._get_period_start(period)

                    # Update spend
                    current_spend[period_str] = {
                        "amount": float(period_spend + amount),
                        "last_reset": last_reset.isoformat()
                    }

                update_data["current_spend"] = current_spend

            # Update category-specific spending if merchant category is provided
            if merchant_category:
                category = merchant_category.split('.')[0]  # Get root category
                
                # Update category spending
                if category in card.category_spending_limits:
                    category_spend = card.category_current_spend.get(category, {})
                    category_transaction_counts = card.category_transaction_counts or {}
                    
                    for period_str in card.category_spending_limits[category].keys():
                        try:
                            period = SpendingLimitPeriod(period_str)
                        except ValueError:
                            continue

                        # Get or initialize period values
                        period_data = category_spend.get(period_str, {"amount": "0", "last_reset": "2000-01-01T00:00:00+00:00"})
                        period_spend = Decimal(str(period_data["amount"]))
                        last_reset = datetime.fromisoformat(period_data["last_reset"])

                        # Reset period if expired
                        if cls._is_limit_period_expired(last_reset, period):
                            period_spend = Decimal(0)
                            last_reset = cls._get_period_start(period)

                        # Update spend
                        category_spend[period_str] = {
                            "amount": float(period_spend + amount),
                            "last_reset": last_reset.isoformat()
                        }
                    
                    # Update category transaction count
                    category_transaction_counts[category] = category_transaction_counts.get(category, 0) + 1
                    
                    update_data["category_current_spend"] = card.category_current_spend | {category: category_spend}
                    update_data["category_transaction_counts"] = category_transaction_counts

                # Update subcategory spending
                if merchant_category in card.subcategory_spending_limits:
                    subcategory_spend = card.subcategory_current_spend.get(merchant_category, {})
                    subcategory_transaction_counts = card.subcategory_transaction_counts or {}
                    
                    for period_str in card.subcategory_spending_limits[merchant_category].keys():
                        try:
                            period = SpendingLimitPeriod(period_str)
                        except ValueError:
                            continue

                        # Get or initialize period values
                        period_data = subcategory_spend.get(period_str, {"amount": "0", "last_reset": "2000-01-01T00:00:00+00:00"})
                        period_spend = Decimal(str(period_data["amount"]))
                        last_reset = datetime.fromisoformat(period_data["last_reset"])

                        # Reset period if expired
                        if cls._is_limit_period_expired(last_reset, period):
                            period_spend = Decimal(0)
                            last_reset = cls._get_period_start(period)

                        # Update spend
                        subcategory_spend[period_str] = {
                            "amount": float(period_spend + amount),
                            "last_reset": last_reset.isoformat()
                        }
                    
                    # Update subcategory transaction count
                    subcategory_transaction_counts[merchant_category] = subcategory_transaction_counts.get(merchant_category, 0) + 1
                    
                    update_data["subcategory_current_spend"] = card.subcategory_current_spend | {merchant_category: subcategory_spend}
                    update_data["subcategory_transaction_counts"] = subcategory_transaction_counts

        return await virtual_card.update(db, db_obj=card, obj_in=update_data)
