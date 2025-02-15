import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
import numpy as np

from app.models.ai_agent import AIAgent
from app.models.agent_transaction import AgentTransaction, RiskLevel, TransactionStatus
from app.services.agent_behavior_service import behavior_analytics, BehaviorPattern

@pytest.fixture
def sample_agent():
    return AIAgent(
        id=1,
        name="Test Agent",
        description="Test shopping assistant",
        status="active",
        type="shopping"
    )

@pytest.fixture
def consistent_transactions():
    """Transactions with consistent spending pattern"""
    base_time = datetime.utcnow()
    return [
        AgentTransaction(
            id=i,
            agent_id=1,
            amount=Decimal("100.00"),
            merchant_name="Regular Store",
            merchant_category="retail",
            status=TransactionStatus.COMPLETED,
            created_at=base_time - timedelta(days=i)
        )
        for i in range(10)
    ]

@pytest.fixture
def varied_transactions():
    """Transactions with varied patterns"""
    base_time = datetime.utcnow()
    transactions = []
    
    # Morning transactions at coffee shop
    for i in range(5):
        transactions.append(
            AgentTransaction(
                id=len(transactions) + 1,
                agent_id=1,
                amount=Decimal("5.00"),
                merchant_name="Coffee Shop",
                merchant_category="food",
                status=TransactionStatus.COMPLETED,
                created_at=(base_time - timedelta(days=i)).replace(hour=9, minute=0)
            )
        )
    
    # Evening transactions at restaurant
    for i in range(3):
        transactions.append(
            AgentTransaction(
                id=len(transactions) + 1,
                agent_id=1,
                amount=Decimal("50.00"),
                merchant_name="Restaurant",
                merchant_category="dining",
                status=TransactionStatus.COMPLETED,
                created_at=(base_time - timedelta(days=i)).replace(hour=19, minute=0)
            )
        )
    
    # Random transactions
    for i in range(2):
        transactions.append(
            AgentTransaction(
                id=len(transactions) + 1,
                agent_id=1,
                amount=Decimal("25.00"),
                merchant_name="Random Store",
                merchant_category="retail",
                status=TransactionStatus.COMPLETED,
                created_at=base_time - timedelta(days=i, hours=np.random.randint(0, 24))
            )
        )
    
    return transactions

@pytest.mark.asyncio
async def test_analyze_behavior(db: AsyncSession, sample_agent, varied_transactions):
    """Test behavior analysis with varied transaction patterns"""
    for tx in varied_transactions:
        db.add(tx)
    await db.commit()
    
    profile = await behavior_analytics.analyze_behavior(db, sample_agent)
    
    assert profile.agent_id == sample_agent.id
    assert profile.avg_transaction_amount is not None
    assert profile.typical_hours == [9, 19]  # Common transaction hours
    assert "Coffee Shop" in profile.frequent_merchants
    assert "food" in profile.frequent_categories

@pytest.mark.asyncio
async def test_detect_anomalies(db: AsyncSession, sample_agent, consistent_transactions):
    """Test anomaly detection"""
    for tx in consistent_transactions:
        db.add(tx)
    await db.commit()
    
    # Create an anomalous transaction
    anomalous_tx = AgentTransaction(
        id=999,
        agent_id=1,
        amount=Decimal("1000.00"),  # 10x normal amount
        merchant_name="Unusual Store",
        merchant_category="unknown",
        status=TransactionStatus.COMPLETED,
        created_at=datetime.utcnow().replace(hour=3)  # Unusual hour
    )
    
    anomalies = await behavior_analytics.detect_anomalies(db, sample_agent, anomalous_tx)
    
    assert len(anomalies) == 3  # Amount, time, and merchant anomalies
    assert any(a["type"] == "amount_anomaly" for a in anomalies)
    assert any(a["type"] == "time_anomaly" for a in anomalies)
    assert any(a["type"] == "merchant_anomaly" for a in anomalies)

@pytest.mark.asyncio
async def test_spending_pattern_detection(db: AsyncSession, sample_agent, consistent_transactions):
    """Test detection of consistent spending patterns"""
    for tx in consistent_transactions:
        db.add(tx)
    await db.commit()
    
    profile = await behavior_analytics.analyze_behavior(db, sample_agent)
    
    spending_patterns = [p for p in profile.patterns if p.pattern_type == "spending_consistency"]
    assert len(spending_patterns) == 1
    assert spending_patterns[0].confidence > 0.8

@pytest.mark.asyncio
async def test_temporal_pattern_detection(db: AsyncSession, sample_agent, varied_transactions):
    """Test detection of temporal patterns"""
    for tx in varied_transactions:
        db.add(tx)
    await db.commit()
    
    profile = await behavior_analytics.analyze_behavior(db, sample_agent)
    
    temporal_patterns = [p for p in profile.patterns if p.pattern_type == "temporal_preference"]
    assert len(temporal_patterns) == 1
    assert 9 in temporal_patterns[0].data["peak_hours"]  # Morning coffee time
    assert 19 in temporal_patterns[0].data["peak_hours"]  # Dinner time

@pytest.mark.asyncio
async def test_merchant_pattern_detection(db: AsyncSession, sample_agent, varied_transactions):
    """Test detection of merchant patterns"""
    for tx in varied_transactions:
        db.add(tx)
    await db.commit()
    
    profile = await behavior_analytics.analyze_behavior(db, sample_agent)
    
    merchant_patterns = [p for p in profile.patterns if p.pattern_type == "merchant_preference"]
    assert len(merchant_patterns) == 1
    assert "Coffee Shop" in merchant_patterns[0].data["preferred_merchants"]

@pytest.mark.asyncio
async def test_risk_assessment(db: AsyncSession, sample_agent, varied_transactions):
    """Test risk assessment calculation"""
    for tx in varied_transactions:
        db.add(tx)
    await db.commit()
    
    assessment = await behavior_analytics.get_risk_assessment(db, sample_agent)
    
    assert "risk_score" in assessment
    assert "risk_level" in assessment
    assert "risk_metrics" in assessment
    assert "behavioral_patterns" in assessment
    assert isinstance(assessment["risk_level"], RiskLevel)
    assert all(0 <= score <= 10 for score in assessment["risk_metrics"].values())

@pytest.mark.asyncio
async def test_profile_updates(db: AsyncSession, sample_agent, varied_transactions):
    """Test behavior profile updates with new transactions"""
    # Initial analysis
    for tx in varied_transactions[:5]:
        db.add(tx)
    await db.commit()
    
    initial_profile = await behavior_analytics.analyze_behavior(db, sample_agent)
    initial_merchants = set(initial_profile.frequent_merchants.keys())
    
    # Add more transactions
    for tx in varied_transactions[5:]:
        db.add(tx)
    await db.commit()
    
    updated_profile = await behavior_analytics.analyze_behavior(db, sample_agent)
    updated_merchants = set(updated_profile.frequent_merchants.keys())
    
    assert initial_merchants != updated_merchants
    assert len(updated_profile.patterns) >= len(initial_profile.patterns)

@pytest.mark.asyncio
async def test_risk_metrics_calculation(db: AsyncSession, sample_agent, varied_transactions):
    """Test individual risk metric calculations"""
    for tx in varied_transactions:
        db.add(tx)
    await db.commit()
    
    profile = await behavior_analytics.analyze_behavior(db, sample_agent)
    
    metrics = await behavior_analytics._calculate_risk_metrics(db, sample_agent, varied_transactions)
    
    assert "amount_volatility" in metrics
    assert "merchant_diversity" in metrics
    assert "time_regularity" in metrics
    assert "success_rate" in metrics
    
    # Verify metric ranges
    assert 0 <= metrics["amount_volatility"] <= 10
    assert 0 <= metrics["merchant_diversity"] <= 10
    assert 0 <= metrics["time_regularity"] <= 1
    assert 0 <= metrics["success_rate"] <= 10