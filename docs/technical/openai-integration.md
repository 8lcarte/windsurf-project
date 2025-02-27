# OpenAI Integration Guide

## Overview

This guide explains how to work with the OpenAI integration in the AI Agent Platform. The platform uses OpenAI's GPT models for natural language understanding and function calling capabilities.

## Architecture

The OpenAI integration consists of several components:

1. OpenAI Service: Handles communication with OpenAI API
2. Function Registry: Manages available functions for AI agents
3. Context Management: Maintains conversation context
4. Response Processing: Handles streaming and function calls

## Configuration

### Environment Variables

```env
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
```

### Model Settings

```python
# config.py
OPENAI_CONFIG = {
    "default_model": "gpt-4",
    "available_models": ["gpt-4", "gpt-3.5-turbo"],
    "max_tokens": 2000,
    "temperature": 0.7,
    "top_p": 1.0,
    "frequency_penalty": 0.0,
    "presence_penalty": 0.0
}
```

## Function Calling

### Registering Functions

```python
from app.models.agent_function import AgentFunction

# Define function schema
validate_transaction = AgentFunction(
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
)

# Register function
function_service.register_function(validate_transaction)
```

### Using Functions in Conversations

```python
# Create conversation with function calling
response = await openai_service.create_chat_completion(
    messages=[
        {"role": "user", "content": "Process a $100 purchase from Amazon"}
    ],
    functions=[validate_transaction],
    function_call={"name": "validate_transaction"}
)

# Handle function call
if response.choices[0].message.function_call:
    function_call = response.choices[0].message.function_call
    function_args = json.loads(function_call.arguments)
    
    # Execute function
    result = await function_service.execute_function(
        function_call.name,
        function_args
    )
```

## Context Management

### Creating Conversation Context

```python
# Initialize context
context = openai_service.create_conversation_context()

# Add system message
context.add_message("system", """
You are an AI shopping assistant. Your role is to:
1. Help users make purchase decisions
2. Validate transactions
3. Monitor spending patterns
""")

# Add user message
context.add_message("user", "I want to buy office supplies")

# Add assistant message
context.add_message("assistant", "I'll help you find office supplies.")
```

### Managing Context Window

```python
# Trim context to fit token limit
context.trim_messages(max_tokens=4000)

# Clear old messages
context.clear_messages_before(timestamp)

# Get current context length
token_count = context.get_token_count()
```

## Streaming Responses

### Implementing Streaming

```python
async def stream_completion(messages):
    async for chunk in openai_service.create_chat_completion_stream(
        messages=messages
    ):
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
```

### Using Server-Sent Events (SSE)

```python
@router.get("/stream")
async def stream_response(request: Request):
    return EventSourceResponse(
        stream_completion(messages),
        media_type="text/event-stream"
    )
```

## Error Handling

```python
try:
    response = await openai_service.create_chat_completion(messages)
except OpenAIError as e:
    if isinstance(e, RateLimitError):
        # Handle rate limiting
        await asyncio.sleep(e.retry_after)
        response = await openai_service.create_chat_completion(messages)
    elif isinstance(e, InvalidRequestError):
        # Handle invalid requests
        logger.error(f"Invalid request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    else:
        # Handle other OpenAI errors
        logger.error(f"OpenAI error: {e}")
        raise HTTPException(status_code=500, detail="OpenAI service error")
```

## Rate Limiting

The platform implements rate limiting for OpenAI API calls:

```python
# Rate limit configuration
RATE_LIMIT_CONFIG = {
    "requests_per_minute": 60,
    "tokens_per_minute": 90000,
    "retry_after": 5
}

# Rate limit decorator
@rate_limit(**RATE_LIMIT_CONFIG)
async def create_chat_completion():
    # ... implementation
```

## Best Practices

1. **Context Management**
   - Keep conversation context focused and relevant
   - Regularly trim old messages to stay within token limits
   - Include system messages for consistent behavior

2. **Function Calling**
   - Define clear, specific function purposes
   - Validate function parameters thoroughly
   - Handle function execution errors gracefully

3. **Error Handling**
   - Implement proper retry logic for rate limits
   - Log errors with appropriate detail
   - Provide meaningful error messages to clients

4. **Performance**
   - Use streaming for long responses
   - Implement caching where appropriate
   - Monitor token usage and costs

5. **Security**
   - Validate all user inputs
   - Sanitize function parameters
   - Monitor for abuse patterns

## Examples

### Transaction Processing

```python
# Process a transaction with AI validation
async def process_transaction(transaction_data):
    # Create conversation context
    context = openai_service.create_conversation_context()
    
    # Add transaction details
    context.add_message("user", f"""
    Process transaction:
    Amount: ${transaction_data['amount']}
    Merchant: {transaction_data['merchant']}
    Category: {transaction_data['category']}
    """)
    
    # Get AI response with function calling
    response = await openai_service.create_chat_completion(
        messages=context.get_messages(),
        functions=[validate_transaction],
        function_call={"name": "validate_transaction"}
    )
    
    # Execute validation function
    if response.choices[0].message.function_call:
        function_call = response.choices[0].message.function_call
        validation_result = await function_service.execute_function(
            function_call.name,
            json.loads(function_call.arguments)
        )
        
        return validation_result
```

### Risk Analysis

```python
# Analyze transaction risk with AI
async def analyze_risk(transaction_history):
    context = openai_service.create_conversation_context()
    
    # Add transaction history
    context.add_message("system", """
    Analyze the transaction history for risk patterns:
    1. Unusual spending patterns
    2. High-risk merchants
    3. Velocity checks
    """)
    
    context.add_message("user", f"Transaction history: {json.dumps(transaction_history)}")
    
    # Get AI analysis
    response = await openai_service.create_chat_completion(
        messages=context.get_messages()
    )
    
    return response.choices[0].message.content
```

## Monitoring and Debugging

### Logging

```python
# Configure logging
logging.config.dictConfig({
    "version": 1,
    "handlers": {
        "openai": {
            "class": "logging.FileHandler",
            "filename": "openai.log",
            "formatter": "detailed"
        }
    },
    "loggers": {
        "openai": {
            "handlers": ["openai"],
            "level": "INFO"
        }
    }
})

# Log OpenAI interactions
logger.info("OpenAI request", extra={
    "messages": messages,
    "functions": functions,
    "token_count": token_count
})
```

### Metrics

Monitor key metrics:
- Token usage
- Response times
- Error rates
- Function call success rates
- Cost tracking

## Troubleshooting

Common issues and solutions:

1. **Rate Limiting**
   - Implement exponential backoff
   - Use token bucket algorithm
   - Monitor usage patterns

2. **Token Limits**
   - Implement context windowing
   - Compress conversation history
   - Use efficient prompts

3. **Function Calling**
   - Validate function schemas
   - Handle partial completions
   - Monitor execution times

4. **Performance**
   - Cache common responses
   - Use async processing
   - Implement request batching