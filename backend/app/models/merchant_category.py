from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from typing import List, Optional

from . import Base

class MerchantCategory(Base):
    __tablename__ = "merchant_categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)  # e.g., "5812" or "food_and_drink.restaurants"
    name = Column(String, nullable=False)  # e.g., "Restaurants"
    description = Column(String)
    
    # Hierarchical structure
    parent_id = Column(Integer, ForeignKey("merchant_categories.id"), nullable=True)
    path = Column(String, nullable=False)  # e.g., "retail/food_and_drink/restaurants"
    level = Column(Integer, nullable=False)  # 0 for root categories
    
    # Legacy MCC mapping
    mcc_codes = Column(JSON, default=list)  # List of related MCC codes
    
    # Modern category attributes
    is_high_risk = Column(Boolean, default=False)
    requires_additional_verification = Column(Boolean, default=False)
    allowed_card_schemes = Column(JSON, default=list)  # ["visa", "mastercard", etc.]
    
    # Metadata for smart categorization
    keywords = Column(JSON, default=list)  # Keywords for fuzzy matching
    similar_words = Column(JSON, default=list)  # Similar words for better matching
    excluded_words = Column(JSON, default=list)  # Words that indicate it's NOT this category
    
    # Common transaction patterns
    typical_amount_range = Column(JSON, default=dict)  # {"min": 10, "max": 1000}
    typical_frequency = Column(String)  # "daily", "weekly", "monthly"
    common_payment_methods = Column(JSON, default=list)  # ["card_present", "online", etc.]
    
    # Regulatory and compliance
    restricted_jurisdictions = Column(JSON, default=list)  # Countries where category is restricted
    required_licenses = Column(JSON, default=list)  # Required business licenses
    aml_risk_level = Column(String)  # "low", "medium", "high"
    
    # Relationships
    parent = relationship("MerchantCategory", remote_side=[id], backref="subcategories")

    def __repr__(self):
        return f"<MerchantCategory {self.code}: {self.name}>"
