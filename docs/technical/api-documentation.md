# API Documentation

## Overview
This document provides comprehensive documentation for the platform's API endpoints, authentication, and usage.

## Authentication
The API uses OAuth2 for authentication. All requests must include a valid access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Base URL
```
https://api.platform.com/v1
```

## Endpoints

### Virtual Cards
#### GET /virtual-cards
Retrieves a list of virtual cards for the authenticated user.

**Parameters:**
- `status` (optional): Filter by card status (active, inactive, suspended)
- `limit` (optional): Number of records to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "vc_123",
      "status": "active",
      "last4": "4242",
      "expMonth": 12,
      "expYear": 2025,
      "spendingLimits": {
        "monthly": 5000,
        "perTransaction": 1000
      }
    }
  ],
  "total": 1,
  "hasMore": false
}
```

### Transactions
#### GET /transactions
Retrieves transaction history.

**Parameters:**
- `startDate` (optional): Filter by start date (ISO 8601)
- `endDate` (optional): Filter by end date (ISO 8601)
- `status` (optional): Filter by transaction status
- `limit` (optional): Number of records to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "tx_123",
      "amount": 42.50,
      "currency": "USD",
      "status": "completed",
      "merchantName": "Example Store",
      "category": "retail",
      "timestamp": "2025-02-17T14:18:00Z"
    }
  ],
  "total": 1,
  "hasMore": false
}
```

### AI Agents
#### GET /agents
Retrieves available AI agents.

**Response:**
```json
{
  "data": [
    {
      "id": "agent_123",
      "name": "Expense Validator",
      "status": "active",
      "capabilities": [
        "transaction_validation",
        "category_assignment"
      ]
    }
  ]
}
```

## Error Handling
The API uses standard HTTP status codes and returns error details in the response body:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Invalid parameters provided",
    "details": {
      "field": "amount",
      "issue": "must be greater than 0"
    }
  }
}
```

Common status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Rate Limiting
API requests are rate limited based on the client IP address and API key. Current limits:
- 100 requests per minute per IP
- 1000 requests per hour per API key

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1582162878