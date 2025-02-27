# Function Registry Guide

## Overview

The Function Registry is a core component of the AI Agent Platform that manages the registration, validation, and execution of functions that AI agents can use. This guide explains how to work with the Function Registry system.

## Function Definition

### Basic Structure

Functions are defined using the `AgentFunction` model:

```python
from app.models.agent_function import AgentFunction

function = AgentFunction(
    name="check_balance",
    description="Check account balance for a given user",
    parameters={
        "type": "object",
        "properties": {
            "user_id": {
                "type": "string",
                "description": "The ID of the user"
            },
            "account_type": {
                "type": "string",
                "enum": ["checking", "savings"],
                "description": "Type of account to check"
            }
        },
        "required": ["user_id"]
    },
    version="1.0",
    requires_approval=False,
    allowed_agent_types=["financial"]
)
```

### Parameter Schema

The parameters field uses JSON Schema format:

```python
{
    "type": "object",
    "properties": {
        "property_name": {
            "type": "string | number | boolean | array | object",
            "description": "Description of the property",
            "enum": ["option1", "option2"],  # Optional enumerated values
            "minimum": 0,  # For numbers
            "maximum": 100,  # For numbers
            "pattern": "^[A-Za-z]+$",  # Regex pattern for strings
            "format": "date-time"  # Special formats
        }
    },
    "required": ["required_property_names"],
    "additionalProperties": false  # Whether to allow extra properties
}
```

## Registration

### Registering Functions

```python
from app.services.agent_function_service import AgentFunctionService

function_service = AgentFunctionService()

# Register a single function
function_service.register_function(function)

# Register multiple functions
function_service.register_functions([
    function1,
    function2,
    function3
])
```

### Function Versioning

```python
# Register new version of existing function
updated_function = AgentFunction(
    name="check_balance",
    version="2.0",
    description="Enhanced balance check with additional features",
    parameters={
        "type": "object",
        "properties": {
            "user_id": {"type": "string"},
            "account_type": {"type": "string"},
            "include_pending": {"type": "boolean"}  # New parameter
        },
        "required": ["user_id"]
    }
)

function_service.register_function(updated_function)

# Get specific version
v1_function = function_service.get_function("check_balance", version="1.0")
v2_function = function_service.get_function("check_balance", version="2.0")
```

## Function Handlers

### Implementing Handlers

```python
from typing import Dict, Any
from app.core.exceptions import FunctionExecutionError

async def check_balance_handler(params: Dict[str, Any]) -> Dict[str, Any]:
    try:
        user_id = params["user_id"]
        account_type = params.get("account_type", "checking")
        
        # Implementation logic here
        balance = await db.get_balance(user_id, account_type)
        
        return {
            "balance": float(balance),
            "currency": "USD",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise FunctionExecutionError(f"Failed to check balance: {str(e)}")

# Register handler
function_service.register_handler(
    "check_balance",
    check_balance_handler
)
```

### Handler Validation

```python
from app.core.validators import validate_handler_output

@validate_handler_output({
    "type": "object",
    "properties": {
        "balance": {"type": "number"},
        "currency": {"type": "string"},
        "timestamp": {"type": "string", "format": "date-time"}
    },
    "required": ["balance", "currency", "timestamp"]
})
async def check_balance_handler(params: Dict[str, Any]) -> Dict[str, Any]:
    # Implementation
    pass
```

## Function Execution

### Basic Execution

```python
# Execute function by name
result = await function_service.execute_function(
    "check_balance",
    {
        "user_id": "123",
        "account_type": "checking"
    }
)

# Execute specific version
result = await function_service.execute_function(
    "check_balance",
    {"user_id": "123"},
    version="1.0"
)
```

### Batch Execution

```python
# Execute multiple functions
results = await function_service.execute_batch([
    ("check_balance", {"user_id": "123"}),
    ("validate_transaction", {"amount": 100, "merchant": "Amazon"})
])
```

## Access Control

### Permission Management

```python
# Define function permissions
function = AgentFunction(
    name="high_value_transfer",
    description="Transfer large amounts between accounts",
    parameters={...},
    requires_approval=True,
    allowed_agent_types=["admin", "financial"],
    rate_limit=10  # calls per minute
)

# Check permissions
has_permission = function_service.check_function_permission(
    "high_value_transfer",
    agent_type="standard"
)
```

### Approval Workflow

```python
# Request approval
approval_request = await function_service.request_approval(
    function_name="high_value_transfer",
    params={"amount": 50000, "to_account": "789"},
    agent_id=1
)

# Approve request
await function_service.approve_request(
    request_id=approval_request.id,
    approver_id=admin_user.id
)
```

## Monitoring and Logging

### Function Metrics

```python
# Get function metrics
metrics = function_service.get_metrics("check_balance")
print(f"""
Function Metrics:
- Total calls: {metrics.total_calls}
- Success rate: {metrics.success_rate}
- Average execution time: {metrics.avg_execution_time}ms
- Error rate: {metrics.error_rate}
""")

# Get execution history
history = await function_service.get_execution_history(
    function_name="check_balance",
    start_date=datetime.now() - timedelta(days=7)
)
```

### Logging

```python
# Configure function logging
function_service.configure_logging({
    "level": "INFO",
    "handlers": ["console", "file"],
    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
})

# Log function execution
logger.info("Function executed", extra={
    "function": "check_balance",
    "params": params,
    "result": result,
    "execution_time": execution_time
})
```

## Best Practices

1. **Function Design**
   - Keep functions focused and single-purpose
   - Use clear, descriptive names
   - Document parameters thoroughly
   - Validate inputs and outputs
   - Handle errors gracefully

2. **Version Management**
   - Use semantic versioning
   - Maintain backwards compatibility
   - Document changes between versions
   - Plan deprecation cycles

3. **Security**
   - Implement proper access control
   - Validate all inputs
   - Monitor for abuse
   - Log security-relevant events

4. **Performance**
   - Optimize handler implementations
   - Use caching where appropriate
   - Implement rate limiting
   - Monitor execution times

5. **Testing**
   - Write unit tests for handlers
   - Test parameter validation
   - Test error conditions
   - Test version compatibility

## Examples

### Transaction Validation Function

```python
# Define function
validate_transaction = AgentFunction(
    name="validate_transaction",
    description="Validate a transaction against spending rules",
    parameters={
        "type": "object",
        "properties": {
            "amount": {
                "type": "number",
                "minimum": 0,
                "description": "Transaction amount"
            },
            "merchant": {
                "type": "string",
                "description": "Merchant name"
            },
            "category": {
                "type": "string",
                "enum": ["retail", "travel", "food", "entertainment"],
                "description": "Transaction category"
            }
        },
        "required": ["amount", "merchant"]
    },
    version="1.0",
    requires_approval=False
)

# Implement handler
async def validate_transaction_handler(params: Dict[str, Any]) -> Dict[str, Any]:
    amount = params["amount"]
    merchant = params["merchant"]
    category = params.get("category")
    
    # Validation logic
    validation_result = await transaction_validator.validate(
        amount=amount,
        merchant=merchant,
        category=category
    )
    
    return {
        "is_valid": validation_result.is_valid,
        "risk_score": validation_result.risk_score,
        "requires_approval": validation_result.requires_approval,
        "validation_details": validation_result.details
    }

# Register function and handler
function_service.register_function(validate_transaction)
function_service.register_handler(
    "validate_transaction",
    validate_transaction_handler
)
```

### Usage in AI Agent

```python
# Use in agent conversation
response = await openai_service.create_chat_completion(
    messages=[
        {"role": "user", "content": "Process a $500 purchase from Amazon"}
    ],
    functions=[validate_transaction],
    function_call={"name": "validate_transaction"}
)

if response.choices[0].message.function_call:
    function_call = response.choices[0].message.function_call
    validation_result = await function_service.execute_function(
        function_call.name,
        json.loads(function_call.arguments)
    )
    
    if validation_result["is_valid"]:
        # Process transaction
        pass
    else:
        # Handle validation failure
        pass