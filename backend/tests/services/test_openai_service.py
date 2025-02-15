7import pytest
from datetime import datetime
from decimal import Decimal
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException
from openai import OpenAIError

from app.schemas.ai_agent import AgentCreate, AgentUpdate
from app.services.openai_service import OpenAIService

@pytest.fixture
def sample_agent_create():
    return AgentCreate(
        name="Test Assistant",
        description="Test AI shopping assistant",
        daily_spend_limit=Decimal("1000.00"),
        monthly_spend_limit=Decimal("5000.00"),
        max_transaction_amount=Decimal("500.00"),
        allowed_merchant_categories=["retail", "groceries"],
        allowed_merchants=["Amazon", "Walmart"]
    )

@pytest.fixture
def mock_openai_response():
    return AsyncMock(
        id="asst_123",
        name="Test Assistant",
        description="Test AI shopping assistant",
        metadata={
            "daily_spend_limit": "1000.00",
            "monthly_spend_limit": "5000.00",
            "allowed_merchant_categories": "retail,groceries",
            "allowed_merchants": "Amazon,Walmart",
            "max_transaction_amount": "500.00"
        }
    )

@pytest.mark.asyncio
async def test_register_assistant(sample_agent_create, mock_openai_response):
    """Test successful assistant registration"""
    with patch('openai.AsyncOpenAI') as mock_client:
        mock_client.return_value.beta.assistants.create = AsyncMock(
            return_value=mock_openai_response
        )
        
        service = OpenAIService()
        assistant_id = await service.register_assistant(sample_agent_create)
        
        assert assistant_id == "asst_123"
        mock_client.return_value.beta.assistants.create.assert_called_once()

@pytest.mark.asyncio
async def test_register_assistant_error():
    """Test error handling during assistant registration"""
    with patch('openai.AsyncOpenAI') as mock_client:
        mock_client.return_value.beta.assistants.create = AsyncMock(
            side_effect=OpenAIError("API Error")
        )
        
        service = OpenAIService()
        with pytest.raises(HTTPException) as exc_info:
            await service.register_assistant(sample_agent_create())
        
        assert exc_info.value.status_code == 500
        assert "Failed to create OpenAI assistant" in str(exc_info.value.detail)

@pytest.mark.asyncio
async def test_update_assistant(mock_openai_response):
    """Test assistant update"""
    with patch('openai.AsyncOpenAI') as mock_client:
        mock_client.return_value.beta.assistants.update = AsyncMock(
            return_value=mock_openai_response
        )
        
        service = OpenAIService()
        update_data = AgentUpdate(
            name="Updated Assistant",
            description="Updated description",
            daily_spend_limit=Decimal("2000.00")
        )
        
        await service.update_assistant("asst_123", update_data)
        
        mock_client.return_value.beta.assistants.update.assert_called_once()
        call_kwargs = mock_client.return_value.beta.assistants.update.call_args[1]
        assert call_kwargs["name"] == "Updated Assistant"
        assert call_kwargs["metadata"]["daily_spend_limit"] == "2000.00"

@pytest.mark.asyncio
async def test_delete_assistant():
    """Test assistant deletion"""
    with patch('openai.AsyncOpenAI') as mock_client:
        mock_client.return_value.beta.assistants.delete = AsyncMock()
        
        service = OpenAIService()
        await service.delete_assistant("asst_123")
        
        mock_client.return_value.beta.assistants.delete.assert_called_once_with(
            assistant_id="asst_123"
        )

@pytest.mark.asyncio
async def test_validate_function_call(mock_openai_response):
    """Test function call validation"""
    with patch('openai.AsyncOpenAI') as mock_client:
        mock_client.return_value.beta.assistants.retrieve = AsyncMock(
            return_value=mock_openai_response
        )
        
        service = OpenAIService()
        
        # Test valid function call
        valid_params = {
            "amount": 100.00,
            "merchant": "Amazon",
            "category": "retail"
        }
        is_valid = await service.validate_function_call(
            "asst_123",
            "make_payment",
            valid_params
        )
        assert is_valid == True
        
        # Test invalid amount
        invalid_amount = {
            "amount": 1000.00,  # Exceeds max_transaction_amount
            "merchant": "Amazon",
            "category": "retail"
        }
        is_valid = await service.validate_function_call(
            "asst_123",
            "make_payment",
            invalid_amount
        )
        assert is_valid == False
        
        # Test invalid merchant
        invalid_merchant = {
            "amount": 100.00,
            "merchant": "UnauthorizedStore",
            "category": "retail"
        }
        is_valid = await service.validate_function_call(
            "asst_123",
            "make_payment",
            invalid_merchant
        )
        assert is_valid == False
        
        # Test invalid category
        invalid_category = {
            "amount": 100.00,
            "merchant": "Amazon",
            "category": "gambling"
        }
        is_valid = await service.validate_function_call(
            "asst_123",
            "make_payment",
            invalid_category
        )
        assert is_valid == False

@pytest.mark.asyncio
async def test_get_assistant_tools(sample_agent_create):
    """Test tool configuration generation"""
    service = OpenAIService()
    tools = service._get_assistant_tools(sample_agent_create)
    
    assert len(tools) == 1
    assert tools[0]["type"] == "function"
    assert tools[0]["function"]["name"] == "make_payment"
    
    # Verify parameter schema
    params = tools[0]["function"]["parameters"]
    assert "amount" in params["properties"]
    assert "merchant" in params["properties"]
    assert "category" in params["properties"]
    assert params["required"] == ["amount", "merchant"]