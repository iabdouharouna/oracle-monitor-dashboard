import structlog
import redis.asyncio as redis
from app.celery_app import celery_app
from app.config import settings

logger = structlog.get_logger(__name__)


@celery_app.task(name="app.tasks.cleanup.cleanup_old_data", bind=True)
def cleanup_old_data(self) -> dict:
    """Clean up stale task result keys in the result backend."""

    async def _run() -> dict:
        client = redis.from_url(settings.CELERY_RESULT_BACKEND)
        try:
            await client.ping()
            deleted = 0
            cursor = 0
            while True:
                cursor, keys = await client.scan(cursor, match="celery-task-meta-*", count=100)
                if keys:
                    deleted += await client.delete(*keys)
                if cursor == 0:
                    break
            logger.info("Redis cleanup complete", pattern="celery-task-meta-*", deleted=deleted)
            return {"status": "ok", "deleted": deleted}
        except Exception as e:
            logger.exception("Cleanup failed", error=str(e))
            return {"status": "error", "error": str(e)}
        finally:
            await client.close()

    import asyncio

    return asyncio.run(_run())