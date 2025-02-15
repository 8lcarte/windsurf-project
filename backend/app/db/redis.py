from typing import AsyncGenerator, Optional, Any
from redis.asyncio import Redis, ConnectionPool, RedisError
from redis.asyncio.retry import Retry
from redis.backoff import ExponentialBackoff
from contextlib import asynccontextmanager
import logging
import time
import json
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError

logger = logging.getLogger(__name__)

class RedisStats:
    """Track Redis statistics"""
    def __init__(self):
        self.total_operations = 0
        self.failed_operations = 0
        self.total_operation_time = 0
        self.last_error_time = None
        self.last_error_message = None

    def record_operation(self, duration: float, success: bool = True):
        self.total_operations += 1
        self.total_operation_time += duration
        if not success:
            self.failed_operations += 1

    def record_error(self, error: Exception):
        self.last_error_time = time.time()
        self.last_error_message = str(error)

    def get_stats(self) -> dict:
        return {
            "total_operations": self.total_operations,
            "failed_operations": self.failed_operations,
            "average_operation_time": (
                self.total_operation_time / self.total_operations 
                if self.total_operations > 0 else 0
            ),
            "success_rate": (
                (self.total_operations - self.failed_operations) / self.total_operations * 100
                if self.total_operations > 0 else 0
            ),
            "last_error_time": self.last_error_time,
            "last_error_message": self.last_error_message
        }

redis_stats = RedisStats()

# Configure retry strategy
retry_strategy = Retry(
    ExponentialBackoff(cap=10, base=1),
    3
)

# Create a connection pool with proper configuration
redis_pool = ConnectionPool(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD,
    db=settings.REDIS_DB,
    decode_responses=True,
    ssl=settings.REDIS_SSL,
    ssl_cert_reqs=None if not settings.REDIS_SSL else "required",
    max_connections=settings.REDIS_POOL_SIZE,
    socket_timeout=5.0,  # 5 second socket timeout
    socket_connect_timeout=2.0,  # 2 second connection timeout
    retry_on_timeout=settings.REDIS_RETRY_ON_TIMEOUT,
    retry_on_error=settings.REDIS_RETRY_ON_ERROR,
    retry=retry_strategy,
    health_check_interval=30  # Check connection health every 30 seconds
)

# Create Redis client
redis_client = Redis(connection_pool=redis_pool)

@asynccontextmanager
async def get_redis_connection() -> AsyncGenerator[Redis, None]:
    """
    Get Redis connection with automatic cleanup and error handling.
    Use as async context manager.
    """
    start_time = time.time()
    success = True

    try:
        # Test connection
        await redis_client.ping()
        yield redis_client
    except RedisError as e:
        success = False
        redis_stats.record_error(e)
        logger.error(f"Redis error: {str(e)}")
        raise ServiceUnavailableError(
            detail="Redis service unavailable",
            retry_after=5
        ) from e
    finally:
        operation_time = time.time() - start_time
        redis_stats.record_operation(operation_time, success)

async def get_redis() -> AsyncGenerator[Redis, None]:
    """FastAPI dependency for Redis connections"""
    async with get_redis_connection() as redis:
        yield redis

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
async def execute_redis_operation(operation: str, *args, **kwargs) -> Any:
    """
    Execute Redis operation with retry logic and monitoring
    
    Args:
        operation: Redis operation name (e.g., 'get', 'set')
        *args: Operation arguments
        **kwargs: Operation keyword arguments
        
    Returns:
        Operation result
        
    Raises:
        ServiceUnavailableError: If operation fails after retries
    """
    start_time = time.time()
    success = True

    try:
        redis_op = getattr(redis_client, operation)
        result = await redis_op(*args, **kwargs)
        return result
    except RedisError as e:
        success = False
        redis_stats.record_error(e)
        logger.error(f"Redis operation '{operation}' failed: {str(e)}")
        raise ServiceUnavailableError(
            detail=f"Redis operation failed: {str(e)}",
            retry_after=5
        ) from e
    finally:
        operation_time = time.time() - start_time
        redis_stats.record_operation(operation_time, success)

# Utility functions for common operations
async def cache_get(key: str) -> Optional[Any]:
    """Get value from cache with JSON deserialization"""
    value = await execute_redis_operation('get', key)
    if value:
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return None

async def cache_set(
    key: str,
    value: Any,
    expire: Optional[int] = None
) -> bool:
    """Set cache value with JSON serialization"""
    if isinstance(value, (dict, list)):
        value = json.dumps(value)
    if expire:
        return await execute_redis_operation('setex', key, expire, value)
    return await execute_redis_operation('set', key, value)

async def cache_delete(key: str) -> bool:
    """Delete cache key"""
    return bool(await execute_redis_operation('delete', key))

async def cache_exists(key: str) -> bool:
    """Check if key exists in cache"""
    return bool(await execute_redis_operation('exists', key))

async def check_redis_health() -> dict:
    """
    Check Redis health and return status information
    """
    try:
        start_time = time.time()
        await redis_client.ping()
        response_time = time.time() - start_time
        
        # Get Redis info
        info = await redis_client.info()
        
        return {
            "status": "healthy",
            "response_time": f"{response_time:.3f}s",
            "version": info.get("redis_version"),
            "connected_clients": info.get("connected_clients"),
            "used_memory_human": info.get("used_memory_human"),
            "total_connections_received": info.get("total_connections_received"),
            "total_commands_processed": info.get("total_commands_processed"),
            "stats": redis_stats.get_stats()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "stats": redis_stats.get_stats()
        }

async def cleanup_redis_connections():
    """
    Cleanup Redis connections.
    Call periodically to prevent connection leaks.
    """
    try:
        await redis_pool.disconnect()
        logger.info("Redis connections cleaned up")
    except Exception as e:
        logger.error(f"Failed to cleanup Redis connections: {str(e)}")
