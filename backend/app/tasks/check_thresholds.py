import structlog
from app.celery_app import celery_app
from app.services.alert_service import AlertService
from app.database import init_db, close_db

logger = structlog.get_logger(__name__)


@celery_app.task(name="app.tasks.check_thresholds.check_all_thresholds", bind=True)
def check_all_thresholds(self) -> dict:
    """Evaluate configured thresholds against live metrics."""
    import asyncio

    async def _run() -> dict:
        await init_db()
        from app.redis import init_redis, close_redis
        await init_redis()
        try:
            triggered = await AlertService.check_thresholds()
            await AlertService.record_triggered(triggered)
            logger.info("Threshold check complete", triggered=len(triggered))
            return {"status": "ok", "triggered_alerts": len(triggered)}
        except Exception as e:
            logger.exception("Threshold check failed", error=str(e))
            return {"status": "error", "error": str(e)}
        finally:
            await close_db()
            await close_redis()

    return asyncio.run(_run())