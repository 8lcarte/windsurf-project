from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, List, Union
from enum import Enum
import time
import logging
import json
from fastapi import HTTPException, Request, status
from redis.asyncio import Redis
from dataclasses import dataclass

from app.core.config import settings
from app.core.exceptions import RateLimitError

logger = logging.getLogger(__name__)

class RateLimitStrategy(str, Enum):
    """Rate limiting strategies"""
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"
    LEAKY_BUCKET = "leaky_bucket"

@dataclass
class RateLimitRule:
    """Rate limit rule configuration"""
    key: str
    max_requests: int
    window_seconds: int
    strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW
    burst_multiplier: float = 1.0  # Allow burst up to this multiple of max_requests
    cost_per_request: int = 1  # For token bucket strategy

class RateLimitStats:
    """Track rate limiting statistics"""
    def __init__(self):
        self.total_requests = 0
        self.limited_requests = 0
        self.current_window_requests: Dict[str, int] = {}
        self.last_reset_time = time.time()

    def record_request(self, key: str, limited: bool = False):
        self.total_requests += 1
        if limited:
            self.limited_requests += 1
        self.current_window_requests[key] = self.current_window_requests.get(key, 0) + 1

    def get_stats(self) -> dict:
        return {
            "total_requests": self.total_requests,
            "limited_requests": self.limited_requests,
            "limit_rate": (
                self.limited_requests / self.total_requests * 100 
                if self.total_requests > 0 else 0
            ),
            "current_window_requests": dict(self.current_window_requests)
        }

rate_limit_stats = RateLimitStats()

class RateLimiter:
    def __init__(self, redis: Redis):
        self.redis = redis
        self._last_cleanup = time.time()

    async def _get_client_identifier(self, request: Request) -> str:
        """Get a unique identifier for the client."""
        identifiers = []
        
        # Try to get from X-Forwarded-For header
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            identifiers.append(forwarded_for.split(",")[0].strip())
        
        # Add client host
        if request.client:
            identifiers.append(request.client.host)
        
        # Add user ID if authenticated
        user = getattr(request.state, "user", None)
        if user and hasattr(user, "id"):
            identifiers.append(f"user:{user.id}")
        
        # Add API key if present
        api_key = request.headers.get("X-API-Key")
        if api_key:
            identifiers.append(f"api:{api_key}")
            
        return ":".join(identifiers) if identifiers else "unknown"

    async def _get_token_bucket(
        self,
        key: str,
        max_tokens: int,
        refill_time: int
    ) -> Tuple[int, float]:
        """Get current token count and last update time"""
        bucket_key = f"tokenbucket:{key}"
        bucket_data = await self.redis.get(bucket_key)
        
        if bucket_data:
            data = json.loads(bucket_data)
            return data["tokens"], data["last_update"]
        
        # Initialize new bucket
        now = time.time()
        await self.redis.setex(
            bucket_key,
            refill_time,
            json.dumps({"tokens": max_tokens, "last_update": now})
        )
        return max_tokens, now

    async def _update_token_bucket(
        self,
        key: str,
        tokens: int,
        max_tokens: int,
        refill_time: int,
        last_update: float
    ) -> None:
        """Update token bucket state"""
        bucket_key = f"tokenbucket:{key}"
        now = time.time()
        
        # Calculate token refill
        elapsed = now - last_update
        refill_rate = max_tokens / refill_time
        refill_tokens = int(elapsed * refill_rate)
        new_tokens = min(max_tokens, tokens + refill_tokens)
        
        await self.redis.setex(
            bucket_key,
            refill_time,
            json.dumps({"tokens": new_tokens, "last_update": now})
        )

    async def check_rate_limit(
        self,
        request: Request,
        rule: RateLimitRule
    ) -> Tuple[bool, Optional[int]]:
        """
        Check if request should be rate limited.
        Returns (is_limited, retry_after_seconds).
        """
        client_id = await self._get_client_identifier(request)
        redis_key = f"ratelimit:{rule.key}:{client_id}"
        now = time.time()

        try:
            if rule.strategy == RateLimitStrategy.TOKEN_BUCKET:
                return await self._check_token_bucket(
                    redis_key,
                    rule.max_requests,
                    rule.window_seconds,
                    rule.cost_per_request
                )
            elif rule.strategy == RateLimitStrategy.SLIDING_WINDOW:
                return await self._check_sliding_window(
                    redis_key,
                    rule.max_requests,
                    rule.window_seconds,
                    rule.burst_multiplier
                )
            else:  # Default to fixed window
                return await self._check_fixed_window(
                    redis_key,
                    rule.max_requests,
                    rule.window_seconds,
                    rule.burst_multiplier
                )

        except Exception as e:
            logger.error(f"Rate limit check failed: {str(e)}")
            # Fail open if rate limiting fails
            return False, None

    async def _check_token_bucket(
        self,
        key: str,
        max_tokens: int,
        refill_time: int,
        cost: int
    ) -> Tuple[bool, Optional[int]]:
        """Token bucket rate limiting strategy"""
        tokens, last_update = await self._get_token_bucket(key, max_tokens, refill_time)
        
        if tokens >= cost:
            await self._update_token_bucket(
                key,
                tokens - cost,
                max_tokens,
                refill_time,
                last_update
            )
            return False, None
        
        # Calculate retry after based on refill rate
        refill_rate = max_tokens / refill_time
        retry_after = int((cost - tokens) / refill_rate)
        return True, retry_after

    async def _check_sliding_window(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
        burst_multiplier: float
    ) -> Tuple[bool, Optional[int]]:
        """Sliding window rate limiting strategy"""
        now = time.time()
        window_start = now - window_seconds
        
        # Get request timestamps in window
        request_data = await self.redis.zrangebyscore(
            key,
            window_start,
            now,
            withscores=True
        )
        
        if len(request_data) >= int(max_requests * burst_multiplier):
            oldest_request = float(request_data[0][1])
            retry_after = int(oldest_request + window_seconds - now)
            return True, max(0, retry_after)
        
        # Add current request
        await self.redis.zadd(key, {str(now): now})
        await self.redis.expire(key, window_seconds)
        
        return False, None

    async def _check_fixed_window(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
        burst_multiplier: float
    ) -> Tuple[bool, Optional[int]]:
        """Fixed window rate limiting strategy"""
        requests = await self.redis.incr(key)
        
        # Set expiry on first request
        if requests == 1:
            await self.redis.expire(key, window_seconds)
        
        if requests > int(max_requests * burst_multiplier):
            ttl = await self.redis.ttl(key)
            return True, max(0, ttl)
            
        return False, None

async def rate_limit_middleware(
    request: Request,
    redis: Redis,
    rules: Union[RateLimitRule, List[RateLimitRule]]
) -> None:
    """
    Rate limiting middleware that supports multiple rules.
    Raises RateLimitError if any rule is exceeded.
    """
    limiter = RateLimiter(redis)
    rules_list = [rules] if isinstance(rules, RateLimitRule) else rules
    
    for rule in rules_list:
        is_limited, retry_after = await limiter.check_rate_limit(request, rule)
        rate_limit_stats.record_request(rule.key, is_limited)
        
        if is_limited:
            raise RateLimitError(
                detail=f"Rate limit exceeded for {rule.key}",
                retry_after=retry_after
            )

async def get_rate_limit_stats() -> dict:
    """Get current rate limiting statistics"""
    return rate_limit_stats.get_stats()
