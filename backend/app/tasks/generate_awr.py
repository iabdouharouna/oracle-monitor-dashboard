import structlog
from app.celery_app import celery_app
from app.database import init_db, close_db
from app.config import settings

logger = structlog.get_logger(__name__)


@celery_app.task(name="app.tasks.generate_awr.create_awr_snapshot", bind=True)
def create_awr_snapshot(self) -> dict:
    """Create an AWR snapshot (requires Diagnostics Pack)."""
    import asyncio

    async def _run() -> dict:
        if not settings.HAS_DIAGNOSTICS_PACK:
            logger.info("AWR snapshot skipped: Diagnostics Pack disabled")
            return {"status": "skipped", "reason": "HAS_DIAGNOSTICS_PACK=false"}

        await init_db()
        try:
            from app.database import oracle_pool

            async with oracle_pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    await cursor.callproc("DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT")
                    logger.info("AWR snapshot created")
                    return {"status": "ok"}
        except Exception as e:
            logger.exception("AWR snapshot failed", error=str(e))
            return {"status": "error", "error": str(e)}
        finally:
            await close_db()

    return asyncio.run(_run())