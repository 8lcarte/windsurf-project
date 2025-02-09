from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, constr, conint, confloat

class CardTemplateBase(BaseModel):
    """Base model for card templates with all configurable settings."""
    name: constr(min_length=1, max_length=100) = Field(
        ...,
        description="Template name, must be between 1 and 100 characters"
    )
    description: Optional[constr(max_length=500)] = Field(
        None,
        description="Optional template description, max 500 characters"
    )
    spending_limits: Dict[str, float] = Field(
        default_factory=dict,
        description="Period-based spending limits (e.g., daily, monthly)"
    )
    category_spending_limits: Dict[str, float] = Field(
        default_factory=dict,
        description="Spending limits per merchant category"
    )
    subcategory_spending_limits: Dict[str, float] = Field(
        default_factory=dict,
        description="Spending limits per merchant subcategory"
    )
    allowed_merchant_categories: List[str] = Field(
        default_factory=list,
        description="List of allowed merchant category codes (MCCs)"
    )
    blocked_merchant_categories: List[str] = Field(
        default_factory=list,
        description="List of blocked merchant category codes (MCCs)"
    )
    allowed_merchants: List[str] = Field(
        default_factory=list,
        description="List of specifically allowed merchant IDs"
    )
    blocked_merchants: List[str] = Field(
        default_factory=list,
        description="List of specifically blocked merchant IDs"
    )
    allowed_countries: List[str] = Field(
        default_factory=list,
        description="List of allowed country codes (ISO 3166-1 alpha-2)"
    )
    blocked_countries: List[str] = Field(
        default_factory=list,
        description="List of blocked country codes (ISO 3166-1 alpha-2)"
    )
    allow_online_transactions: bool = Field(
        True,
        description="Whether to allow online transactions"
    )
    allow_contactless_transactions: bool = Field(
        True,
        description="Whether to allow contactless transactions"
    )
    allow_cash_withdrawals: bool = Field(
        False,
        description="Whether to allow ATM withdrawals"
    )
    allow_international_transactions: bool = Field(
        False,
        description="Whether to allow international transactions"
    )
    auto_expiry_enabled: bool = Field(
        False,
        description="Whether cards should automatically expire"
    )
    auto_expiry_days: Optional[conint(ge=1, le=365)] = Field(
        None,
        description="Number of days until automatic expiry (1-365)"
    )
    auto_renewal_enabled: bool = Field(
        False,
        description="Whether to automatically renew expiring cards"
    )
    auto_freeze_on_suspicious: bool = Field(
        True,
        description="Whether to automatically freeze cards on suspicious activity"
    )
    suspicious_activity_threshold: Dict[str, Any] = Field(
        default_factory=dict,
        description="Thresholds for detecting suspicious activity"
    )

class CardTemplateCreate(CardTemplateBase):
    pass

class CardTemplateUpdate(CardTemplateBase):
    name: Optional[str] = None

class CardTemplateAnalytics(BaseModel):
    """Analytics data for a card template."""
    total_cards: conint(ge=0) = Field(
        ...,
        description="Total number of cards using this template"
    )
    total_spend: confloat(ge=0) = Field(
        ...,
        description="Total spend across all cards using this template"
    )
    avg_monthly_spend: confloat(ge=0) = Field(
        ...,
        description="Average monthly spend per card"
    )
    success_rate: confloat(ge=0, le=100) = Field(
        ...,
        description="Percentage of successful transactions (0-100)"
    )
    usage_count: conint(ge=0) = Field(
        ...,
        description="Number of times this template has been used"
    )
    last_used: Optional[datetime] = Field(
        None,
        description="Timestamp of last template usage"
    )

    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "total_cards": 42,
                "total_spend": 12500.50,
                "avg_monthly_spend": 297.63,
                "success_rate": 98.5,
                "usage_count": 150,
                "last_used": "2025-02-09T10:00:00Z"
            }
        }

class CardTemplateHistory(CardTemplateBase):
    """Historical version of a card template."""
    id: int = Field(..., description="Template ID")
    version: conint(ge=1) = Field(..., description="Version number")
    created_at: datetime = Field(..., description="When this version was created")
    updated_at: datetime = Field(..., description="When this version was last updated")
    is_active: bool = Field(..., description="Whether this is the active version")
    parent_version_id: Optional[int] = Field(
        None,
        description="ID of the parent version, if any"
    )

    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "id": 1,
                "version": 2,
                "name": "Standard Card Template",
                "description": "Template for standard virtual cards",
                "created_at": "2025-02-09T10:00:00Z",
                "updated_at": "2025-02-09T10:30:00Z",
                "is_active": True,
                "parent_version_id": 1,
                "spending_limits": {"daily": 1000, "monthly": 5000},
                "allow_online_transactions": True
            }
        }

class CardTemplateResponse(CardTemplateBase):
    """Complete template data including metadata and analytics."""
    id: int = Field(..., description="Template ID")
    user_id: int = Field(..., description="ID of the template owner")
    version: conint(ge=1) = Field(..., description="Version number")
    created_at: datetime = Field(..., description="When this template was created")
    updated_at: datetime = Field(..., description="When this template was last updated")
    is_active: bool = Field(..., description="Whether this is the active version")
    parent_version_id: Optional[int] = Field(
        None,
        description="ID of the parent version, if any"
    )
    usage_count: conint(ge=0) = Field(
        ...,
        description="Number of times this template has been used"
    )
    success_rate: confloat(ge=0, le=100) = Field(
        ...,
        description="Percentage of successful transactions (0-100)"
    )
    avg_monthly_spend: confloat(ge=0) = Field(
        ...,
        description="Average monthly spend per card"
    )
    total_cards: conint(ge=0) = Field(
        ...,
        description="Total number of cards using this template"
    )
    last_used_at: Optional[datetime] = Field(
        None,
        description="When this template was last used"
    )

    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "id": 1,
                "user_id": 42,
                "version": 1,
                "name": "Standard Card Template",
                "description": "Template for standard virtual cards",
                "created_at": "2025-02-09T10:00:00Z",
                "updated_at": "2025-02-09T10:00:00Z",
                "is_active": True,
                "parent_version_id": None,
                "usage_count": 150,
                "success_rate": 98.5,
                "avg_monthly_spend": 297.63,
                "total_cards": 42,
                "last_used_at": "2025-02-09T10:00:00Z",
                "spending_limits": {"daily": 1000, "monthly": 5000},
                "allow_online_transactions": True
            }
        }
