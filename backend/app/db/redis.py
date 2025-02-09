from typing import AsyncGenerator
from redis.asyncio import Redis, ConnectionPool

from app.core.config import settings

# Create a connection pool
redis_pool = ConnectionPool(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD,
    db=settings.REDIS_DB,
    decode_responses=True,
)

async def get_redis() -> AsyncGenerator[Redis, None]:
    """Get Redis connection from pool."""
    async with Redis(connection_pool=redis_pool) as redis:
        yield redis
