from typing import List, Optional, Dict, Any
import re
from fuzzywuzzy import fuzz
from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.merchant_category import MerchantCategory

class MerchantCategoryService:
    @staticmethod
    def _normalize_text(text: str) -> str:
        """Normalize text for better matching."""
        # Convert to lowercase
        text = text.lower()
        # Remove special characters
        text = re.sub(r'[^a-z0-9\s]', '', text)
        # Remove extra whitespace
        text = ' '.join(text.split())
        return text

    @staticmethod
    def _calculate_similarity(text1: str, text2: str) -> int:
        """Calculate similarity between two texts."""
        return fuzz.ratio(
            MerchantCategoryService._normalize_text(text1),
            MerchantCategoryService._normalize_text(text2)
        )

    @classmethod
    async def get_category_by_code(
        cls,
        db: AsyncSession,
        code: str
    ) -> Optional[MerchantCategory]:
        """Get a category by its code."""
        result = await db.execute(
            select(MerchantCategory).where(MerchantCategory.code == code)
        )
        return result.scalars().first()

    @classmethod
    async def get_category_by_mcc(
        cls,
        db: AsyncSession,
        mcc: str
    ) -> Optional[MerchantCategory]:
        """Get a category by MCC code."""
        result = await db.execute(
            select(MerchantCategory).where(
                MerchantCategory.mcc_codes.contains([mcc])
            )
        )
        return result.scalars().first()

    @classmethod
    async def map_merchant_to_category(
        cls,
        db: AsyncSession,
        merchant_name: str,
        merchant_description: Optional[str] = None,
        mcc: Optional[str] = None,
        transaction_amount: Optional[float] = None,
        payment_method: Optional[str] = None,
        country_code: Optional[str] = None,
    ) -> Optional[MerchantCategory]:
        """
        Map a merchant to the most appropriate category using various signals.
        Uses a weighted scoring system considering multiple factors.
        """
        # Start with MCC if available
        if mcc:
            mcc_category = await cls.get_category_by_mcc(db, mcc)
            if mcc_category:
                return mcc_category

        # Prepare search text
        search_text = merchant_name
        if merchant_description:
            search_text = f"{search_text} {merchant_description}"
        search_text = cls._normalize_text(search_text)
        
        # Get all categories for scoring
        result = await db.execute(select(MerchantCategory))
        categories = result.scalars().all()
        
        best_match = None
        best_score = 0
        
        for category in categories:
            score = 0
            max_keyword_score = 0
            
            # Check keywords
            for keyword in category.keywords:
                keyword_score = cls._calculate_similarity(keyword, search_text)
                max_keyword_score = max(max_keyword_score, keyword_score)
            
            # Keyword matching (40% weight)
            score += max_keyword_score * 0.4
            
            # Check for excluded words (immediate disqualification)
            has_excluded_word = any(
                word in search_text 
                for word in category.excluded_words
            )
            if has_excluded_word:
                continue
            
            # Amount range check (20% weight)
            if transaction_amount and category.typical_amount_range:
                min_amount = category.typical_amount_range.get("min")
                max_amount = category.typical_amount_range.get("max")
                if min_amount and max_amount:
                    if min_amount <= transaction_amount <= max_amount:
                        score += 20
                    elif transaction_amount < min_amount * 0.5 or transaction_amount > max_amount * 2:
                        score -= 10

            # Payment method match (20% weight)
            if payment_method and category.common_payment_methods:
                if payment_method in category.common_payment_methods:
                    score += 20

            # Geographic relevance (20% weight)
            if country_code and category.restricted_jurisdictions:
                if country_code in category.restricted_jurisdictions:
                    continue
                score += 20

            # Update best match if this category scored higher
            if score > best_score:
                best_score = score
                best_match = category

        return best_match if best_score >= 40 else None  # Require at least 40% confidence

    @classmethod
    async def validate_category_rules(
        cls,
        db: AsyncSession,
        category: MerchantCategory,
        amount: float,
        payment_method: str,
        country_code: str,
    ) -> Dict[str, Any]:
        """
        Validate transaction against category rules.
        Returns a dict with validation results and any warnings/restrictions.
        """
        result = {
            "allowed": True,
            "warnings": [],
            "restrictions": [],
            "required_actions": [],
        }

        # Check amount range
        if category.typical_amount_range:
            min_amount = category.typical_amount_range.get("min")
            max_amount = category.typical_amount_range.get("max")
            if min_amount and amount < min_amount:
                result["warnings"].append(f"Amount below typical minimum for this category (${min_amount})")
            if max_amount and amount > max_amount:
                result["warnings"].append(f"Amount above typical maximum for this category (${max_amount})")

        # Check payment method
        if category.common_payment_methods and payment_method not in category.common_payment_methods:
            result["warnings"].append(f"Unusual payment method for this category")

        # Check geographic restrictions
        if category.restricted_jurisdictions and country_code in category.restricted_jurisdictions:
            result["allowed"] = False
            result["restrictions"].append(f"Category restricted in {country_code}")

        # Check risk level and verification requirements
        if category.is_high_risk:
            result["warnings"].append("High-risk merchant category")
            
        if category.requires_additional_verification:
            result["required_actions"].append("Additional verification required")

        # Check AML risk level
        if category.aml_risk_level == "high":
            result["warnings"].append("High AML risk category")
            result["required_actions"].append("Enhanced due diligence required")

        return result

    @classmethod
    async def get_category_hierarchy(
        cls,
        db: AsyncSession,
        category: MerchantCategory
    ) -> List[MerchantCategory]:
        """Get the full hierarchy of a category from root to leaf."""
        hierarchy = []
        current = category
        
        while current:
            hierarchy.insert(0, current)
            if current.parent_id:
                result = await db.execute(
                    select(MerchantCategory).where(MerchantCategory.id == current.parent_id)
                )
                current = result.scalars().first()
            else:
                break
        
        return hierarchy
