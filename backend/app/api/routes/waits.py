from fastapi import APIRouter, Query
from app.services.wait_service import WaitService
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get("/system")
async def get_system_waits():
    try:
        return await WaitService.get_system_waits()
    except Exception as e:
        logger.error("Failed to get system waits", error=str(e))
        raise


@router.get("/session")
async def get_session_waits():
    try:
        return await WaitService.get_session_waits()
    except Exception as e:
        logger.error("Failed to get session waits", error=str(e))
        raise


@router.get("/io-metrics")
async def get_io_metrics():
    try:
        return await WaitService.get_io_metrics()
    except Exception as e:
        logger.error("Failed to get I/O metrics", error=str(e))
        raise


@router.get("/history")
async def get_metrics_history(hours: float = Query(24, ge=0.083, le=168)):
    try:
        return await WaitService.get_metrics_history(hours)
    except Exception as e:
        logger.error("Failed to get metrics history", error=str(e))
        raise


@router.get("/live")
async def get_live_waits():
    try:
        return await WaitService.get_live_waits()
    except Exception as e:
        logger.error("Failed to get live waits", error=str(e))
        raise