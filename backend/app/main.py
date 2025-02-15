from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
import logging
import time
from contextlib import asynccontextmanager

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.middleware import setup_middleware
from app.db.database import engine, SessionLocal
from app.core.exceptions import APIError
from app.db.redis import redis_client

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handle startup and shutdown events
    """
    # Startup
    try:
        # Initialize database
        async with engine.begin() as conn:
            logger.info("Running database migrations")
            # await conn.run_sync(Base.metadata.create_all)
        
        # Initialize Redis connection
        logger.info("Establishing Redis connection")
        await redis_client.ping()
        
        # Warm up any caches
        logger.info("Warming up caches")
        
        logger.info("Application startup complete")
        yield
        
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise
    
    # Shutdown
    finally:
        logger.info("Shutting down application")
        await engine.dispose()
        await redis_client.close()
        logger.info("Cleanup complete")

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="""A secure payment platform enabling AI agents to make authorized financial transactions.

        ## Features

        * Virtual Card Management
        * Template-based Card Configuration
        * Spending Controls and Limits
        * Transaction Monitoring
        * AI Agent Integration

        ## Authentication

        All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:
        ```
        Authorization: Bearer <token>
        ```

        ## Rate Limiting

        API requests are rate-limited to prevent abuse. The current limits are:
        * 100 requests per minute for most endpoints
        * 10 requests per minute for card creation/modification

        ## Error Handling

        The API uses standard HTTP status codes and returns detailed error messages in the following format:
        ```json
        {
            "detail": "Error message",
            "code": "ERROR_CODE",
            "params": {}
        }
        ```
        """,
        routes=app.routes,
        tags=[
            {
                "name": "templates",
                "description": "Operations for managing card templates. Templates define reusable configurations for virtual cards."
            },
            {
                "name": "virtual-cards",
                "description": "Operations for creating and managing virtual cards."
            },
            {
                "name": "transactions",
                "description": "Operations for viewing and managing card transactions."
            },
            {
                "name": "analytics",
                "description": "Analytics and reporting endpoints for cards and transactions."
            },
        ],
    )

    # Custom extension to handle deprecation and beta features
    openapi_schema["x-api-status"] = {
        "deprecation": {
            "policy": "Deprecated endpoints will be supported for 6 months after announcement",
            "notification": "Deprecation notices are sent via email and API response headers"
        },
        "beta": {
            "policy": "Beta endpoints may change without notice",
            "stability": "Beta features are marked with [Beta] in their descriptions"
        }
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.ENABLE_DOCS else None,
    docs_url=f"{settings.API_V1_STR}/docs" if settings.ENABLE_SWAGGER_UI else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if settings.ENABLE_REDOC else None,
    lifespan=lifespan
)

# Set up middleware
setup_middleware(app)

# Error handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "request_id": request.state.request_id
        }
    )

@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "code": exc.code,
            "params": exc.params,
            "request_id": request.state.request_id
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Unhandled exception",
        extra={
            "request_id": request.state.request_id,
            "error": str(exc),
            "path": request.url.path
        },
        exc_info=True
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "request_id": request.state.request_id
        }
    )

# Health check endpoints
@app.get("/health")
async def health_check():
    """Basic health check"""
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with component status"""
    start_time = time.time()
    health_status = {
        "status": "healthy",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "components": {}
    }
    
    # Check database
    try:
        db = SessionLocal()
        await db.execute("SELECT 1")
        health_status["components"]["database"] = {
            "status": "healthy",
            "type": "postgresql"
        }
    except Exception as e:
        health_status["components"]["database"] = {
            "status": "unhealthy",
            "error": str(e),
            "type": "postgresql"
        }
        health_status["status"] = "degraded"
    finally:
        await db.close()
    
    # Check Redis
    try:
        await redis_client.ping()
        health_status["components"]["redis"] = {
            "status": "healthy",
            "type": "redis"
        }
    except Exception as e:
        health_status["components"]["redis"] = {
            "status": "unhealthy",
            "error": str(e),
            "type": "redis"
        }
        health_status["status"] = "degraded"
    
    # Check OpenAI API
    try:
        # Simple model list request to check API access
        from app.services.openai_service import openai_service
        await openai_service.client.models.list()
        health_status["components"]["openai"] = {
            "status": "healthy",
            "type": "api"
        }
    except Exception as e:
        health_status["components"]["openai"] = {
            "status": "unhealthy",
            "error": str(e),
            "type": "api"
        }
        health_status["status"] = "degraded"
    
    # Add response time
    health_status["response_time"] = f"{(time.time() - start_time):.3f}s"
    
    return health_status

# Set up custom OpenAPI schema
app.openapi = custom_openapi

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)
