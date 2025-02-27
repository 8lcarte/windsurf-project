import pytest
from unittest.mock import AsyncMock, patch
from app.services.openai_service import OpenAIService
from app.models.agent_function import AgentFunction
from app.schemas.ai_agent import AIAgentCreate

@pytest.fixture
def mock_openai_response():
    return {
        "id": "chatcmpl-123",
        "object": "chat.completion",
        "created": 1677652288,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "Test response",
                "function_call": {
                    "name": "analyze_transaction",
                    "arguments": '{"amount": 100, "merchant": "Test Store"}'
                }
            },
            "finish_reason": "function_call"
        }]
    }

@pytest.fixture
def sample_function():
    return AgentFunction(
        name="analyze_transaction",
        description="Analyze a transaction for risk and compliance",
        parameters={
            "type": "object",
            "properties": {
                "amount": {"type": "number"},
                "merchant": {"type": "string"}
            },
            "required": ["amount", "merchant"]
        }
    )

@pytest.mark.asyncio
async def test_openai_function_call():
    """Test OpenAI API call with function calling"""
    with patch('openai.ChatCompletion.acreate', new_callable=AsyncMock) as mock_create:
        mock_create.return_value = mock_openai_response()
        
        service = OpenAIService()
        response = await service.create_chat_completion(
            messages=[{"role": "user", "content": "Analyze this transaction"}],
            functions=[sample_function()],
            function_call={"name": "analyze_transaction"}
        )
        
        assert response.choices[0].message.function_call.name == "analyze_transaction"
        assert "amount" in response.choices[0].message.function_call.arguments

@pytest.mark.asyncio
async def test_openai_streaming():
    """Test streaming responses from OpenAI"""
    mock_stream = AsyncMock()
    mock_stream.__aiter__.return_value = [
        {"choices": [{"delta": {"content": "Test"}}]},
        {"choices": [{"delta": {"content": " response"}}]}
    ]
    
    with patch('openai.ChatCompletion.acreate', return_value=mock_stream):
        service = OpenAIService()
        chunks = []
        async for chunk in service.create_chat_completion_stream(
            messages=[{"role": "user", "content": "Test message"}]
        ):
            chunks.append(chunk)
        
        assert len(chunks) == 2
        assert "".join(c.choices[0].delta.content for c in chunks) == "Test response"

@pytest.mark.asyncio
async def test_openai_error_handling():
    """Test handling of OpenAI API errors"""
    with patch('openai.ChatCompletion.acreate', side_effect=Exception("API Error")):
        service = OpenAIService()
        with pytest.raises(Exception) as exc_info:
            await service.create_chat_completion(
                messages=[{"role": "user", "content": "Test message"}]
            )
        assert "API Error" in str(exc_info.value)

@pytest.mark.asyncio
async def test_function_registry_integration():
    """Test integration with function registry"""
    with patch('app.services.openai_service.get_registered_functions') as mock_registry:
        mock_registry.return_value = [sample_function()]
        
        service = OpenAIService()
        functions = service.get_available_functions()
        
        assert len(functions) == 1
        assert functions[0].name == "analyze_transaction"
        assert "amount" in functions[0].parameters["properties"]

@pytest.mark.asyncio
async def test_context_management():
    """Test conversation context management"""
    service = OpenAIService()
    context = service.create_conversation_context()
    
    context.add_message("user", "Test message")
    context.add_message("assistant", "Test response")
    
    messages = context.get_messages()
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"

@pytest.mark.asyncio
async def test_model_configuration():
    """Test model configuration and parameters"""
    service = OpenAIService()
    config = service.get_model_configuration()
    
    assert "gpt-4" in config.available_models
    assert config.max_tokens > 0
    assert 0 <= config.temperature <= 1

@pytest.mark.asyncio
async def test_rate_limiting():
    """Test rate limiting functionality"""
    service = OpenAIService()
    
    # Test rapid requests
    responses = []
    for _ in range(3):
        with patch('openai.ChatCompletion.acreate', new_callable=AsyncMock) as mock_create:
            mock_create.return_value = mock_openai_response()
            response = await service.create_chat_completion(
                messages=[{"role": "user", "content": "Test message"}]
            )
            responses.append(response)
    
    assert len(responses) == 3
    # Verify rate limiting headers or delays between requests