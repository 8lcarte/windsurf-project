from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.models.card_template import CardTemplate
from app.services.card_management_service import CardManagementService
from app.schemas.template import (
    CardTemplateCreate,
    CardTemplateUpdate,
    CardTemplateResponse,
    CardTemplateAnalytics,
    CardTemplateHistory
)

router = APIRouter(
    prefix="/templates",
    tags=["templates"],
    responses={
        404: {"description": "Template not found"},
        403: {"description": "Permission denied"},
    },
)

@router.post("/", response_model=CardTemplateResponse)
async def create_template(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    template_data: CardTemplateCreate
) -> CardTemplate:
    """Create a new card template.
    
    Args:
        template_data: Template configuration including spending limits, merchant restrictions,
                      and control settings.
        
    Returns:
        The newly created template with full details including ID and timestamps.
        
    Raises:
        HTTPException: If the template data is invalid or creation fails.
    """
    template = await CardManagementService.create_template(
        db=db,
        user_id=current_user.id,
        template_data=template_data.dict()
    )
    return template

@router.post("/{template_id}/versions", response_model=CardTemplateResponse)
async def create_template_version(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    template_id: int,
    updates: CardTemplateUpdate
) -> CardTemplate:
    """Create a new version of an existing template.
    
    Creates a new version while preserving the history. The current version becomes inactive
    and the new version becomes the active one.
    
    Args:
        template_id: ID of the template to version
        updates: Partial or complete template data to update in the new version
        
    Returns:
        The newly created template version
        
    Raises:
        HTTPException: If template not found or user doesn't own the template
    """
    # Verify template ownership
    template = await CardManagementService.get_template(db, template_id)
    if not template or template.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Template not found")
    
    new_version = await CardManagementService.create_template_version(
        db=db,
        template_id=template_id,
        updates=updates.dict(exclude_unset=True)
    )
    return new_version

@router.get("/{template_id}/history", response_model=List[CardTemplateHistory])
async def get_template_history(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    template_id: int
) -> List[CardTemplate]:
    """Get the version history of a template.
    
    Retrieves all versions of a template, ordered by version number.
    Includes both active and inactive versions.
    
    Args:
        template_id: ID of the template to get history for
        
    Returns:
        List of all template versions, ordered from oldest to newest
        
    Raises:
        HTTPException: If template not found or user doesn't own the template
    """
    # Verify template ownership
    template = await CardManagementService.get_template(db, template_id)
    if not template or template.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Template not found")
    
    history = await CardManagementService.get_template_history(
        db=db,
        template_id=template_id
    )
    return history

@router.get("/{template_id}/analytics", response_model=CardTemplateAnalytics)
async def get_template_analytics(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    template_id: int,
    time_range: Optional[int] = Query(30, description="Time range in days for analytics", ge=1, le=365)
) -> Dict:
    """Get analytics for a template.
    
    Retrieves usage statistics and performance metrics for a template over the specified time range.
    
    Args:
        template_id: ID of the template to get analytics for
        time_range: Number of days to analyze, defaults to 30 days
                   Must be between 1 and 365 days
        
    Returns:
        Analytics data including:
        - Total number of cards using this template
        - Total spend across all cards
        - Average monthly spend per card
        - Success rate of transactions
        - Usage count and last used timestamp
        
    Raises:
        HTTPException: If template not found or user doesn't own the template
    """
    # Verify template ownership
    template = await CardManagementService.get_template(db, template_id)
    if not template or template.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Template not found")
    
    analytics = await CardManagementService.get_template_analytics(
        db=db,
        template_id=template_id,
        time_range=time_range
    )
    return analytics

@router.get("/{template_id}", response_model=CardTemplateResponse)
async def get_template(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    template_id: int
) -> CardTemplate:
    """Get a specific template.
    
    Retrieves full details of a specific template including its current settings,
    version information, and usage statistics.
    
    Args:
        template_id: ID of the template to retrieve
        
    Returns:
        Complete template details including all settings and metadata
        
    Raises:
        HTTPException: If template not found or user doesn't own the template
    """
    template = await CardManagementService.get_template(db, template_id)
    if not template or template.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.get("/", response_model=List[CardTemplateResponse])
async def list_templates(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = Query(0, ge=0, description="Number of templates to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of templates to return"),
    active_only: bool = Query(True, description="Only show active template versions")
) -> List[CardTemplate]:
    """List all templates for the current user.
    
    Retrieves a paginated list of templates owned by the current user.
    Can filter to show only active template versions.
    
    Args:
        skip: Number of templates to skip for pagination
        limit: Maximum number of templates to return (1-1000)
        active_only: If true, only returns active template versions
        
    Returns:
        List of templates matching the query parameters
        
    Raises:
        HTTPException: If pagination parameters are invalid
    """
    templates = await CardManagementService.list_templates(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        active_only=active_only
    )
    return templates
