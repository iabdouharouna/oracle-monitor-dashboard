from fastapi import APIRouter, Query
from app.services.alert_service import AlertService
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get("/log")
async def get_alert_log(
    hours: float = Query(24, ge=0.083, le=168),
    limit: int = Query(100, ge=1, le=1000),
):
    try:
        return await AlertService.get_alert_log(hours, limit)
    except Exception as e:
        logger.error("Failed to get alert log", error=str(e))
        raise


@router.get("/thresholds")
async def get_thresholds():
    try:
        return AlertService.get_threshold_config()
    except Exception as e:
        logger.error("Failed to get thresholds", error=str(e))
        raise


@router.put("/thresholds")
async def update_thresholds(thresholds: dict):
    try:
        return AlertService.update_thresholds(thresholds)
    except Exception as e:
        logger.error("Failed to update thresholds", error=str(e))
        raise


@router.get("/history")
async def get_alert_history(limit: int = Query(100, ge=1, le=1000)):
    try:
        return await AlertService.get_history(limit)
    except Exception as e:
        logger.error("Failed to get alert history", error=str(e))
        raise


@router.get("/check")
async def check_thresholds():
    try:
        return await AlertService.check_thresholds()
    except Exception as e:
        logger.error("Failed to check thresholds", error=str(e))
        raise