from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
import time
from fastapi import HTTPException, Request, status
from redis.asyncio import Redis
import json

from app.core.config import settings

class RateLimiter:
    def __init__(self, redis: Redis):
        self.redis = redis
        self._cache: Dict[str, Dict[str, float]] = {}
        self._last_cleanup = time.time()
    
    async def _get_client_identifier(self, request: Request) -> str:
        """Get a unique identifier for the client."""
        # Try to get from X-Forwarded-For header first
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # Fallback to client host
        return request.client.host if request.client else "unknown"
    
    async def is_rate_limited(
        self,
        request: Request,
        key: str,
        max_requests: int,
        window_seconds: int
    ) -> Tuple[bool, Optional[int]]:
        """
        Check if the request should be rate limited.
        Returns (is_limited, retry_after_seconds).
        """
        now = datetime.utcnow().timestamp()
        client_id = await self._get_client_identifier(request)
        redis_key = f"ratelimit:{key}:{client_id}"
        
        # Get current requests data
        requests_data = await self.redis.get(redis_key)
        if requests_data:
            data = json.loads(requests_data)
            requests = data["requests"]
            window_start = data["window_start"]
        else:
            requests = []
            window_start = now
        
        # Remove old requests
        window_start_time = datetime.fromtimestamp(window_start)
        cutoff = datetime.utcnow() - timedelta(seconds=window_seconds)
        requests = [ts for ts in requests if datetime.fromtimestamp(ts) > cutoff]
        
        # Check if rate limit is exceeded
        if len(requests) >= max_requests:
            retry_after = int(window_start_time + timedelta(seconds=window_seconds) - datetime.utcnow()).seconds
            return True, retry_after
        
        # Add current request
        requests.append(now)
        
        # Update Redis
        await self.redis.setex(
            redis_key,
            window_seconds,
            json.dumps({
                "requests": requests,
                "window_start": window_start
            })
        )
        
        return False, None

class RateLimitException(HTTPException):
    def __init__(self, retry_after: int):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many requests. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )

async def check_rate_limit(
    request: Request,
    redis: Redis,
    key: str,
    max_requests: int,
    window_seconds: int
) -> None:
    """
    Rate limiting middleware function.
    Raises RateLimitException if rate limit is exceeded.
    """
    limiter = RateLimiter(redis)
    is_limited, retry_after = await limiter.is_rate_limited(
        request, key, max_requests, window_seconds
    )
    if is_limited:
        raise RateLimitException(retry_after)
