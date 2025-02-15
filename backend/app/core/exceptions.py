from typing import Any, Dict, Optional
from fastapi import status

class APIError(Exception):
    """Base exception for API errors"""
    def __init__(
        self,
        detail: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        params: Optional[Dict[str, Any]] = None
    ):
        self.detail = detail
        self.code = code
        self.status_code = status_code
        self.params = params or {}
        super().__init__(detail)

class ValidationError(APIError):
    """Raised when request validation fails"""
    def __init__(self, detail: str, params: Optional[Dict[str, Any]] = None):
        super().__init__(
            detail=detail,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            params=params
        )

class AuthenticationError(APIError):
    """Raised when authentication fails"""
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(
            detail=detail,
            code="AUTHENTICATION_ERROR",
            status_code=status.HTTP_401_UNAUTHORIZED
        )

class AuthorizationError(APIError):
    """Raised when user lacks required permissions"""
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(
            detail=detail,
            code="AUTHORIZATION_ERROR",
            status_code=status.HTTP_403_FORBIDDEN
        )

class NotFoundError(APIError):
    """Raised when requested resource is not found"""
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(
            detail=detail,
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND
        )

class ConflictError(APIError):
    """Raised when there's a conflict with existing resource"""
    def __init__(self, detail: str, params: Optional[Dict[str, Any]] = None):
        super().__init__(
            detail=detail,
            code="CONFLICT",
            status_code=status.HTTP_409_CONFLICT,
            params=params
        )

class RateLimitError(APIError):
    """Raised when rate limit is exceeded"""
    def __init__(
        self,
        detail: str = "Rate limit exceeded",
        retry_after: Optional[int] = None
    ):
        params = {"retry_after": retry_after} if retry_after else None
        super().__init__(
            detail=detail,
            code="RATE_LIMIT_EXCEEDED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            params=params
        )

class ServiceUnavailableError(APIError):
    """Raised when a required service is unavailable"""
    def __init__(
        self,
        detail: str = "Service temporarily unavailable",
        retry_after: Optional[int] = None
    ):
        params = {"retry_after": retry_after} if retry_after else None
        super().__init__(
            detail=detail,
            code="SERVICE_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            params=params
        )

class DatabaseError(APIError):
    """Raised when database operations fail"""
    def __init__(self, detail: str = "Database error occurred"):
        super().__init__(
            detail=detail,
            code="DATABASE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class ExternalAPIError(APIError):
    """Raised when external API calls fail"""
    def __init__(
        self,
        detail: str,
        service: str,
        original_error: Optional[str] = None
    ):
        super().__init__(
            detail=detail,
            code="EXTERNAL_API_ERROR",
            status_code=status.HTTP_502_BAD_GATEWAY,
            params={
                "service": service,
                "original_error": original_error
            }
        )

class PaymentError(APIError):
    """Raised when payment processing fails"""
    def __init__(
        self,
        detail: str,
        payment_provider: str,
        error_code: Optional[str] = None
    ):
        super().__init__(
            detail=detail,
            code="PAYMENT_ERROR",
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            params={
                "payment_provider": payment_provider,
                "error_code": error_code
            }
        )

class BusinessLogicError(APIError):
    """Raised when business rules are violated"""
    def __init__(self, detail: str, code: str = "BUSINESS_RULE_VIOLATION"):
        super().__init__(
            detail=detail,
            code=code,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )

# Error code mapping for common scenarios
ERROR_CODES = {
    "INVALID_CREDENTIALS": "Invalid username or password",
    "ACCOUNT_LOCKED": "Account has been locked due to too many failed attempts",
    "INVALID_TOKEN": "Invalid or expired token",
    "INSUFFICIENT_FUNDS": "Insufficient funds for this transaction",
    "CARD_EXPIRED": "The card has expired",
    "LIMIT_EXCEEDED": "Transaction limit exceeded",
    "INVALID_MERCHANT": "Transaction not allowed for this merchant",
    "DUPLICATE_TRANSACTION": "Duplicate transaction detected",
    "INVALID_AMOUNT": "Invalid transaction amount",
    "MISSING_REQUIRED_FIELD": "Required field is missing",
    "INVALID_FORMAT": "Invalid data format",
}

def get_error_message(code: str) -> str:
    """Get standardized error message for error code"""
    return ERROR_CODES.get(code, "An unexpected error occurred")