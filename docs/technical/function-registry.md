# Function Registry Guide

## Overview
The Function Registry is a central system that manages and controls the functions available to AI agents. It provides a structured way to register, version, and maintain functions while ensuring proper access control and validation.

## Function Registration

### Function Structure
Each function in the registry must be defined with the following properties:

```python
{
    "name": str,                # Unique function identifier
    "version": str,             # Semantic version (e.g., "1.0.0")
    "description": str,         # Detailed function description
    "parameters": dict,         # JSON Schema of parameters
    "required_permissions": [],  # List of required permissions
    "category": str,            # Function category
    "is_active": bool          # Function availability flag
}
```

### Registration Process
1. Define function metadata
2. Validate schema
3. Register in database
4. Assign permissions
5. Enable for use

Example:
```python
from app.models.agent_function import AgentFunction

new_function = AgentFunction(
    name="validate_merchant_category",
    version="1.0.0",
    description="Validates and classifies merchant categories",
    parameters={
        "type": "object",
        "properties": {
            "merchant_name": {
                "type": "string",
                "description": "Name of the merchant"
            },
            "transaction_amount": {
                "type": "number",
                "description": "Transaction amount"
            }
        },
        "required": ["merchant_name"]
    },
    required_permissions=["category_management"],
    category="transaction_validation",
    is_active=True
)

db.session.add(new_function)
db.session.commit()
```

## Version Management

### Versioning Rules
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Major: Breaking changes
- Minor: New features, backward compatible
- Patch: Bug fixes, backward compatible

### Version Updates
```python
def update_function_version(function_id: str, new_version: str):
    function = AgentFunction.query.get(function_id)
    
    # Archive current version
    function.archive_current_version()
    
    # Create new version
    function.version = new_version
    function.updated_at = datetime.utcnow()
    
    db.session.commit()
```

## Access Control

### Permission Levels
1. Read
   - View function metadata
   - Access documentation
   
2. Execute
   - Call function
   - Receive results
   
3. Manage
   - Create/update functions
   - Manage versions
   - Control access

### Permission Assignment
```python
def assign_function_permission(
    function_id: str,
    agent_id: str,
    permission_level: str
):
    permission = FunctionPermission(
        function_id=function_id,
        agent_id=agent_id,
        permission_level=permission_level
    )
    db.session.add(permission)
    db.session.commit()
```

## Function Categories

### Standard Categories
1. Transaction Processing
   - Payment validation
   - Fraud detection
   - Category assignment

2. User Management
   - Profile updates
   - Preference management
   - Access control

3. Analytics
   - Data analysis
   - Report generation
   - Insight creation

### Category Management
```python
def create_function_category(
    name: str,
    description: str,
    parent_category_id: Optional[str] = None
):
    category = FunctionCategory(
        name=name,
        description=description,
        parent_category_id=parent_category_id
    )
    db.session.add(category)
    db.session.commit()
```

## Validation and Testing

### Schema Validation
```python
def validate_function_schema(parameters: dict):
    try:
        jsonschema.validate(
            instance=parameters,
            schema=FUNCTION_SCHEMA
        )
        return True, None
    except jsonschema.exceptions.ValidationError as e:
        return False, str(e)
```

### Function Testing
```python
def test_function(
    function_id: str,
    test_parameters: dict
) -> TestResult:
    function = AgentFunction.query.get(function_id)
    
    # Validate parameters
    is_valid, error = validate_function_schema(test_parameters)
    if not is_valid:
        return TestResult(success=False, error=error)
    
    # Execute test
    try:
        result = function.execute(test_parameters)
        return TestResult(success=True, result=result)
    except Exception as e:
        return TestResult(success=False, error=str(e))
```

## Monitoring and Metrics

### Key Metrics
1. Usage Statistics
   - Calls per function
   - Success/failure rates
   - Average execution time
   
2. Version Metrics
   - Active versions
   - Deprecated versions
   - Version adoption rates

3. Performance Metrics
   - Response times
   - Error rates
   - Resource usage

### Metric Collection
```python
def log_function_metrics(
    function_id: str,
    execution_time: float,
    success: bool,
    error: Optional[str] = None
):
    metric = FunctionMetric(
        function_id=function_id,
        execution_time=execution_time,
        success=success,
        error=error,
        timestamp=datetime.utcnow()
    )
    db.session.add(metric)
    db.session.commit()
```

## Best Practices

1. Function Design
   - Keep functions atomic
   - Use clear naming conventions
   - Provide comprehensive documentation
   - Include example usage

2. Version Management
   - Plan breaking changes
   - Maintain backward compatibility
   - Communicate updates
   - Set deprecation schedules

3. Security
   - Validate all inputs
   - Implement rate limiting
   - Monitor for abuse
   - Regular security audits

4. Testing
   - Unit test all functions
   - Integration testing
   - Performance testing
   - Security testing