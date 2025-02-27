# OpenAI Integration Guide

## Overview
This document details how the platform integrates with OpenAI's APIs for AI agent functionality.

## Configuration
OpenAI integration requires the following environment variables:
```
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
```

## Agent Architecture

### Components
1. Agent Service (`backend/app/services/agent_behavior_service.py`)
   - Manages agent behavior and decision-making
   - Handles interaction with OpenAI API
   - Implements retry and error handling logic

2. Function Registry (`backend/app/models/agent_function.py`)
   - Stores available functions for agents
   - Manages function permissions and constraints
   - Handles function versioning

3. Transaction Validation Service
   - Validates transactions using AI agents
   - Applies business rules and spending policies
   - Records validation decisions

### Agent Types
1. Transaction Validator
   - Validates transactions against policies
   - Identifies suspicious patterns
   - Recommends approval/denial

2. Category Classifier
   - Assigns merchant categories
   - Updates spending analytics
   - Maintains category hierarchy

3. Spending Analyzer
   - Analyzes spending patterns
   - Generates insights
   - Identifies optimization opportunities

## Function Calling

### Function Definition
Functions are defined using the following structure:
```python
{
    "name": "validate_transaction",
    "description": "Validate a transaction against spending policies",
    "parameters": {
        "type": "object",
        "properties": {
            "transaction_id": {
                "type": "string",
                "description": "The ID of the transaction"
            },
            "amount": {
                "type": "number",
                "description": "Transaction amount"
            },
            "merchant": {
                "type": "string",
                "description": "Merchant name"
            }
        },
        "required": ["transaction_id", "amount", "merchant"]
    }
}
```

### OpenAI API Integration
```python
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": agent_prompt},
        {"role": "user", "content": transaction_details}
    ],
    functions=[function_definition],
    function_call="auto"
)
```

## Error Handling

### Retry Strategy
- Implements exponential backoff
- Maximum of 3 retry attempts
- Handles rate limiting errors

```python
def retry_with_backoff(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except openai.error.RateLimitError:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)
```

### Error Types
1. API Errors
   - RateLimitError
   - InvalidRequestError
   - AuthenticationError

2. Validation Errors
   - InvalidFunctionCall
   - MissingParameters
   - InvalidResponse

## Best Practices

1. Prompt Engineering
   - Use clear, specific instructions
   - Include relevant context
   - Maintain consistent formatting

2. Function Design
   - Keep functions focused and atomic
   - Validate all inputs
   - Include comprehensive descriptions

3. Performance Optimization
   - Cache frequent responses
   - Batch similar requests
   - Monitor token usage

4. Security
   - Sanitize all inputs
   - Validate function outputs
   - Implement rate limiting
   - Monitor for abuse patterns

## Monitoring and Logging

### Metrics to Track
- API response times
- Token usage
- Error rates
- Function call success rates
- Agent decision accuracy

### Logging
```python
logger.info("Agent decision", extra={
    "agent_id": agent.id,
    "decision": decision,
    "confidence": confidence,
    "tokens_used": response.usage.total_tokens
})
```

## Testing

### Unit Tests
```python
def test_agent_validation():
    agent = TransactionValidator()
    result = agent.validate_transaction(
        amount=100,
        merchant="Test Store",
        category="retail"
    )
    assert result.is_valid
    assert result.confidence > 0.8
```

### Integration Tests
```python
def test_end_to_end_validation():
    transaction = create_test_transaction()
    validation = agent_service.validate_transaction(transaction)
    assert validation.status == "completed"
    assert validation.decision in ["approve", "deny"]