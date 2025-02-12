import pytest
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.agent_function_service import agent_function_registry
from app.models.ai_agent import AIAgent, AgentStatus

@pytest.fixture
def sample_function_schema():
    return {
        "name": "make_payment",
        "description": "Make a payment using a virtual card",
        "parameters_schema": {
            "type": "object",
            "properties": {
                "amount": {
                    "type": "number",
                    "description": "Payment amount"
                },
                "merchant": {
                    "type": "string",
                    "description": "Merchant name"
                },
                "category": {
                    "type": "string",
                    "description": "Merchant category"
                }
            },
            "required": ["amount", "merchant"]
        },
        "return_schema": {
            "type": "object",
            "properties": {
                "transaction_id": {
                    "type": "string"
                },
                "status": {
                    "type": "string",
                    "enum": ["success", "failed"]
                }
            }
        }
    }

@pytest.fixture
def sample_agent():
    return AIAgent(
        id=1,
        name="Test Agent",
        description="Test shopping assistant",
        status=AgentStatus.ACTIVE,
        type="shopping",
        created_at=datetime.utcnow()
    )

async def test_register_function(db: AsyncSession, sample_function_schema):
    """Test registering a new function"""
    function = await agent_function_registry.register_function(
        db,
        name=sample_function_schema["name"],
        description=sample_function_schema["description"],
        parameters_schema=sample_function_schema["parameters_schema"],
        return_schema=sample_function_schema["return_schema"]
    )
    
    assert function is not None
    assert function.name == "make_payment"
    assert function.is_active == True
    assert function.version == 1

async def test_validate_parameters(db: AsyncSession, sample_function_schema):
    """Test parameter validation"""
    # Register function first
    await agent_function_registry.register_function(
        db,
        name=sample_function_schema["name"],
        description=sample_function_schema["description"],
        parameters_schema=sample_function_schema["parameters_schema"],
        return_schema=sample_function_schema["return_schema"]
    )
    
    # Test valid parameters
    valid_params = {
        "amount": 100.00,
        "merchant": "Test Store",
        "category": "retail"
    }
    assert await agent_function_registry.validate_parameters(
        db,
        function_name="make_payment",
        parameters=valid_params
    ) == True
    
    # Test invalid parameters
    invalid_params = {
        "amount": "not a number",
        "merchant": 123  # Should be string
    }
    assert await agent_function_registry.validate_parameters(
        db,
        function_name="make_payment",
        parameters=invalid_params
    ) == False

async def test_check_permissions(db: AsyncSession, sample_function_schema, sample_agent):
    """Test permission checking"""
    # Register function
    function = await agent_function_registry.register_function(
        db,
        name=sample_function_schema["name"],
        description=sample_function_schema["description"],
        parameters_schema=sample_function_schema["parameters_schema"],
        return_schema=sample_function_schema["return_schema"]
    )
    
    # Add permission for shopping agents
    from app.models.agent_function import FunctionPermission
    permission = FunctionPermission(
        function_id=function.id,
        agent_type="shopping",
        permission_level="execute"
    )
    db.add(permission)
    await db.commit()
    
    # Test permission check
    assert await agent_function_registry.check_permissions(
        db,
        function_name="make_payment",
        agent=sample_agent
    ) == True
    
    # Test with wrong agent type
    sample_agent.type = "travel"
    assert await agent_function_registry.check_permissions(
        db,
        function_name="make_payment",
        agent=sample_agent
    ) == False

async def test_track_usage(db: AsyncSession, sample_function_schema, sample_agent):
    """Test usage tracking"""
    # Register function
    function = await agent_function_registry.register_function(
        db,
        name=sample_function_schema["name"],
        description=sample_function_schema["description"],
        parameters_schema=sample_function_schema["parameters_schema"],
        return_schema=sample_function_schema["return_schema"]
    )
    
    # Track successful usage
    await agent_function_registry.track_usage(
        db,
        function_name="make_payment",
        agent_id=sample_agent.id,
        success=True,
        response_time=100
    )
    
    # Get usage stats
    from app.models.agent_function import FunctionUsageStats
    query = db.query(FunctionUsageStats).filter(
        FunctionUsageStats.function_id == function.id,
        FunctionUsageStats.agent_id == sample_agent.id
    )
    stats = await db.execute(query)
    stats = stats.scalar_one()
    
    assert stats.call_count == 1
    assert stats.success_count == 1
    assert stats.failure_count == 0
    assert stats.average_response_time == 100

async def test_list_functions(db: AsyncSession, sample_function_schema):
    """Test listing functions"""
    # Register two functions
    await agent_function_registry.register_function(
        db,
        name=sample_function_schema["name"],
        description=sample_function_schema["description"],
        parameters_schema=sample_function_schema["parameters_schema"],
        return_schema=sample_function_schema["return_schema"]
    )
    
    await agent_function_registry.register_function(
        db,
        name="check_balance",
        description="Check virtual card balance",
        parameters_schema={
            "type": "object",
            "properties": {
                "card_id": {
                    "type": "string"
                }
            },
            "required": ["card_id"]
        }
    )
    
    # List all functions
    functions = await agent_function_registry.list_functions(db)
    assert len(functions) == 2
    
    # Deactivate one function
    functions[0].is_active = False
    await db.commit()
    
    # List only active functions
    active_functions = await agent_function_registry.list_functions(db, active_only=True)
    assert len(active_functions) == 1 