import redis.asyncio as redis
from functools import wraps
from typing import Any, Callable
import json
import structlog
from app.config import settings

logger = structlog.get_logger(__name__)


class RedisClient:
    def __init__(self):
        self._client: redis.Redis | None = None
    
    async def initialize(self) -> None:
        self._client = redis.from_url(
            settings.REDIS_URL,
            max_connections=settings.REDIS_MAX_CONNECTIONS,
            socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
            socket_connect_timeout=settings.REDIS_SOCKET_CONNECT_TIMEOUT,
            decode_responses=True,
        )
        await self._client.ping()
        logger.info("Redis connection established")
    
    async def close(self) -> None:
        if self._client:
            await self._client.close()
            self._client = None
    
    @property
    def client(self) -> redis.Redis:
        if self._client is None:
            raise RuntimeError("Redis not initialized")
        return self._client
    
    async def get_json(self, key: str) -> Any | None:
        data = await self._client.get(key)
        return json.loads(data) if data else None
    
    async def set_json(self, key: str, value: Any, ttl: int) -> None:
        await self._client.setex(key, ttl, json.dumps(value, default=str))
    
    async def delete(self, key: str) -> None:
        await self._client.delete(key)
    
    async def delete_pattern(self, pattern: str) -> None:
        cursor = 0
        while True:
            cursor, keys = await self._client.scan(cursor, match=pattern, count=100)
            if keys:
                await self._client.delete(*keys)
            if cursor == 0:
                break
    
    async def health_check(self) -> bool:
        try:
            return await self._client.ping()
        except Exception:
            return False


redis_client = RedisClient()


def cache(ttl: int | None = None, key_prefix: str = "") -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            if not settings.DEBUG:
                cache_key = f"{key_prefix}:{func.__name__}:{hash(str(args) + str(sorted(kwargs.items())))}"
                
                cached = await redis_client.get_json(cache_key)
                if cached is not None:
                    return cached
            
            result = await func(*args, **kwargs)
            
            if not settings.DEBUG:
                cache_ttl = ttl or settings.CACHE_TTL_DEFAULT
                await redis_client.set_json(cache_key, result, cache_ttl)
            
            return result
        return wrapper
    return decorator


async def init_redis() -> None:
    await redis_client.initialize()


async def close_redis() -> None:
    await redis_client.close()