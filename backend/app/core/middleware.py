from typing import Callable
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import time
import uuid
import logging
from .config import settings

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Log request
        logger.info(
            f"Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "client_ip": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent")
            }
        )
        
        start_time = time.time()
        
        try:
            response = await call_next(request)
            
            # Log response
            process_time = time.time() - start_time
            logger.info(
                f"Request completed",
                extra={
                    "request_id": request_id,
                    "status_code": response.status_code,
                    "process_time": f"{process_time:.3f}s"
                }
            )
            
            # Add custom headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.3f}s"
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"Request failed",
                extra={
                    "request_id": request_id,
                    "error": str(e),
                    "process_time": f"{process_time:.3f}s"
                }
            )
            raise

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Add security headers from config
        for header, value in settings.SECURITY_HEADERS.items():
            response.headers[header] = value
            
        return response

class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip API key check for certain paths
        skip_paths = [
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/docs",
            "/api/v1/openapi.json"
        ]
        
        if request.url.path in skip_paths:
            return await call_next(request)
            
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return Response(
                status_code=401,
                content="Missing API key",
                media_type="text/plain"
            )
            
        # TODO: Implement API key validation against database
        # For now, just check if it matches a configured key
        if api_key != settings.API_KEY:
            return Response(
                status_code=401,
                content="Invalid API key",
                media_type="text/plain"
            )
            
        return await call_next(request)

def setup_middleware(app: FastAPI) -> None:
    """Configure all middleware for the application"""
    
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[
            "X-Request-ID",
            "X-Process-Time",
            "Content-Disposition"
        ],
        max_age=600  # 10 minutes
    )
    
    # Trusted Hosts
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "localhost",
            "127.0.0.1",
            "windsurf.com",
            "*.windsurf.com"
        ]
    )
    
    # Compression
    app.add_middleware(
        GZipMiddleware,
        minimum_size=1000  # Only compress responses larger than 1KB
    )
    
    # Custom middleware
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Add API key middleware only in production
    if settings.ENVIRONMENT == "production":
        app.add_middleware(APIKeyMiddleware)
    
    # Log middleware setup
    logger.info(
        "Middleware configured",
        extra={
            "cors_origins": settings.BACKEND_CORS_ORIGINS,
            "environment": settings.ENVIRONMENT,
            "security_headers": list(settings.SECURITY_HEADERS.keys())
        }
    )

def get_client_ip(request: Request) -> str:
    """Get client IP from request, handling proxies"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Get the first IP in the chain
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def get_request_id(request: Request) -> str:
    """Get request ID from request state"""
    return getattr(request.state, "request_id", str(uuid.uuid4()))