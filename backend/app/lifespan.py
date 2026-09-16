from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI
import structlog
from app.database import init_db, close_db
from app.redis import init_redis, close_redis
from app.config import settings

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer() if not settings.DEBUG else structlog.dev.ConsoleRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)


async def _metrics_flush_loop() -> None:
    """Periodically persist buffered API metrics to the history store."""
    from app.api_metrics import flush_api_metrics

    while True:
        try:
            await flush_api_metrics()
        except Exception:
            structlog.get_logger().exception("API metrics flush failed")
        await asyncio.sleep(settings.METRICS_FLUSH_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    structlog.get_logger().info("Starting Oracle Monitor Dashboard")
    await init_db()
    await init_redis()
    
    from app.database import oracle_pool
    stats = oracle_pool.pool_stats
    structlog.get_logger().info("Oracle pool initialized", **stats)

    flush_task = None
    if settings.METRICS_ENABLED and settings.METRICS_COLLECT_API:
        flush_task = asyncio.create_task(_metrics_flush_loop())
    
    yield
    
    if flush_task:
        flush_task.cancel()
        try:
            await flush_task
        except asyncio.CancelledError:
            pass
    
    structlog.get_logger().info("Shutting down Oracle Monitor Dashboard")
    await close_db()
    await close_redis()