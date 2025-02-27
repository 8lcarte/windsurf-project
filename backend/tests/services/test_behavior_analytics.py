import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List
from app.services.agent_behavior_service import AgentBehaviorService
from app.models.agent_transaction import AgentTransaction
from app.models.ai_agent import AIAgent
from app.schemas.ai_agent import AIAgentCreate

@pytest.fixture
def sample_transactions() -> List[AgentTransaction]:
    base_time = datetime.utcnow()
    return [
        AgentTransaction(
            id=1,
            agent_id=1,
            amount=Decimal("100.00"),
            merchant="Amazon",
            category="retail",
            status="completed",
            risk_score=0.2,
            created_at=base_time - timedelta(days=1)
        ),
        AgentTransaction(
            id=2,
            agent_id=1,
            amount=Decimal("50.00"),
            merchant="Walmart",
            category="retail",
            status="completed",
            risk_score=0.1,
            created_at=base_time - timedelta(hours=12)
        ),
        AgentTransaction(
            id=3,
            agent_id=1,
            amount=Decimal("75.00"),
            merchant="Target",
            category="retail",
            status="failed",
            risk_score=0.4,
            created_at=base_time - timedelta(hours=6)
        )
    ]

@pytest.fixture
def sample_agent() -> AIAgent:
    return AIAgent(
        id=1,
        name="Shopping Assistant",
        description="AI assistant for shopping tasks",
        daily_spend_limit=Decimal("1000.00"),
        monthly_spend_limit=Decimal("5000.00"),
        allowed_merchant_categories=["retail", "groceries"],
        blocked_merchant_categories=["gambling"],
        allowed_merchants=["Amazon", "Walmart", "Target"],
        blocked_merchants=[],
        status="active"
    )

async def test_transaction_pattern_analysis(sample_transactions, sample_agent):
    """Test analysis of transaction patterns"""
    service = AgentBehaviorService()
    patterns = await service.analyze_transaction_patterns(sample_transactions)
    
    assert "amount_distribution" in patterns
    assert "merchant_frequency" in patterns
    assert "category_distribution" in patterns
    assert "hourly_distribution" in patterns
    
    # Test amount distribution
    amount_stats = patterns["amount_distribution"]
    assert amount_stats["mean"] == Decimal("75.00")
    assert amount_stats["median"] == Decimal("75.00")
    assert amount_stats["std_dev"] > 0
    
    # Test merchant frequency
    merchant_freq = patterns["merchant_frequency"]
    assert "Amazon" in merchant_freq
    assert "Walmart" in merchant_freq
    assert merchant_freq["Amazon"] == 1

async def test_risk_metrics_calculation(sample_transactions, sample_agent):
    """Test calculation of risk metrics"""
    service = AgentBehaviorService()
    risk_metrics = await service.calculate_risk_metrics(
        sample_transactions,
        sample_agent
    )
    
    assert "amount_volatility" in risk_metrics
    assert "merchant_diversity" in risk_metrics
    assert "time_regularity" in risk_metrics
    assert "success_rate" in risk_metrics
    
    # Test success rate
    assert risk_metrics["success_rate"] == 2/3  # 2 successful out of 3
    
    # Test merchant diversity
    assert 0 <= risk_metrics["merchant_diversity"] <= 1
    
    # Test amount volatility
    assert risk_metrics["amount_volatility"] > 0

async def test_anomaly_detection(sample_transactions, sample_agent):
    """Test detection of anomalous behavior"""
    service = AgentBehaviorService()
    
    # Add anomalous transaction
    anomalous_tx = AgentTransaction(
        id=4,
        agent_id=1,
        amount=Decimal("900.00"),  # Unusually high amount
        merchant="UnknownStore",
        category="retail",
        status="pending",
        risk_score=0.8,
        created_at=datetime.utcnow()
    )
    
    transactions = sample_transactions + [anomalous_tx]
    anomalies = await service.detect_anomalies(transactions, sample_agent)
    
    assert len(anomalies) > 0
    assert any(a["type"] == "high_amount" for a in anomalies)
    assert any(a["type"] == "unusual_merchant" for a in anomalies)

async def test_behavioral_rules_validation(sample_transactions, sample_agent):
    """Test validation against behavioral rules"""
    service = AgentBehaviorService()
    
    rules = {
        "max_amount_per_merchant": Decimal("200.00"),
        "max_transactions_per_hour": 2,
        "allowed_time_window": {
            "start": "09:00",
            "end": "17:00"
        }
    }
    
    violations = await service.check_behavioral_rules(
        sample_transactions,
        rules
    )
    
    assert isinstance(violations, list)
    assert all("rule" in v and "description" in v for v in violations)

async def test_merchant_risk_profiling(sample_transactions):
    """Test merchant risk profiling"""
    service = AgentBehaviorService()
    merchant_profiles = await service.analyze_merchant_risk_profiles(
        sample_transactions
    )
    
    assert "Amazon" in merchant_profiles
    assert "Walmart" in merchant_profiles
    
    amazon_profile = merchant_profiles["Amazon"]
    assert "average_transaction_amount" in amazon_profile
    assert "transaction_success_rate" in amazon_profile
    assert "risk_level" in amazon_profile

async def test_time_based_patterns(sample_transactions):
    """Test analysis of time-based patterns"""
    service = AgentBehaviorService()
    time_patterns = await service.analyze_time_patterns(sample_transactions)
    
    assert "hourly_distribution" in time_patterns
    assert "daily_distribution" in time_patterns
    assert "interval_analysis" in time_patterns
    
    # Test interval analysis
    intervals = time_patterns["interval_analysis"]
    assert "mean_interval" in intervals
    assert "std_dev_interval" in intervals

async def test_category_spending_analysis(sample_transactions, sample_agent):
    """Test analysis of spending by category"""
    service = AgentBehaviorService()
    category_analysis = await service.analyze_category_spending(
        sample_transactions,
        sample_agent
    )
    
    assert "retail" in category_analysis
    retail_stats = category_analysis["retail"]
    assert retail_stats["total_spend"] == Decimal("225.00")
    assert retail_stats["transaction_count"] == 3
    assert "average_amount" in retail_stats

async def test_risk_trend_analysis(sample_transactions):
    """Test analysis of risk score trends"""
    service = AgentBehaviorService()
    risk_trends = await service.analyze_risk_trends(sample_transactions)
    
    assert "trend_direction" in risk_trends
    assert "risk_velocity" in risk_trends
    assert "peak_risk_score" in risk_trends
    assert risk_trends["peak_risk_score"] == 0.4

async def test_behavior_change_detection(sample_transactions):
    """Test detection of behavioral changes"""
    service = AgentBehaviorService()
    
    # Add transactions showing behavior change
    new_pattern_tx = [
        AgentTransaction(
            id=5,
            agent_id=1,
            amount=Decimal("500.00"),
            merchant="NewStore",
            category="electronics",
            status="completed",
            risk_score=0.6,
            created_at=datetime.utcnow()
        )
    ]
    
    changes = await service.detect_behavior_changes(
        sample_transactions + new_pattern_tx,
        window_size=timedelta(days=1)
    )
    
    assert len(changes) > 0
    assert any(c["type"] == "amount_pattern_change" for c in changes)
    assert any(c["type"] == "category_shift" for c in changes)