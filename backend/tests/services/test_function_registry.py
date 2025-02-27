import pytest
from typing import Dict, Any
from datetime import datetime
from decimal import Decimal
from app.services.agent_function_service import AgentFunctionService
from app.models.agent_function import AgentFunction
from app.schemas.ai_agent import AIAgentCreate
from app.core.exceptions import FunctionValidationError, FunctionExecutionError

@pytest.fixture
def sample_functions():
    return [
        AgentFunction(
            name="validate_transaction",
            description="Validate a transaction against spending rules",
            parameters={
                "type": "object",
                "properties": {
                    "amount": {"type": "number"},
                    "merchant": {"type": "string"},
                    "category": {"type": "string"}
                },
                "required": ["amount", "merchant"]
            }
        ),
        AgentFunction(
            name="analyze_merchant",
            description="Analyze merchant risk profile",
            parameters={
                "type": "object",
                "properties": {
                    "merchant_name": {"type": "string"},
                    "transaction_history": {
                        "type": "array",
                        "items": {"type": "object"}
                    }
                },
                "required": ["merchant_name"]
            }
        )
    ]

@pytest.fixture
def function_service(sample_functions):
    service = AgentFunctionService()
    for func in sample_functions:
        service.register_function(func)
    return service

async def test_function_registration(function_service):
    """Test registering new functions"""
    new_function = AgentFunction(
        name="check_balance",
        description="Check account balance",
        parameters={
            "type": "object",
            "properties": {
                "account_id": {"type": "string"}
            },
            "required": ["account_id"]
        }
    )
    
    function_service.register_function(new_function)
    registered = function_service.get_function("check_balance")
    
    assert registered is not None
    assert registered.name == "check_balance"
    assert "account_id" in registered.parameters["properties"]

async def test_function_validation(function_service):
    """Test function parameter validation"""
    # Valid parameters
    valid_params = {
        "amount": 100.00,
        "merchant": "Test Store",
        "category": "retail"
    }
    
    result = function_service.validate_parameters(
        "validate_transaction",
        valid_params
    )
    assert result is True
    
    # Invalid parameters
    invalid_params = {
        "amount": "not a number",
        "merchant": 123  # Should be string
    }
    
    with pytest.raises(FunctionValidationError):
        function_service.validate_parameters(
            "validate_transaction",
            invalid_params
        )

async def test_function_execution(function_service):
    """Test function execution with various parameters"""
    # Mock execution handler
    async def mock_handler(params: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "valid": True,
            "risk_score": 0.1,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    function_service.register_handler(
        "validate_transaction",
        mock_handler
    )
    
    result = await function_service.execute_function(
        "validate_transaction",
        {
            "amount": 100.00,
            "merchant": "Test Store"
        }
    )
    
    assert result["valid"] is True
    assert "risk_score" in result
    assert "timestamp" in result

async def test_function_error_handling(function_service):
    """Test handling of various error conditions"""
    # Test non-existent function
    with pytest.raises(FunctionValidationError):
        await function_service.execute_function(
            "non_existent_function",
            {"param": "value"}
        )
    
    # Test execution error
    async def error_handler(params: Dict[str, Any]) -> Dict[str, Any]:
        raise Exception("Execution failed")
    
    function_service.register_handler(
        "validate_transaction",
        error_handler
    )
    
    with pytest.raises(FunctionExecutionError):
        await function_service.execute_function(
            "validate_transaction",
            {
                "amount": 100.00,
                "merchant": "Test Store"
            }
        )

async def test_function_metadata(function_service):
    """Test function metadata and documentation"""
    metadata = function_service.get_function_metadata("validate_transaction")
    
    assert metadata.name == "validate_transaction"
    assert metadata.description is not None
    assert metadata.required_parameters == ["amount", "merchant"]
    assert metadata.optional_parameters == ["category"]

async def test_batch_execution(function_service):
    """Test executing multiple functions in sequence"""
    async def mock_validate(params: Dict[str, Any]) -> Dict[str, Any]:
        return {"valid": True}
    
    async def mock_analyze(params: Dict[str, Any]) -> Dict[str, Any]:
        return {"risk_level": "low"}
    
    function_service.register_handler("validate_transaction", mock_validate)
    function_service.register_handler("analyze_merchant", mock_analyze)
    
    results = await function_service.execute_batch([
        ("validate_transaction", {"amount": 100.00, "merchant": "Test Store"}),
        ("analyze_merchant", {"merchant_name": "Test Store"})
    ])
    
    assert len(results) == 2
    assert results[0]["valid"] is True
    assert results[1]["risk_level"] == "low"

async def test_function_versioning(function_service):
    """Test function versioning and backwards compatibility"""
    # Register new version of existing function
    updated_function = AgentFunction(
        name="validate_transaction",
        version="2.0",
        description="Enhanced transaction validation",
        parameters={
            "type": "object",
            "properties": {
                "amount": {"type": "number"},
                "merchant": {"type": "string"},
                "category": {"type": "string"},
                "risk_threshold": {"type": "number"}  # New parameter
            },
            "required": ["amount", "merchant"]
        }
    )
    
    function_service.register_function(updated_function)
    
    # Test old version still works
    result = function_service.validate_parameters(
        "validate_transaction",
        {
            "amount": 100.00,
            "merchant": "Test Store"
        }
    )
    assert result is True
    
    # Test new version with new parameter
    result = function_service.validate_parameters(
        "validate_transaction",
        {
            "amount": 100.00,
            "merchant": "Test Store",
            "risk_threshold": 0.5
        },
        version="2.0"
    )
    assert result is True

async def test_function_permissions(function_service):
    """Test function permission and access control"""
    restricted_function = AgentFunction(
        name="high_risk_operation",
        description="Restricted operation",
        parameters={
            "type": "object",
            "properties": {
                "operation": {"type": "string"}
            },
            "required": ["operation"]
        },
        requires_approval=True,
        allowed_agent_types=["admin"]
    )
    
    function_service.register_function(restricted_function)
    
    # Test permission check
    has_permission = function_service.check_function_permission(
        "high_risk_operation",
        agent_type="standard"
    )
    assert has_permission is False
    
    has_permission = function_service.check_function_permission(
        "high_risk_operation",
        agent_type="admin"
    )
    assert has_permission is True