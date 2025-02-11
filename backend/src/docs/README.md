# API Documentation

## Overview

This document provides detailed information about the Digital Wallet API endpoints, authentication, and usage examples.

## Authentication

All API endpoints require authentication using Bearer tokens. Include the JWT token in the Authorization header:

```http
Authorization: Bearer <your_token>
```

## API Specification

The complete API specification is available in OpenAPI (Swagger) format at `openapi.yaml`. You can view this file using any OpenAPI viewer or import it into tools like Postman.

## Available Endpoints

### Payment Methods

#### List Payment Methods
```http
GET /api/v1/funding/payment-methods
```
Returns all payment methods for the authenticated user.

#### Add Payment Method
```http
POST /api/v1/funding/payment-methods
Content-Type: application/json

{
  "provider": "paypal"
}
```
Adds a new payment method for the authenticated user.

#### Remove Payment Method
```http
DELETE /api/v1/funding/payment-methods/{id}
```
Removes the specified payment method.

#### Set Default Payment Method
```http
PUT /api/v1/funding/payment-methods/{id}/default
```
Sets the specified payment method as the default.

### Recurring Payments

#### List Recurring Payments
```http
GET /api/v1/funding/recurring
```
Returns all recurring payments for the authenticated user.

#### Create Recurring Payment
```http
POST /api/v1/funding/recurring
Content-Type: application/json

{
  "amount": 100.00,
  "currency": "USD",
  "frequency": "monthly",
  "provider": "paypal",
  "description": "Monthly subscription",
  "emailNotifications": {
    "enabled": true,
    "reminderDays": 3,
    "notifyOnSuccess": true,
    "notifyOnFailure": true
  }
}
```
Creates a new recurring payment.

#### Update Recurring Payment
```http
PUT /api/v1/funding/recurring/{id}
Content-Type: application/json

{
  "amount": 150.00,
  "emailNotifications": {
    "reminderDays": 5
  }
}
```
Updates an existing recurring payment. All fields are optional.

#### Delete Recurring Payment
```http
DELETE /api/v1/funding/recurring/{id}
```
Deletes the specified recurring payment.

### Transactions

#### List Transactions
```http
GET /api/v1/funding/transactions
```

Optional query parameters:
- `provider`: Filter by payment provider (paypal, venmo, cashapp)
- `status`: Filter by status (completed, pending, failed)
- `recurring`: Filter recurring transactions (true/false)
- `startDate`: Filter by start date (YYYY-MM-DD)
- `endDate`: Filter by end date (YYYY-MM-DD)

### Email Templates

#### List Email Templates
```http
GET /api/v1/email-templates?agentId=<agent_id>
```
Returns all email templates for the specified agent.

#### Create Email Template
```http
POST /api/v1/email-templates
Content-Type: application/json

{
  "name": "Custom Payment Success",
  "type": "payment_success",
  "subject": "Payment Confirmed - {{amount}}",
  "html": "<html>...</html>",
  "variables": ["amount", "currency", "provider"],
  "agentId": "your-agent-id"
}
```
Creates a new email template.

#### Update Email Template
```http
PUT /api/v1/email-templates/{id}
Content-Type: application/json

{
  "name": "Updated Template Name",
  "subject": "New Subject Line",
  "html": "<html>...</html>"
}
```
Updates an existing email template.

#### Delete Email Template
```http
DELETE /api/v1/email-templates/{id}
```
Deletes the specified email template.

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "error": null
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {
      // Additional error details
    }
  }
}
```

## Rate Limiting

To ensure fair usage and system stability, the API implements rate limiting:

- Regular endpoints: 100 requests per minute
- Email template operations: 30 requests per minute

When rate limited, the API will return a 429 Too Many Requests response with a Retry-After header.

## Error Codes

Common error codes you might encounter:

- `INVALID_REQUEST`: The request payload is invalid
- `UNAUTHORIZED`: Authentication token is missing or invalid
- `FORBIDDEN`: The user doesn't have permission for this operation
- `NOT_FOUND`: The requested resource doesn't exist
- `RATE_LIMITED`: Too many requests, try again later
- `VALIDATION_ERROR`: Input validation failed
- `INTERNAL_ERROR`: An unexpected error occurred

## Testing

You can use our sandbox environment for testing:
```bash
https://api-sandbox.yourapp.com/api/v1
```

The sandbox environment provides test credentials and doesn't process real transactions.
