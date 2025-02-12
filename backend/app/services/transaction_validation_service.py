from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta, time
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from decimal import Decimal
import pytz

from app.models.ai_agent import AIAgent
from app.models.agent_transaction import AgentTransaction, RiskLevel, TransactionStatus
from app.models.agent_function import FunctionUsageStats

logger = logging.getLogger(__name__)

class ValidationRule:
    def __init__(self, name: str, description: str, validation_fn, risk_score: int):
        self.name = name
        self.description = description
        self.validation_fn = validation_fn
        self.risk_score = risk_score

class TransactionValidationService:
    def __init__(self):
        self.rules: Dict[str, ValidationRule] = {}
        self._register_default_rules()

    def _register_default_rules(self):
        """Register default validation rules"""
        self.register_rule(
            "spending_limit",
            "Check if transaction exceeds spending limits",
            self._validate_spending_limits,
            risk_score=40
        )
        
        self.register_rule(
            "merchant_category",
            "Validate merchant category restrictions",
            self._validate_merchant_category,
            risk_score=30
        )
        
        self.register_rule(
            "transaction_velocity",
            "Check transaction velocity and patterns",
            self._validate_transaction_velocity,
            risk_score=25
        )
        
        self.register_rule(
            "behavior_pattern",
            "Analyze agent behavior patterns",
            self._validate_behavior_pattern,
            risk_score=35
        )

        # Add new rules
        self.register_rule(
            "time_based",
            "Validate transaction timing and operating hours",
            self._validate_time_based,
            risk_score=20
        )

        self.register_rule(
            "geographic",
            "Validate transaction location patterns",
            self._validate_geographic,
            risk_score=30
        )

        self.register_rule(
            "sequence",
            "Validate transaction sequence and dependencies",
            self._validate_sequence,
            risk_score=25
        )

        self.register_rule(
            "conversation_context",
            "Validate conversation context and user intent",
            self._validate_conversation_context,
            risk_score=35
        )

    def register_rule(self, name: str, description: str, validation_fn, risk_score: int):
        """Register a new validation rule"""
        self.rules[name] = ValidationRule(name, description, validation_fn, risk_score)

    async def validate_transaction(
        self,
        db: AsyncSession,
        agent: AIAgent,
        amount: Decimal,
        merchant: str,
        merchant_category: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Validate a transaction request and calculate risk score.
        Returns validation results and risk assessment.
        """
        validation_results = {}
        total_risk_score = 0
        risk_factors = []
        requires_review = False

        # Run all validation rules
        for rule in self.rules.values():
            try:
                result = await rule.validation_fn(
                    db, agent, amount, merchant, merchant_category, context
                )
                validation_results[rule.name] = result
                
                if not result["valid"]:
                    total_risk_score += rule.risk_score
                    risk_factors.extend(result.get("risk_factors", []))
                    if result.get("requires_review", False):
                        requires_review = True
                        
            except Exception as e:
                logger.error(f"Error in validation rule {rule.name}: {str(e)}")
                validation_results[rule.name] = {
                    "valid": False,
                    "error": str(e),
                    "requires_review": True
                }
                requires_review = True

        # Calculate final risk level
        risk_level = self._calculate_risk_level(total_risk_score)

        return {
            "valid": total_risk_score < 70 and not requires_review,
            "risk_score": total_risk_score,
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "requires_review": requires_review,
            "validation_results": validation_results
        }

    async def _validate_spending_limits(
        self,
        db: AsyncSession,
        agent: AIAgent,
        amount: Decimal,
        merchant: str,
        merchant_category: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validate transaction against spending limits"""
        risk_factors = []
        
        # Check daily limit
        if agent.daily_spend_limit:
            new_daily_spend = agent.current_daily_spend + amount
            if new_daily_spend > agent.daily_spend_limit:
                risk_factors.append("daily_limit_exceeded")

        # Check monthly limit
        if agent.monthly_spend_limit:
            new_monthly_spend = agent.current_monthly_spend + amount
            if new_monthly_spend > agent.monthly_spend_limit:
                risk_factors.append("monthly_limit_exceeded")

        # Check transaction amount limit
        if agent.max_transaction_amount and amount > agent.max_transaction_amount:
            risk_factors.append("transaction_amount_exceeded")

        requires_review = amount > (agent.require_approval_above or Decimal('inf'))
        
        return {
            "valid": len(risk_factors) == 0,
            "risk_factors": risk_factors,
            "requires_review": requires_review
        }

    async def _validate_merchant_category(
        self,
        db: AsyncSession,
        agent: AIAgent,
        amount: Decimal,
        merchant: str,
        merchant_category: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validate merchant and category restrictions"""
        risk_factors = []
        
        # Check blocked categories
        if merchant_category in (agent.blocked_merchant_categories or []):
            risk_factors.append("blocked_category")

        # Check allowed categories
        if (agent.allowed_merchant_categories and 
            merchant_category not in agent.allowed_merchant_categories):
            risk_factors.append("category_not_allowed")

        # Check blocked merchants
        if merchant in (agent.blocked_merchants or []):
            risk_factors.append("blocked_merchant")

        # Check allowed merchants
        if agent.allowed_merchants and merchant not in agent.allowed_merchants:
            risk_factors.append("merchant_not_allowed")

        return {
            "valid": len(risk_factors) == 0,
            "risk_factors": risk_factors,
            "requires_review": "blocked_category" in risk_factors or "blocked_merchant" in risk_factors
        }

    async def _validate_transaction_velocity(
        self,
        db: AsyncSession,
        agent: AIAgent,
        amount: Decimal,
        merchant: str,
        merchant_category: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Check transaction velocity and patterns"""
        risk_factors = []
        
        # Get recent transactions (last hour)
        recent_query = select(func.count(AgentTransaction.id)).where(
            and_(
                AgentTransaction.agent_id == agent.id,
                AgentTransaction.created_at >= datetime.utcnow() - timedelta(hours=1)
            )
        )
        recent_count = await db.execute(recent_query)
        recent_count = recent_count.scalar() or 0

        # Get merchant frequency
        merchant_query = select(func.count(AgentTransaction.id)).where(
            and_(
                AgentTransaction.agent_id == agent.id,
                AgentTransaction.merchant_name == merchant,
                AgentTransaction.created_at >= datetime.utcnow() - timedelta(days=1)
            )
        )
        merchant_count = await db.execute(merchant_query)
        merchant_count = merchant_count.scalar() or 0

        # Check velocity thresholds
        if recent_count > 10:
            risk_factors.append("high_transaction_velocity")
        
        if merchant_count > 5:
            risk_factors.append("unusual_merchant_frequency")

        return {
            "valid": len(risk_factors) == 0,
            "risk_factors": risk_factors,
            "requires_review": len(risk_factors) > 1
        }

    async def _validate_behavior_pattern(
        self,
        db: AsyncSession,
        agent: AIAgent,
        amount: Decimal,
        merchant: str,
        merchant_category: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze agent behavior patterns"""
        risk_factors = []
        
        # Get average transaction amount
        avg_amount_query = select(func.avg(AgentTransaction.amount)).where(
            AgentTransaction.agent_id == agent.id
        )
        avg_amount = await db.execute(avg_amount_query)
        avg_amount = avg_amount.scalar() or amount

        # Get agent's success rate
        stats_query = select(FunctionUsageStats).where(
            FunctionUsageStats.agent_id == agent.id
        )
        stats = await db.execute(stats_query)
        stats = stats.scalar_one_or_none()

        # Check for anomalies
        if amount > (avg_amount * Decimal('3')):
            risk_factors.append("amount_anomaly")

        if stats and stats.call_count > 0:
            success_rate = stats.success_count / stats.call_count
            if success_rate < 0.7:
                risk_factors.append("low_success_rate")

        # Check context if provided
        if context:
            if not context.get("user_intent"):
                risk_factors.append("missing_user_intent")
            if not context.get("conversation_context"):
                risk_factors.append("missing_conversation_context")

        return {
            "valid": len(risk_factors) == 0,
            "risk_factors": risk_factors,
            "requires_review": "amount_anomaly" in risk_factors
        }

    async def _validate_time_based(
        self,
        db: AsyncSession,
        agent: AIAgent,
        amount: Decimal,
        merchant: str,
        merchant_category: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validate transaction timing and operating hours"""
        risk_factors = []
        now = datetime.now(pytz.UTC)
        
        # Check for transactions during unusual hours (e.g., 11 PM - 5 AM)
        current_hour = now.hour
        if current_hour >= 23 or current_hour < 5:
            risk_factors.append("unusual_hours")
        
        # Check for rapid successive transactions
        last_tx_query = select(AgentTransaction.created_at).where(
            AgentTransaction.agent_id == agent.id
        ).order_by(AgentTransaction.created_at.desc()).limit(1)
        last_tx = await db.execute(last_tx_query)
        last_tx = last_tx.scalar_one_or_none()
        
        if last_tx and (now - last_tx) < timedelta(minutes=1):
            risk_factors.append("rapid_succession")
            
        # Check merchant operating hours if available
        if context and context.get("merchant_hours"):
            merchant_hours = context["merchant_hours"]
            if not self._is_within_operating_hours(now, merchant_hours):
                risk_factors.append("outside_merchant_hours")
                
        return {
            "valid": len(risk_factors) == 0,
            "risk_factors": risk_factors,
            "requires_review": "outside_merchant_hours" in risk_factors
        }

    async def _validate_geographic(
        self,
        db: AsyncSession,
        agent: AIAgent,
        amount: Decimal,
        merchant: str,
        merchant_category: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validate transaction location patterns"""
        risk_factors = []
        
        if not context or not context.get("merchant_location"):
            risk_factors.append("missing_location_data")
            return {
                "valid": False,
                "risk_factors": risk_factors,
                "requires_review": True
            }
            
        current_location = context["merchant_location"]
        
        # Check for unusual location patterns
        recent_locations_query = select(AgentTransaction.merchant_location).where(
            and_(
                AgentTransaction.agent_id == agent.id,
                AgentTransaction.created_at >= datetime.utcnow() - timedelta(days=7)
            )
        )
        recent_locations = await db.execute(recent_locations_query)
        recent_locations = recent_locations.scalars().all()
        
        if recent_locations:
            if current_location not in recent_locations:
                risk_factors.append("unusual_location")
            
            # Check for impossible travel (transactions in different locations within short time)
            if len(recent_locations) > 1:
                last_location = recent_locations[-1]
                if last_location != current_location:
                    last_tx_time_query = select(AgentTransaction.created_at).where(
                        AgentTransaction.merchant_location == last_location
                    ).order_by(AgentTransaction.created_at.desc()).limit(1)
                    last_tx_time = await db.execute(last_tx_time_query)
                    last_tx_time = last_tx_time.scalar_one_or_none()
                    
                    if last_tx_time and (datetime.utcnow() - last_tx_time) < timedelta(hours=1):
                        risk_factors.append("impossible_travel")
        
        return {
            "valid": len(risk_factors) == 0,
            "risk_factors": risk_factors,
            "requires_review": "impossible_travel" in risk_factors
        }

    async def _validate_sequence(
        self,
        db: AsyncSession,
        agent: AIAgent,
        amount: Decimal,
        merchant: str,
        merchant_category: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validate transaction sequence and dependencies"""
        risk_factors = []
        
        if not context or not context.get("transaction_purpose"):
            return {"valid": True, "risk_factors": []}
            
        purpose = context["transaction_purpose"]
        
        # Check for required previous transactions
        if purpose == "hotel_payment":
            # Check if there was a hotel reservation first
            reservation_query = select(func.count(AgentTransaction.id)).where(
                and_(
                    AgentTransaction.agent_id == agent.id,
                    AgentTransaction.merchant_category == "hotel_reservation",
                    AgentTransaction.created_at >= datetime.utcnow() - timedelta(days=30)
                )
            )
            reservation_count = await db.execute(reservation_query)
            if not reservation_count.scalar_one():
                risk_factors.append("missing_reservation")
                
        # Check for duplicate subscriptions
        elif purpose == "subscription":
            subscription_query = select(func.count(AgentTransaction.id)).where(
                and_(
                    AgentTransaction.agent_id == agent.id,
                    AgentTransaction.merchant_name == merchant,
                    AgentTransaction.transaction_purpose == "subscription",
                    AgentTransaction.created_at >= datetime.utcnow() - timedelta(days=30)
                )
            )
            subscription_count = await db.execute(subscription_query)
            if subscription_count.scalar_one():
                risk_factors.append("duplicate_subscription")
        
        return {
            "valid": len(risk_factors) == 0,
            "risk_factors": risk_factors,
            "requires_review": len(risk_factors) > 0
        }

    async def _validate_conversation_context(
        self,
        db: AsyncSession,
        agent: AIAgent,
        amount: Decimal,
        merchant: str,
        merchant_category: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validate conversation context and user intent"""
        risk_factors = []
        
        if not context:
            risk_factors.append("missing_context")
            return {
                "valid": False,
                "risk_factors": risk_factors,
                "requires_review": True
            }
        
        # Validate user intent clarity
        user_intent = context.get("user_intent", "")
        if not user_intent or len(user_intent.split()) < 3:
            risk_factors.append("unclear_user_intent")
            
        # Check for context completeness
        required_context_fields = [
            "conversation_id",
            "user_intent",
            "transaction_purpose",
            "previous_messages"
        ]
        
        missing_fields = [
            field for field in required_context_fields 
            if not context.get(field)
        ]
        
        if missing_fields:
            risk_factors.append(f"missing_context_fields:{','.join(missing_fields)}")
            
        # Validate intent-amount correlation
        if "budget_mentioned" in context:
            mentioned_budget = Decimal(str(context["budget_mentioned"]))
            if amount > mentioned_budget * Decimal('1.2'):  # 20% tolerance
                risk_factors.append("amount_exceeds_discussed")
                
        # Check conversation flow
        if context.get("previous_messages"):
            if len(context["previous_messages"]) < 2:
                risk_factors.append("insufficient_conversation")
                
            # Check if price was discussed
            price_discussed = any(
                "price" in msg.lower() or "cost" in msg.lower() 
                for msg in context["previous_messages"]
            )
            if not price_discussed:
                risk_factors.append("price_not_discussed")
        
        return {
            "valid": len(risk_factors) == 0,
            "risk_factors": risk_factors,
            "requires_review": len(risk_factors) > 2  # Require review if multiple issues
        }

    def _is_within_operating_hours(self, current_time: datetime, operating_hours: Dict) -> bool:
        """Helper method to check if current time is within merchant operating hours"""
        day_of_week = current_time.strftime('%A').lower()
        if day_of_week not in operating_hours:
            return True  # If no hours specified, assume open
            
        hours = operating_hours[day_of_week]
        if not hours:
            return False  # Closed on this day
            
        open_time = datetime.strptime(hours["open"], "%H:%M").time()
        close_time = datetime.strptime(hours["close"], "%H:%M").time()
        current_time = current_time.time()
        
        return open_time <= current_time <= close_time

    def _calculate_risk_level(self, risk_score: int) -> RiskLevel:
        """Calculate risk level based on risk score"""
        if risk_score < 30:
            return RiskLevel.LOW
        elif risk_score < 50:
            return RiskLevel.MEDIUM
        elif risk_score < 70:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL

# Create singleton instance
transaction_validator = TransactionValidationService() 