from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from uuid import uuid4
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, aliased

from app.models.virtual_card import VirtualCard, CardStatus
from app.models.card_template import CardTemplate
from app.services.virtual_card_service import VirtualCardService
from app.core.stripe import stripe_client

class CardManagementService:
    @classmethod
    async def create_template(
        cls,
        db: AsyncSession,
        user_id: int,
        template_data: Dict
    ) -> CardTemplate:
        """Create a new card template."""
        template = CardTemplate(
            user_id=user_id,
            version=1,
            is_active=True,
            **template_data
        )
        db.add(template)
        await db.commit()
        await db.refresh(template)
        return template

    @classmethod
    async def create_template_version(
        cls,
        db: AsyncSession,
        template_id: int,
        updates: Dict
    ) -> CardTemplate:
        """Create a new version of an existing template."""
        # Get current template
        current = await db.get(CardTemplate, template_id)
        if not current:
            raise ValueError("Template not found")

        # Deactivate current version
        current.is_active = False
        
        # Create new version
        new_version = CardTemplate(
            user_id=current.user_id,
            name=current.name,
            description=current.description,
            version=current.version + 1,
            parent_version_id=current.id,
            is_active=True
        )

        # Copy existing settings
        for key, value in current.to_dict().items():
            if hasattr(new_version, key) and key not in ['id', 'version', 'parent_version_id', 'is_active']:
                setattr(new_version, key, value)

        # Apply updates
        for key, value in updates.items():
            if hasattr(new_version, key):
                setattr(new_version, key, value)

        db.add(new_version)
        await db.commit()
        await db.refresh(new_version)
        return new_version

    @classmethod
    async def get_template_history(
        cls,
        db: AsyncSession,
        template_id: int
    ) -> List[CardTemplate]:
        """Get the version history of a template."""
        template = await db.get(CardTemplate, template_id)
        if not template:
            raise ValueError("Template not found")

        # Get all versions
        versions = [template]
        current = template
        
        # Get parent versions
        while current.parent_version_id:
            current = await db.get(CardTemplate, current.parent_version_id)
            versions.append(current)

        return sorted(versions, key=lambda x: x.version)

    @classmethod
    async def get_template_analytics(
        cls,
        db: AsyncSession,
        template_id: int,
        time_range: Optional[int] = 30  # days
    ) -> Dict:
        """Get analytics for a template."""
        template = await db.get(CardTemplate, template_id)
        if not template:
            raise ValueError("Template not found")

        # Time range filter
        start_date = datetime.utcnow() - timedelta(days=time_range)

        # Get cards using this template
        cards_query = select(VirtualCard).where(
            and_(
                VirtualCard.template_id == template_id,
                VirtualCard.created_at >= start_date
            )
        )
        result = await db.execute(cards_query)
        cards = result.scalars().all()

        # Calculate analytics
        total_cards = len(cards)
        total_spend = sum(card.total_spend for card in cards if card.total_spend)
        avg_monthly_spend = total_spend / total_cards if total_cards > 0 else 0
        success_rate = sum(1 for card in cards if card.last_transaction_status == 'success') / total_cards * 100 if total_cards > 0 else 100

        # Update template analytics
        template.usage_count += 1
        template.total_cards = total_cards
        template.avg_monthly_spend = avg_monthly_spend
        template.success_rate = success_rate
        template.last_used_at = datetime.utcnow()

        await db.commit()

        return {
            "total_cards": total_cards,
            "total_spend": total_spend,
            "avg_monthly_spend": avg_monthly_spend,
            "success_rate": success_rate,
            "usage_count": template.usage_count,
            "last_used": template.last_used_at
        }

    @classmethod
    async def apply_template_to_cards(
        cls,
        db: AsyncSession,
        template_id: int,
        card_ids: List[int]
    ) -> Tuple[List[VirtualCard], List[Dict]]:
        """Apply a template to multiple cards."""
        # Get template
        template = await db.get(CardTemplate, template_id)
        if not template:
            raise ValueError("Template not found")

        # Get cards
        cards = []
        errors = []
        for card_id in card_ids:
            card = await db.get(VirtualCard, card_id)
            if not card:
                errors.append({"card_id": card_id, "error": "Card not found"})
                continue
            if card.user_id != template.user_id:
                errors.append({"card_id": card_id, "error": "Card belongs to different user"})
                continue
            
            try:
                card.apply_template(template)
                cards.append(card)
            except Exception as e:
                errors.append({"card_id": card_id, "error": str(e)})

        if cards:
            await db.commit()
        
        return cards, errors

    @classmethod
    async def bulk_create_cards(
        cls,
        db: AsyncSession,
        user_id: int,
        template_id: Optional[int],
        count: int,
        base_name: str,
        **card_settings
    ) -> Tuple[List[VirtualCard], List[Dict]]:
        """Create multiple cards in bulk."""
        batch_id = str(uuid4())
        cards = []
        errors = []

        # Get template if provided
        template = None
        if template_id:
            template = await db.get(CardTemplate, template_id)
            if not template or template.user_id != user_id:
                raise ValueError("Invalid template")

        for i in range(count):
            try:
                # Create card
                card = await VirtualCardService.create_card(
                    db=db,
                    user_id=user_id,
                    name=f"{base_name} {i+1}",
                    **card_settings
                )
                
                # Apply template if provided
                if template:
                    card.apply_template(template)
                
                card.batch_id = batch_id
                cards.append(card)
                
            except Exception as e:
                errors.append({
                    "index": i,
                    "error": str(e)
                })

        if cards:
            await db.commit()
            for card in cards:
                await db.refresh(card)

        return cards, errors

    @classmethod
    async def clone_card(
        cls,
        db: AsyncSession,
        card_id: int,
        count: int = 1,
        name_prefix: Optional[str] = None
    ) -> Tuple[List[VirtualCard], List[Dict]]:
        """Clone a card one or multiple times."""
        # Get source card
        source_card = await db.get(VirtualCard, card_id)
        if not source_card:
            raise ValueError("Source card not found")

        batch_id = str(uuid4())
        clones = []
        errors = []

        for i in range(count):
            try:
                clone = source_card.clone()
                if name_prefix:
                    clone.name = f"{name_prefix} {i+1}"
                clone.batch_id = batch_id
                
                # Generate new card details via Stripe
                stripe_card = await stripe_client.create_virtual_card()
                clone.card_number = stripe_card.number
                clone.cvv = stripe_card.cvv
                clone.stripe_card_id = stripe_card.id
                
                db.add(clone)
                clones.append(clone)
                
            except Exception as e:
                errors.append({
                    "index": i,
                    "error": str(e)
                })

        if clones:
            await db.commit()
            for clone in clones:
                await db.refresh(clone)

        return clones, errors

    @classmethod
    async def bulk_update_cards(
        cls,
        db: AsyncSession,
        card_ids: List[int],
        updates: Dict
    ) -> Tuple[List[VirtualCard], List[Dict]]:
        """Update multiple cards with the same settings."""
        cards = []
        errors = []

        for card_id in card_ids:
            try:
                card = await db.get(VirtualCard, card_id)
                if not card:
                    raise ValueError("Card not found")
                
                # Apply updates
                for key, value in updates.items():
                    if hasattr(card, key):
                        setattr(card, key, value)
                
                cards.append(card)
                
            except Exception as e:
                errors.append({
                    "card_id": card_id,
                    "error": str(e)
                })

        if cards:
            await db.commit()
            for card in cards:
                await db.refresh(card)

        return cards, errors

    @classmethod
    async def bulk_freeze_cards(
        cls,
        db: AsyncSession,
        card_ids: List[int],
        reason: str,
        duration: Optional[int] = None
    ) -> Tuple[List[VirtualCard], List[Dict]]:
        """Freeze multiple cards."""
        cards = []
        errors = []

        for card_id in card_ids:
            try:
                card = await db.get(VirtualCard, card_id)
                if not card:
                    raise ValueError("Card not found")
                
                card.freeze(reason, duration)
                cards.append(card)
                
            except Exception as e:
                errors.append({
                    "card_id": card_id,
                    "error": str(e)
                })

        if cards:
            await db.commit()
            for card in cards:
                await db.refresh(card)

        return cards, errors

    @classmethod
    async def process_auto_unfreezes(
        cls,
        db: AsyncSession
    ) -> Tuple[List[VirtualCard], List[Dict]]:
        """Process cards that should be automatically unfrozen."""
        now = datetime.utcnow()
        
        # Find cards to unfreeze
        query = select(VirtualCard).where(
            and_(
                VirtualCard.status == CardStatus.FROZEN,
                VirtualCard.auto_unfreeze_at <= now
            )
        )
        result = await db.execute(query)
        cards = result.scalars().all()
        
        unfrozen = []
        errors = []
        
        for card in cards:
            try:
                card.unfreeze()
                unfrozen.append(card)
            except Exception as e:
                errors.append({
                    "card_id": card.id,
                    "error": str(e)
                })

        if unfrozen:
            await db.commit()

        return unfrozen, errors

    @classmethod
    async def get_template(
        cls,
        db: AsyncSession,
        template_id: int
    ) -> Optional[CardTemplate]:
        """Get a specific template."""
        return await db.get(CardTemplate, template_id)

    @classmethod
    async def list_templates(
        cls,
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True
    ) -> List[CardTemplate]:
        """List templates for a user."""
        query = select(CardTemplate).where(
            CardTemplate.user_id == user_id
        )
        
        if active_only:
            query = query.where(CardTemplate.is_active == True)
            
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    @classmethod
    async def process_auto_renewals(
        cls,
        db: AsyncSession
    ) -> Tuple[List[VirtualCard], List[Dict]]:
        """Process cards that need automatic renewal."""
        now = datetime.utcnow()
        expiry_threshold = now + timedelta(days=7)  # Renew cards expiring within 7 days
        
        # Find cards to renew
        query = select(VirtualCard).where(
            and_(
                VirtualCard.auto_renewal_enabled == True,
                VirtualCard.status == CardStatus.ACTIVE,
                VirtualCard.expiry_year <= expiry_threshold.year,
                VirtualCard.expiry_month <= expiry_threshold.month
            )
        )
        result = await db.execute(query)
        cards = result.scalars().all()
        
        renewed = []
        errors = []
        
        for card in cards:
            try:
                # Create new card via Stripe
                stripe_card = await stripe_client.create_virtual_card()
                
                # Update card details
                card.card_number = stripe_card.number
                card.cvv = stripe_card.cvv
                card.stripe_card_id = stripe_card.id
                card.expiry_month = stripe_card.exp_month
                card.expiry_year = stripe_card.exp_year
                
                renewed.append(card)
                
            except Exception as e:
                errors.append({
                    "card_id": card.id,
                    "error": str(e)
                })

        if renewed:
            await db.commit()

        return renewed, errors
