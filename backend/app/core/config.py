from typing import Any, Dict, List, Optional, Union
from pydantic import AnyHttpUrl, PostgresDsn, field_validator, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Environment(str):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=f".env.{os.getenv('APP_ENV', 'development')}",
        case_sensitive=True,
        env_prefix="APP_"
    )

    # Environment
    ENVIRONMENT: Environment = Environment.DEVELOPMENT
    PROJECT_NAME: str = "AI Payment Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    PORT: int = 8000

    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = [
        "http://localhost:3000",  # Development frontend
        "http://localhost:8080",  # Development alternative
        "https://staging.windsurf.com",  # Staging
        "https://windsurf.com"  # Production
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode='before')
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Security
    JWT_SECRET: SecretStr
    SECRET_KEY: SecretStr
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    VERIFICATION_CODE_EXPIRE_MINUTES: int = 15
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 60
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15
    MIN_PASSWORD_LENGTH: int = 12  # Increased from 8
    REQUIRE_PASSWORD_SPECIAL_CHAR: bool = True
    REQUIRE_PASSWORD_NUMBER: bool = True
    REQUIRE_PASSWORD_UPPERCASE: bool = True
    SESSION_COOKIE_SECURE: bool = True
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "Lax"
    
    # Security Headers
    SECURITY_HEADERS: Dict[str, str] = {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://api.openai.com https://api.stripe.com"
        ),
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
    }

    # Database
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: SecretStr
    POSTGRES_DB: str
    SQLALCHEMY_DATABASE_URI: Optional[PostgresDsn] = None
    SQLALCHEMY_POOL_SIZE: int = 5
    SQLALCHEMY_MAX_OVERFLOW: int = 10
    SQLALCHEMY_POOL_TIMEOUT: int = 30

    @field_validator("SQLALCHEMY_DATABASE_URI", mode='before')
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=values.data.get("POSTGRES_USER"),
            password=str(values.data.get("POSTGRES_PASSWORD")),
            host=values.data.get("POSTGRES_SERVER"),
            path=f"{values.data.get('POSTGRES_DB') or ''}",
        )

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[SecretStr] = None
    REDIS_DB: int = 0
    REDIS_SSL: bool = False
    REDIS_POOL_SIZE: int = 10
    REDIS_RETRY_ON_TIMEOUT: bool = True
    REDIS_RETRY_ON_ERROR: bool = True

    # Rate Limiting
    RATE_LIMIT_DEFAULT_MAX: int = 100  # Default requests per window
    RATE_LIMIT_DEFAULT_WINDOW: int = 60  # 1 minute
    RATE_LIMIT_LOGIN_MAX: int = 5
    RATE_LIMIT_LOGIN_WINDOW: int = 300
    RATE_LIMIT_REGISTER_MAX: int = 3
    RATE_LIMIT_REGISTER_WINDOW: int = 3600
    RATE_LIMIT_FORGOT_PASSWORD_MAX: int = 3
    RATE_LIMIT_FORGOT_PASSWORD_WINDOW: int = 3600
    RATE_LIMIT_EMAIL_VERIFY_MAX: int = 5
    RATE_LIMIT_EMAIL_VERIFY_WINDOW: int = 300
    RATE_LIMIT_API_KEY_MAX: int = 1000
    RATE_LIMIT_API_KEY_WINDOW: int = 3600

    # OpenAI
    OPENAI_API_KEY: SecretStr
    OPENAI_MODEL_NAME: str = "gpt-4-1106-preview"
    OPENAI_MAX_TOKENS: int = 4000
    OPENAI_TEMPERATURE: float = 0.7
    OPENAI_REQUEST_TIMEOUT: int = 60
    OPENAI_RETRY_COUNT: int = 3
    OPENAI_RETRY_BACKOFF: float = 2.0

    # Email
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[SecretStr] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = None
    EMAIL_TEMPLATES_DIR: str = "app/email-templates"
    EMAIL_RESET_TOKEN_EXPIRE_HOURS: int = 48

    # OAuth2 Social Login
    OAUTH2_STATE_EXPIRE_MINUTES: int = 10
    OAUTH2_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    OAUTH2_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Google OAuth2
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[SecretStr] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None

    # GitHub OAuth2
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[SecretStr] = None
    GITHUB_REDIRECT_URI: Optional[str] = None

    # Stripe
    STRIPE_API_KEY: SecretStr
    STRIPE_WEBHOOK_SECRET: Optional[SecretStr] = None
    STRIPE_API_VERSION: str = "2023-10-16"

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: Optional[str] = None
    SENTRY_DSN: Optional[str] = None

    # Feature Flags
    ENABLE_DOCS: bool = True
    ENABLE_METRICS: bool = True
    ENABLE_PROFILING: bool = False
    ENABLE_SWAGGER_UI: bool = True
    ENABLE_REDOC: bool = True

    def get_environment_variables(self) -> Dict[str, Any]:
        """Get all environment variables with sensitive data masked"""
        env_vars = self.model_dump()
        for key, value in env_vars.items():
            if isinstance(value, SecretStr):
                env_vars[key] = "***"
        return env_vars

settings = Settings()
