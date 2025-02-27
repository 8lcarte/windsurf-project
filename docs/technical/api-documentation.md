# API Documentation

## Overview

This document provides detailed information about the AI Agent Platform's REST API endpoints, authentication, and usage.

## Authentication

All API requests must be authenticated using JWT tokens. Include the token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

### Getting an Access Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

## API Endpoints

### Agents

#### List Agents

```http
GET /api/v1/agents
```

Query Parameters:
- `status` (optional): Filter by agent status (active, inactive, suspended)
- `type` (optional): Filter by agent type
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page (default: 20)

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Shopping Assistant",
      "description": "AI assistant for shopping tasks",
      "type": "shopping",
      "status": "active",
      "daily_spend_limit": 1000.00,
      "current_daily_spend": 250.00,
      "monthly_spend_limit": 5000.00,
      "current_monthly_spend": 1000.00,
      "allowed_merchant_categories": ["retail", "groceries"],
      "blocked_merchant_categories": ["gambling"],
      "allowed_merchants": ["Amazon", "Walmart"],
      "blocked_merchants": ["BlockedStore"],
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-02-27T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 20
  }
}
```

#### Create Agent

```http
POST /api/v1/agents
Content-Type: application/json

{
  "name": "Shopping Assistant",
  "description": "AI assistant for shopping tasks",
  "type": "shopping",
  "daily_spend_limit": 1000.00,
  "monthly_spend_limit": 5000.00,
  "allowed_merchant_categories": ["retail", "groceries"],
  "blocked_merchant_categories": ["gambling"],
  "allowed_merchants": ["Amazon", "Walmart"],
  "blocked_merchants": ["BlockedStore"]
}
```

#### Update Agent

```http
PATCH /api/v1/agents/{agent_id}
Content-Type: application/json

{
  "daily_spend_limit": 2000.00,
  "status": "inactive"
}
```

#### Delete Agent

```http
DELETE /api/v1/agents/{agent_id}
```

### Transactions

#### List Transactions

```http
GET /api/v1/transactions
```

Query Parameters:
- `agent_id` (optional): Filter by agent
- `status` (optional): Filter by status (pending, completed, failed)
- `from_date` (optional): Start date
- `to_date` (optional): End date
- `page` (optional): Page number
- `limit` (optional): Items per page

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "agent_id": 1,
      "amount": 150.00,
      "merchant": "Amazon",
      "category": "retail",
      "status": "completed",
      "risk_score": 0.2,
      "created_at": "2025-02-27T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

#### Create Transaction

```http
POST /api/v1/transactions
Content-Type: application/json

{
  "agent_id": 1,
  "amount": 150.00,
  "merchant": "Amazon",
  "category": "retail",
  "description": "Office supplies purchase"
}
```

### Monitoring

#### Get Metrics

```http
GET /api/v1/monitoring/metrics
```

Response:
```json
{
  "success": true,
  "data": {
    "active_agents": 5,
    "total_transactions": 150,
    "success_rate": 0.95,
    "average_response_time": 0.8,
    "risk_distribution": {
      "low": 80,
      "medium": 15,
      "high": 5
    },
    "top_merchants": [
      {
        "name": "Amazon",
        "transaction_count": 45
      }
    ]
  }
}
```

#### Get Alerts

```http
GET /api/v1/monitoring/alerts
```

Query Parameters:
- `severity` (optional): Filter by severity (low, medium, high)
- `type` (optional): Filter by alert type
- `status` (optional): Filter by status (active, acknowledged)

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "risk_threshold",
      "severity": "high",
      "message": "Risk threshold exceeded",
      "created_at": "2025-02-27T10:30:00Z",
      "status": "active"
    }
  ]
}
```

#### Acknowledge Alert

```http
POST /api/v1/monitoring/alerts/{alert_id}/acknowledge
```

### Function Registry

#### List Functions

```http
GET /api/v1/functions
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "name": "validate_transaction",
      "description": "Validate a transaction against spending rules",
      "parameters": {
        "type": "object",
        "properties": {
          "amount": {"type": "number"},
          "merchant": {"type": "string"},
          "category": {"type": "string"}
        },
        "required": ["amount", "merchant"]
      },
      "version": "1.0"
    }
  ]
}
```

## Error Handling

The API uses standard HTTP status codes and returns error details in the response body:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "amount": ["Amount must be greater than 0"]
    }
  }
}
```

Common Error Codes:
- `400`: Bad Request - Invalid input parameters
- `401`: Unauthorized - Missing or invalid authentication
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource doesn't exist
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server-side error

## Rate Limiting

API requests are rate-limited based on the client's API key. The current limits are:
- 100 requests per minute per IP
- 1000 requests per hour per API key

Rate limit headers are included in all responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1582162878
```

## Webhooks

The platform can send webhook notifications for important events:

1. Configure webhook endpoint:
```http
POST /api/v1/webhooks
Content-Type: application/json

{
  "url": "https://your-server.com/webhook",
  "events": ["transaction.completed", "alert.created"],
  "secret": "your_webhook_secret"
}
```

2. Webhook payload example:
```json
{
  "event": "transaction.completed",
  "data": {
    "transaction_id": 123,
    "amount": 150.00,
    "status": "completed"
  },
  "timestamp": "2025-02-27T10:30:00Z"
}
```

## SDK Support

Official SDKs are available for:
- Python: [GitHub Repository](https://github.com/example/python-sdk)
- JavaScript: [GitHub Repository](https://github.com/example/js-sdk)
- Go: [GitHub Repository](https://github.com/example/go-sdk)

## Best Practices

1. Always use HTTPS for API requests
2. Implement proper error handling
3. Use pagination for large result sets
4. Cache responses when appropriate
5. Handle rate limits gracefully
6. Validate webhook signatures
7. Keep access tokens secure

## Support

For API support:
- Email: api-support@example.com
- Documentation: https://docs.example.com
- Status page: https://status.example.com