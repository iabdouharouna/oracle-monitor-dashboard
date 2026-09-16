from fastapi import APIRouter, Query
import structlog

from app.services.metrics_service import MetricsService

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get("/available")
async def get_available_metrics():
    try:
        return {"metrics": await MetricsService.get_available()}
    except Exception as e:
        logger.error("Failed to get available metrics", error=str(e))
        raise


@router.get("/history")
async def get_metrics_history(
    metrics: str = Query("", description="Comma-separated metric names"),
    hours: float = Query(24, ge=0.083, le=168),
    step_seconds: int = Query(0, ge=0, le=3600),
):
    try:
        names = [m.strip() for m in metrics.split(",") if m.strip()]
        history = await MetricsService.get_history(names, hours, step_seconds)
        return {"hours": hours, "metrics": history}
    except Exception as e:
        logger.error("Failed to get metrics history", error=str(e))
        raise