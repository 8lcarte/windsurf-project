from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import AsyncAdaptedQueuePool
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from tenacity import retry, stop_after_attempt, wait_exponential
import logging
import time
from contextlib import asynccontextmanager

from ..core.config import settings
from ..core.exceptions import DatabaseError

logger = logging.getLogger(__name__)

# Create async engine with proper connection pooling
engine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    poolclass=AsyncAdaptedQueuePool,
    pool_pre_ping=True,  # Enable connection health checks
    pool_size=settings.SQLALCHEMY_POOL_SIZE,
    max_overflow=settings.SQLALCHEMY_MAX_OVERFLOW,
    pool_timeout=settings.SQLALCHEMY_POOL_TIMEOUT,
    pool_recycle=3600,  # Recycle connections after 1 hour
    echo=settings.DEBUG,
    connect_args={
        "server_settings": {
            "application_name": f"{settings.PROJECT_NAME}-{settings.ENVIRONMENT}"
        },
        "command_timeout": 10  # 10 second timeout for commands
    }
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False  # Disable autoflush for better control
)

class DatabaseStats:
    """Track database statistics"""
    def __init__(self):
        self.total_connections = 0
        self.active_connections = 0
        self.queries_executed = 0
        self.total_query_time = 0
        self.errors = 0
        self.last_error_time = None
        self.last_error_message = None

    def record_query(self, duration: float):
        self.queries_executed += 1
        self.total_query_time += duration

    def record_error(self, error: Exception):
        self.errors += 1
        self.last_error_time = time.time()
        self.last_error_message = str(error)

    def get_stats(self) -> dict:
        return {
            "total_connections": self.total_connections,
            "active_connections": self.active_connections,
            "queries_executed": self.queries_executed,
            "average_query_time": self.total_query_time / self.queries_executed if self.queries_executed > 0 else 0,
            "errors": self.errors,
            "last_error_time": self.last_error_time,
            "last_error_message": self.last_error_message
        }

db_stats = DatabaseStats()

@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Get database session with automatic cleanup and error handling.
    Use as async context manager.
    """
    session = AsyncSessionLocal()
    start_time = time.time()
    db_stats.total_connections += 1
    db_stats.active_connections += 1

    try:
        # Test connection with ping
        await session.execute("SELECT 1")
        yield session
    except OperationalError as e:
        db_stats.record_error(e)
        logger.error(f"Database connection error: {str(e)}")
        raise DatabaseError("Failed to establish database connection") from e
    except SQLAlchemyError as e:
        db_stats.record_error(e)
        logger.error(f"Database error: {str(e)}")
        raise DatabaseError("A database error occurred") from e
    finally:
        db_stats.active_connections -= 1
        query_time = time.time() - start_time
        db_stats.record_query(query_time)
        await session.close()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database sessions"""
    async with get_db_session() as session:
        yield session

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry_error_callback=lambda _: None  # Don't retry after max attempts
)
async def execute_with_retry(session: AsyncSession, query: str, params: dict = None) -> Any:
    """
    Execute database query with retry logic for transient errors.
    
    Args:
        session: Database session
        query: SQL query string
        params: Query parameters
        
    Returns:
        Query result
        
    Raises:
        DatabaseError: If query fails after retries
    """
    try:
        start_time = time.time()
        result = await session.execute(query, params)
        query_time = time.time() - start_time
        db_stats.record_query(query_time)

        # Log slow queries
        if query_time > 1.0:  # 1 second threshold
            logger.warning(
                f"Slow query detected",
                extra={
                    "query": query,
                    "params": params,
                    "duration": f"{query_time:.2f}s"
                }
            )

        return result
    except OperationalError as e:
        db_stats.record_error(e)
        logger.error(f"Database operation error: {str(e)}")
        raise DatabaseError("Database operation failed") from e
    except SQLAlchemyError as e:
        db_stats.record_error(e)
        logger.error(f"Database error: {str(e)}")
        raise DatabaseError("A database error occurred") from e

async def check_database_health() -> dict:
    """
    Check database health and return status information.
    """
    async with get_db_session() as session:
        try:
            start_time = time.time()
            await session.execute("SELECT 1")
            response_time = time.time() - start_time
            
            return {
                "status": "healthy",
                "response_time": f"{response_time:.3f}s",
                "pool": {
                    "size": settings.SQLALCHEMY_POOL_SIZE,
                    "overflow": settings.SQLALCHEMY_MAX_OVERFLOW,
                    "timeout": settings.SQLALCHEMY_POOL_TIMEOUT
                },
                "stats": db_stats.get_stats()
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "stats": db_stats.get_stats()
            }

async def cleanup_database_connections():
    """
    Cleanup idle database connections.
    Call periodically to prevent connection leaks.
    """
    try:
        await engine.dispose()
        logger.info("Database connections cleaned up")
    except Exception as e:
        logger.error(f"Failed to cleanup database connections: {str(e)}")
