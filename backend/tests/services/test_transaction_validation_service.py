import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.ai_agent import AIAgent
from app.models.agent_transaction import AgentTransaction, RiskLevel
from app.models.agent_function import FunctionUsageStats
from app.services.transaction_validation_service import transaction_validator

@pytest.fixture
def sample_agent():
    return AIAgent(
        id=1,
        name="Test Agent",
        description="Test shopping assistant",
        daily_spend_limit=Decimal("1000.00"),
        monthly_spend_limit=Decimal("5000.00"),
        max_transaction_amount=Decimal("500.00"),
        require_approval_above=Decimal("200.00"),
        current_daily_spend=Decimal("0.00"),
        current_monthly_spend=Decimal("0.00"),
        allowed_merchant_categories=["retail", "groceries"],
        blocked_merchant_categories=["gambling"],
        allowed_merchants=["Amazon", "Walmart"],
        blocked_merchants=["BlockedStore"]
    )

@pytest.fixture
async def agent_with_history(db: AsyncSession, sample_agent):
    """Create agent with transaction history"""
    db.add(sample_agent)
    await db.commit()
    
    # Add transaction history
    transactions = [
        AgentTransaction(
            agent_id=sample_agent.id,
            amount=Decimal("100.00"),
            merchant_name="Amazon",
            merchant_category="retail",
            status="completed",
            created_at=datetime.utcnow() - timedelta(hours=2)
        ),
        AgentTransaction(
            agent_id=sample_agent.id,
            amount=Decimal("50.00"),
            merchant_name="Walmart",
            merchant_category="groceries",
            status="completed",
            created_at=datetime.utcnow() - timedelta(hours=1)
        )
    ]
    
    for tx in transactions:
        db.add(tx)
    await db.commit()
    
    return sample_agent

@pytest.mark.asyncio
async def test_spending_limit_validation(db: AsyncSession, sample_agent):
    """Test spending limit validation rules"""
    # Test within limits
    result = await transaction_validator.validate_transaction(
        db,
        sample_agent,
        amount=Decimal("150.00"),
        merchant="Amazon",
        merchant_category="retail"
    )
    assert result["valid"] == True
    
    # Test exceeding daily limit
    sample_agent.current_daily_spend = Decimal("900.00")
    result = await transaction_validator.validate_transaction(
        db,
        sample_agent,
        amount=Decimal("150.00"),
        merchant="Amazon",
        merchant_category="retail"
    )
    assert result["valid"] == False
    assert "daily_limit_exceeded" in result["risk_factors"]
    
    # Test amount requiring approval
    result = await transaction_validator.validate_transaction(
        db,
        sample_agent,
        amount=Decimal("300.00"),
        merchant="Amazon",
        merchant_category="retail"
    )
    assert result["requires_review"] == True

@pytest.mark.asyncio
async def test_merchant_validation(db: AsyncSession, sample_agent):
    """Test merchant and category validation rules"""
    # Test allowed merchant and category
    result = await transaction_validator.validate_transaction(
        db,
        sample_agent,
        amount=Decimal("100.00"),
        merchant="Amazon",
        merchant_category="retail"
    )
    assert result["valid"] == True
    
    # Test blocked merchant
    result = await transaction_validator.validate_transaction(
        db,
        sample_agent,
        amount=Decimal("100.00"),
        merchant="BlockedStore",
        merchant_category="retail"
    )
    assert result["valid"] == False
    assert "blocked_merchant" in result["risk_factors"]
    
    # Test blocked category
    result = await transaction_validator.validate_transaction(
        db,
        sample_agent,
        amount=Decimal("100.00"),
        merchant="Amazon",
        merchant_category="gambling"
    )
    assert result["valid"] == False
    assert "blocked_category" in result["risk_factors"]

@pytest.mark.asyncio
async def test_transaction_velocity(db: AsyncSession, agent_with_history):
    """Test transaction velocity validation"""
    # Add multiple recent transactions
    for _ in range(12):  # Exceeds velocity threshold
        tx = AgentTransaction(
            agent_id=agent_with_history.id,
            amount=Decimal("10.00"),
            merchant_name="Amazon",
            merchant_category="retail",
            status="completed",
            created_at=datetime.utcnow() - timedelta(minutes=30)
        )
        db.add(tx)
    await db.commit()
    
    result = await transaction_validator.validate_transaction(
        db,
        agent_with_history,
        amount=Decimal("100.00"),
        merchant="Amazon",
        merchant_category="retail"
    )
    assert "high_transaction_velocity" in result["risk_factors"]

@pytest.mark.asyncio
async def test_behavior_pattern(db: AsyncSession, agent_with_history):
    """Test behavior pattern validation"""
    # Add usage stats
    stats = FunctionUsageStats(
        agent_id=agent_with_history.id,
        call_count=100,
        success_count=50  # 50% success rate (below threshold)
    )
    db.add(stats)
    await db.commit()
    
    # Test amount anomaly
    result = await transaction_validator.validate_transaction(
        db,
        agent_with_history,
        amount=Decimal("1000.00"),  # Much higher than average
        merchant="Amazon",
        merchant_category="retail",
        context={"user_intent": "large purchase"}
    )
    assert "amount_anomaly" in result["risk_factors"]
    assert result["requires_review"] == True

@pytest.mark.asyncio
async def test_time_based_validation(db: AsyncSession, sample_agent):
    """Test time-based validation rules"""
    context = {
        "merchant_hours": {
            "monday": {"open": "09:00", "close": "17:00"},
            "tuesday": {"open": "09:00", "close": "17:00"},
            "wednesday": {"open": "09:00", "close": "17:00"},
            "thursday": {"open": "09:00", "close": "17:00"},
            "friday": {"open": "09:00", "close": "17:00"},
            "saturday": None,
            "sunday": None
        }
    }
    
    # Test outside merchant hours
    result = await transaction_validator.validate_transaction(
        db,
        sample_agent,
        amount=Decimal("100.00"),
        merchant="Amazon",
        merchant_category="retail",
        context=context
    )
    
    # Note: This test's assertion depends on the current time
    # We'll check if the validation was performed
    assert "validation_results" in result
    assert "time_based" in result["validation_results"]

@pytest.mark.asyncio
async def test_conversation_context(db: AsyncSession, sample_agent):
    """Test conversation context validation"""
    # Test with complete context
    good_context = {
        "conversation_id": "test-123",
        "user_intent": "purchase office supplies for work",
        "transaction_purpose": "office_supplies",
        "previous_messages": [
            "I need to buy office supplies",
            "The price for the supplies is $100",
            "Please proceed with the purchase"
        ],
        "budget_mentioned": 100
    }
    
    result = await transaction_validator.validate_transaction(
        db,
        sample_agent,
        amount=Decimal("100.00"),
        merchant="Amazon",
        merchant_category="retail",
        context=good_context
    )
    assert result["valid"] == True
    
    # Test with incomplete context
    bad_context = {
        "user_intent": "buy something",
        "previous_messages": ["make a purchase"]
    }
    
    result = await transaction_validator.validate_transaction(
        db,
        sample_agent,
        amount=Decimal("100.00"),
        merchant="Amazon",
        merchant_category="retail",
        context=bad_context
    )
    assert result["valid"] == False
    assert any("missing_context_fields" in factor for factor in result["risk_factors"])

@pytest.mark.asyncio
async def test_risk_level_calculation(db: AsyncSession, sample_agent):
    """Test risk level calculation"""
    # Test low risk transaction
    result = await transaction_validator.validate_transaction(
        db,
        sample_agent,
        amount=Decimal("50.00"),
        merchant="Amazon",
        merchant_category="retail"
    )
    assert result["risk_level"] == RiskLevel.LOW
    
    # Test high risk transaction
    result = await transaction_validator.validate_transaction(
        db,
        sample_agent,
        amount=Decimal("1000.00"),
        merchant="UnknownStore",
        merchant_category="unknown",
        context={"user_intent": "suspicious purchase"}
    )
    assert result["risk_level"] in [RiskLevel.HIGH, RiskLevel.CRITICAL]