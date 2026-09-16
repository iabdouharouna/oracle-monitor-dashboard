import structlog
from app.celery_app import celery_app
from app.services.instance_service import InstanceService
from app.database import init_db, close_db

logger = structlog.get_logger(__name__)


@celery_app.task(name="app.tasks.collect_metrics.collect_all_metrics", bind=True)
def collect_all_metrics(self) -> dict:
    """Periodic collection of core instance metrics for trend tracking."""
    import asyncio

    async def _run() -> dict:
        await init_db()
        try:
            info = await InstanceService.get_database_info()
            processes = await InstanceService.get_processes()
            cpu = await InstanceService.get_cpu_ratio()
            result = {"database": info, "processes": processes, "cpu": cpu}
            logger.info("Metrics collected", count=len(result))
            return {"status": "ok", "metrics": 3}
        except Exception as e:
            logger.exception("Metrics collection failed", error=str(e))
            return {"status": "error", "error": str(e)}
        finally:
            await close_db()

    return asyncio.run(_run())