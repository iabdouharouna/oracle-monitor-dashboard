import structlog
from app.celery_app import celery_app
from app.services.instance_service import InstanceService
from app.services.session_service import SessionService
from app.services.storage_service import StorageService
from app.database import init_db, close_db
from app.services.metrics_service import MetricsService
from app.services.wait_service import WaitService
from app.config import settings

logger = structlog.get_logger(__name__)


async def collect_db_metrics() -> None:
    """Collect core Oracle instance metrics and persist them."""
    from app.connections import get_catalog

    if not get_catalog():
        logger.info("No Oracle database configured, DB metrics skipped")
        return

    info = await InstanceService.get_database_info()
    cpu = await InstanceService.get_cpu_ratio()
    sessions = await SessionService.get_sessions()
    tablespaces = await StorageService.get_tablespaces()
    io = await WaitService.get_io_metrics()

    db_cpu = float(cpu.get("dbCpuPct", 0) or 0)
    await MetricsService.store("db_cpu_pct", db_cpu)

    total_sessions = len(sessions)
    active_sessions = len([s for s in sessions if s.get("status") == "ACTIVE"])
    await MetricsService.store("db_sessions_total", total_sessions)
    await MetricsService.store("db_sessions_active", active_sessions)

    total_gb = sum(ts.get("sizeMB", 0) for ts in tablespaces) / 1024
    used_gb = sum(ts.get("usedMB", 0) for ts in tablespaces) / 1024
    pct_used = (used_gb / total_gb * 100) if total_gb > 0 else 0
    await MetricsService.store("db_storage_pct", round(pct_used, 2))

    read_mbps = float(io.get("physicalReadBytesPerSec", 0) or 0) / 1024 / 1024
    write_mbps = float(io.get("physicalWriteBytesPerSec", 0) or 0) / 1024 / 1024
    await MetricsService.store("db_io_read_mbps", round(read_mbps, 2))
    await MetricsService.store("db_io_write_mbps", round(write_mbps, 2))

    logger.info(
        "DB metrics collected",
        db=info.get("name"),
        cpu=db_cpu,
        sessions=total_sessions,
        active=active_sessions,
        storage_pct=pct_used,
        io_read=round(read_mbps, 2),
        io_write=round(write_mbps, 2),
    )


async def collect_infra_metrics() -> None:
    """Collect host infrastructure metrics (CPU/RAM/disk) and persist them."""
    try:
        import psutil
    except ImportError:
        logger.warning("psutil not installed, infrastructure metrics disabled")
        return

    cpu_pct = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    await MetricsService.store("host_cpu_pct", float(cpu_pct))
    await MetricsService.store("host_ram_pct", float(mem.percent))
    await MetricsService.store("host_ram_used_mb", round(mem.used / 1024 / 1024, 2))
    await MetricsService.store("host_disk_pct", float(disk.percent))

    logger.info(
        "Infrastructure metrics collected",
        cpu=cpu_pct,
        ram_pct=mem.percent,
        ram_used_mb=round(mem.used / 1024 / 1024, 2),
        disk_pct=disk.percent,
    )


@celery_app.task(name="app.tasks.collect_metrics.collect_all_metrics", bind=True)
def collect_all_metrics(self) -> dict:
    """Periodic collection of core instance + infrastructure metrics for trend tracking."""
    import asyncio

    async def _run() -> dict:
        if not settings.METRICS_ENABLED:
            return {"status": "disabled"}
        await init_db()
        from app.redis import init_redis, close_redis
        await init_redis()
        collected = []
        try:
            if settings.METRICS_COLLECT_DB:
                await collect_db_metrics()
                collected.append("db")
        except Exception as e:
            logger.exception("DB metrics collection failed", error=str(e))
        finally:
            await close_db()
        try:
            if settings.METRICS_COLLECT_INFRA:
                await collect_infra_metrics()
                collected.append("infra")
        except Exception as e:
            logger.exception("Infrastructure metrics collection failed", error=str(e))
        finally:
            await close_redis()
        return {"status": "ok", "collected": collected}

    return asyncio.run(_run())