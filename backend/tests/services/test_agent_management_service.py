import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_agent import AIAgent, AgentStatus
from app.crud.crud_ai_agent import CRUDAIAgent
from app.schemas.ai_agent import AIAgentCreate, AIAgentUpdate

@pytest.fixture
def sample_agent_create():
    return AIAgentCreate(
        name="Shopping Assistant",
        description="AI assistant for shopping tasks",
        daily_spend_limit=Decimal("1000.00"),
        monthly_spend_limit=Decimal("5000.00"),
        max_transaction_amount=Decimal("500.00"),
        require_approval_above=Decimal("200.00"),
        allowed_merchant_categories=["retail", "groceries"],
        blocked_merchant_categories=["gambling"],
        allowed_merchants=["Amazon", "Walmart"],
        blocked_merchants=["UnauthorizedStore"]
    )

async def test_create_agent(db: AsyncSession, sample_agent_create):
    """Test creating a new AI agent with full configuration"""
    crud_agent = CRUDAIAgent(AIAgent)
    agent = await crud_agent.create(db, obj_in=sample_agent_create)
    
    assert agent.name == "Shopping Assistant"
    assert agent.status == AgentStatus.ACTIVE
    assert agent.daily_spend_limit == Decimal("1000.00")
    assert agent.current_daily_spend == Decimal("0.00")
    assert agent.allowed_merchant_categories == ["retail", "groceries"]
    assert agent.blocked_merchants == ["UnauthorizedStore"]

async def test_spending_limits(db: AsyncSession, sample_agent_create):
    """Test spending limit management and resets"""
    crud_agent = CRUDAIAgent(AIAgent)
    agent = await crud_agent.create(db, obj_in=sample_agent_create)
    
    # Update daily spend
    update_data = AIAgentUpdate(
        current_daily_spend=Decimal("150.00"),
        last_daily_reset=datetime.utcnow() - timedelta(days=1)
    )
    updated_agent = await crud_agent.update(db, db_obj=agent, obj_in=update_data)
    
    assert updated_agent.current_daily_spend == Decimal("150.00")
    
    # Test daily reset
    yesterday = datetime.utcnow() - timedelta(days=1)
    assert updated_agent.last_daily_reset < datetime.utcnow()

async def test_merchant_restrictions(db: AsyncSession, sample_agent_create):
    """Test merchant category and specific merchant restrictions"""
    crud_agent = CRUDAIAgent(AIAgent)
    agent = await crud_agent.create(db, obj_in=sample_agent_create)
    
    # Update restrictions
    update_data = AIAgentUpdate(
        allowed_merchant_categories=["retail", "groceries", "electronics"],
        blocked_merchants=["UnauthorizedStore", "BlockedMerchant"]
    )
    updated_agent = await crud_agent.update(db, db_obj=agent, obj_in=update_data)
    
    assert "electronics" in updated_agent.allowed_merchant_categories
    assert "BlockedMerchant" in updated_agent.blocked_merchants
    assert len(updated_agent.allowed_merchant_categories) == 3

async def test_status_management(db: AsyncSession, sample_agent_create):
    """Test agent status changes"""
    crud_agent = CRUDAIAgent(AIAgent)
    agent = await crud_agent.create(db, obj_in=sample_agent_create)
    
    # Test suspension
    update_data = AIAgentUpdate(status=AgentStatus.SUSPENDED)
    suspended_agent = await crud_agent.update(db, db_obj=agent, obj_in=update_data)
    assert suspended_agent.status == AgentStatus.SUSPENDED
    
    # Test reactivation
    update_data = AIAgentUpdate(status=AgentStatus.ACTIVE)
    reactivated_agent = await crud_agent.update(db, db_obj=suspended_agent, obj_in=update_data)
    assert reactivated_agent.status == AgentStatus.ACTIVE

async def test_transaction_tracking(db: AsyncSession, sample_agent_create):
    """Test transaction count and spend tracking"""
    crud_agent = CRUDAIAgent(AIAgent)
    agent = await crud_agent.create(db, obj_in=sample_agent_create)
    
    # Simulate transaction
    update_data = AIAgentUpdate(
        total_spend=Decimal("150.00"),
        total_transactions=1,
        current_daily_spend=Decimal("150.00"),
        current_monthly_spend=Decimal("150.00"),
        last_transaction_at=datetime.utcnow()
    )
    updated_agent = await crud_agent.update(db, db_obj=agent, obj_in=update_data)
    
    assert updated_agent.total_transactions == 1
    assert updated_agent.total_spend == Decimal("150.00")
    assert updated_agent.last_transaction_at is not None

async def test_get_agent_by_filters(db: AsyncSession, sample_agent_create):
    """Test retrieving agents by various filters"""
    crud_agent = CRUDAIAgent(AIAgent)
    agent = await crud_agent.create(db, obj_in=sample_agent_create)
    
    # Get by ID
    retrieved_agent = await crud_agent.get(db, id=agent.id)
    assert retrieved_agent is not None
    assert retrieved_agent.id == agent.id
    
    # Get active agents
    active_agents = await crud_agent.get_multi(
        db,
        filters={"status": AgentStatus.ACTIVE}
    )
    assert len(active_agents) > 0
    assert all(a.status == AgentStatus.ACTIVE for a in active_agents)