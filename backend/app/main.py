from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.api.v1.api import api_router
from app.core.config import settings

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=settings.PROJECT_NAME,
        version="0.1.0",
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

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc"
)

# Configure CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/")
async def root():
    return {"message": "Welcome to AI Agent Payment Platform API"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "0.1.0"
    }

# Set up custom OpenAPI schema
app.openapi = custom_openapi

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)
