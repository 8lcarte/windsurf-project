from typing import Any, Dict, List, Optional, Union
from pydantic import AnyHttpUrl, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', case_sensitive=True)

    PROJECT_NAME: str = "AI Payment Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    DEBUG: bool = False
    PORT: int = 8000
    JWT_SECRET: str

    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL_NAME: str = "gpt-4-1106-preview"
    OPENAI_MAX_TOKENS: int = 4000
    OPENAI_TEMPERATURE: float = 0.7
    OPENAI_REQUEST_TIMEOUT: int = 60
    
    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode='before')
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # Database
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    SQLALCHEMY_DATABASE_URI: Optional[PostgresDsn] = None

    @field_validator("SQLALCHEMY_DATABASE_URI", mode='before')
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=values.data.get("POSTGRES_USER"),
            password=values.data.get("POSTGRES_PASSWORD"),
            host=values.data.get("POSTGRES_SERVER"),
            path=f"{values.data.get('POSTGRES_DB') or ''}",
        )

    # JWT
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Security
    VERIFICATION_CODE_EXPIRE_MINUTES: int = 15
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 60
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15
    MIN_PASSWORD_LENGTH: int = 8
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    
    # Rate Limiting
    RATE_LIMIT_LOGIN_MAX: int = 5  # Max login attempts per window
    RATE_LIMIT_LOGIN_WINDOW: int = 300  # 5 minutes
    RATE_LIMIT_REGISTER_MAX: int = 3  # Max registrations per window
    RATE_LIMIT_REGISTER_WINDOW: int = 3600  # 1 hour
    RATE_LIMIT_FORGOT_PASSWORD_MAX: int = 3  # Max password reset requests per window
    RATE_LIMIT_FORGOT_PASSWORD_WINDOW: int = 3600  # 1 hour
    RATE_LIMIT_EMAIL_VERIFY_MAX: int = 5  # Max email verification attempts per window
    RATE_LIMIT_EMAIL_VERIFY_WINDOW: int = 300  # 5 minutes
    
    # Email
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = None
    
    # OAuth2 Social Login
    OAUTH2_STATE_EXPIRE_MINUTES: int = 10
    
    # Google OAuth2
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None
    
    # GitHub OAuth2
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    GITHUB_REDIRECT_URI: Optional[str] = None
    
    # Stripe
    STRIPE_API_KEY: str
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

settings = Settings()
