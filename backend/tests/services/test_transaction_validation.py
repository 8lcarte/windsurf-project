import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from app.services.transaction_validation_service import TransactionValidationService
from app.models.transaction import Transaction
from app.models.ai_agent import AIAgent
from app.models.merchant_category import MerchantCategory
from app.core.exceptions import TransactionValidationError

@pytest.fixture
def sample_agent():
    return AIAgent(
        id=1,
        name="Shopping Assistant",
        description="AI assistant for shopping tasks",
        daily_spend_limit=Decimal("1000.00"),
        monthly_spend_limit=Decimal("5000.00"),
        current_daily_spend=Decimal("200.00"),
        current_monthly_spend=Decimal("800.00"),
        allowed_merchant_categories=["retail", "groceries"],
        blocked_merchant_categories=["gambling"],
        allowed_merchants=["Amazon", "Walmart"],
        blocked_merchants=["BlockedStore"],
        require_approval_above=Decimal("200.00"),
        max_transaction_amount=Decimal("500.00")
    )

@pytest.fixture
def sample_transaction():
    return Transaction(
        id=1,
        agent_id=1,
        amount=Decimal("150.00"),
        merchant="Amazon",
        merchant_category="retail",
        status="pending",
        created_at=datetime.utcnow()
    )

@pytest.fixture
def validation_service():
    return TransactionValidationService()

async def test_basic_validation(validation_service, sample_agent, sample_transaction):
    """Test basic transaction validation rules"""
    # Valid transaction
    result = await validation_service.validate_transaction(sample_transaction, sample_agent)
    assert result.is_valid
    assert result.risk_score < 0.5
    
    # Invalid amount (exceeds max)
    invalid_tx = sample_transaction.copy()
    invalid_tx.amount = Decimal("600.00")
    with pytest.raises(TransactionValidationError) as exc_info:
        await validation_service.validate_transaction(invalid_tx, sample_agent)
    assert "exceeds maximum transaction amount" in str(exc_info.value)

async def test_merchant_validation(validation_service, sample_agent, sample_transaction):
    """Test merchant-related validation rules"""
    # Blocked merchant
    blocked_tx = sample_transaction.copy()
    blocked_tx.merchant = "BlockedStore"
    with pytest.raises(TransactionValidationError) as exc_info:
        await validation_service.validate_transaction(blocked_tx, sample_agent)
    assert "merchant is blocked" in str(exc_info.value)
    
    # Unknown merchant
    unknown_tx = sample_transaction.copy()
    unknown_tx.merchant = "UnknownStore"
    result = await validation_service.validate_transaction(unknown_tx, sample_agent)
    assert result.is_valid
    assert result.risk_score > 0.3  # Higher risk for unknown merchant

async def test_category_validation(validation_service, sample_agent, sample_transaction):
    """Test merchant category validation"""
    # Blocked category
    blocked_cat_tx = sample_transaction.copy()
    blocked_cat_tx.merchant_category = "gambling"
    with pytest.raises(TransactionValidationError) as exc_info:
        await validation_service.validate_transaction(blocked_cat_tx, sample_agent)
    assert "category is blocked" in str(exc_info.value)
    
    # Unknown category
    unknown_cat_tx = sample_transaction.copy()
    unknown_cat_tx.merchant_category = "unknown"
    result = await validation_service.validate_transaction(unknown_cat_tx, sample_agent)
    assert result.is_valid
    assert result.risk_score > 0.3  # Higher risk for unknown category

async def test_spending_limits(validation_service, sample_agent, sample_transaction):
    """Test spending limit validations"""
    # Would exceed daily limit
    high_amount_tx = sample_transaction.copy()
    high_amount_tx.amount = Decimal("900.00")  # Current daily spend is 200
    with pytest.raises(TransactionValidationError) as exc_info:
        await validation_service.validate_transaction(high_amount_tx, sample_agent)
    assert "would exceed daily spending limit" in str(exc_info.value)
    
    # Would exceed monthly limit
    monthly_limit_tx = sample_transaction.copy()
    monthly_limit_tx.amount = Decimal("4500.00")  # Current monthly spend is 800
    with pytest.raises(TransactionValidationError) as exc_info:
        await validation_service.validate_transaction(monthly_limit_tx, sample_agent)
    assert "would exceed monthly spending limit" in str(exc_info.value)

async def test_approval_requirements(validation_service, sample_agent, sample_transaction):
    """Test approval requirement thresholds"""
    # Transaction requiring approval
    approval_tx = sample_transaction.copy()
    approval_tx.amount = Decimal("250.00")  # Above require_approval_above threshold
    result = await validation_service.validate_transaction(approval_tx, sample_agent)
    assert result.is_valid
    assert result.requires_approval
    assert result.approval_reason == "Amount exceeds approval threshold"

async def test_risk_scoring(validation_service, sample_agent, sample_transaction):
    """Test risk score calculation"""
    # Base case - known merchant, normal amount
    result = await validation_service.validate_transaction(sample_transaction, sample_agent)
    base_risk = result.risk_score
    
    # Higher amount
    high_amount_tx = sample_transaction.copy()
    high_amount_tx.amount = Decimal("400.00")
    result = await validation_service.validate_transaction(high_amount_tx, sample_agent)
    assert result.risk_score > base_risk
    
    # Unknown merchant
    unknown_merchant_tx = sample_transaction.copy()
    unknown_merchant_tx.merchant = "NewStore"
    result = await validation_service.validate_transaction(unknown_merchant_tx, sample_agent)
    assert result.risk_score > base_risk

async def test_velocity_checks(validation_service, sample_agent, sample_transaction):
    """Test transaction velocity checks"""
    # Create recent transaction history
    recent_transactions = [
        Transaction(
            id=i,
            agent_id=1,
            amount=Decimal("100.00"),
            merchant="Amazon",
            status="completed",
            created_at=datetime.utcnow() - timedelta(minutes=5*i)
        ) for i in range(1, 6)  # 5 transactions in last 25 minutes
    ]
    
    # Test velocity check
    result = await validation_service.validate_transaction(
        sample_transaction,
        sample_agent,
        recent_transactions=recent_transactions
    )
    assert result.is_valid
    assert result.risk_score > 0.4  # Higher risk due to high velocity
    assert "High transaction velocity" in result.risk_factors

async def test_pattern_analysis(validation_service, sample_agent, sample_transaction):
    """Test transaction pattern analysis"""
    # Create transaction history with pattern
    pattern_transactions = [
        Transaction(
            id=i,
            agent_id=1,
            amount=Decimal("100.00"),
            merchant="Amazon",
            status="completed",
            created_at=datetime.utcnow() - timedelta(days=i)
        ) for i in range(1, 8)  # Daily transactions for a week
    ]
    
    # Transaction breaking pattern
    unusual_tx = sample_transaction.copy()
    unusual_tx.amount = Decimal("300.00")  # Unusual amount
    unusual_tx.merchant = "NewStore"  # Different merchant
    
    result = await validation_service.validate_transaction(
        unusual_tx,
        sample_agent,
        recent_transactions=pattern_transactions
    )
    assert result.is_valid
    assert result.risk_score > 0.5  # Higher risk due to pattern deviation
    assert "Unusual transaction pattern" in result.risk_factors

async def test_composite_risk_factors(validation_service, sample_agent, sample_transaction):
    """Test multiple risk factors combined"""
    high_risk_tx = Transaction(
        id=1,
        agent_id=1,
        amount=Decimal("450.00"),  # High amount
        merchant="UnknownStore",  # Unknown merchant
        merchant_category="electronics",  # Different category
        status="pending",
        created_at=datetime.utcnow()
    )
    
    recent_transactions = [
        Transaction(
            id=i,
            agent_id=1,
            amount=Decimal("100.00"),
            merchant="Amazon",
            status="completed",
            created_at=datetime.utcnow() - timedelta(minutes=i)
        ) for i in range(1, 4)  # Recent activity
    ]
    
    result = await validation_service.validate_transaction(
        high_risk_tx,
        sample_agent,
        recent_transactions=recent_transactions
    )
    
    assert result.is_valid  # Still valid but high risk
    assert result.risk_score > 0.7  # Very high risk
    assert len(result.risk_factors) >= 3  # Multiple risk factors identified