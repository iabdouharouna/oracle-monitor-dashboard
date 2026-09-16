from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.services.ash_service import ASHService
from app.services.awr_service import AWRService
from app.core.models import AASDataPoint, DrilldownData
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get("/ash/aas")
async def get_ash_aas(
    hours: float = Query(1, ge=0.083, le=24, description="Hours of history (5 min to 24 hours)"),
    dimension: str = Query("wait_class", description="Dimension to group by")
):
    try:
        data = await ASHService.get_aas_data(hours)
        return data
    except Exception as e:
        logger.error("Failed to get ASH AAS data", error=str(e))
        raise


@router.get("/ash/top-sql")
async def get_ash_top_sql(
    hours: float = Query(1, ge=0.083, le=24)
):
    try:
        return await ASHService.get_top_sql(hours)
    except Exception as e:
        logger.error("Failed to get ASH top SQL", error=str(e))
        raise


@router.get("/ash/drilldown")
async def get_ash_drilldown(
    dimension: str = Query("wait_class", description="Primary dimension"),
    filter_dimension: str = Query("sql_id", description="Filter dimension"),
    hours: float = Query(1, ge=0.083, le=24)
):
    try:
        data = await ASHService.get_drilldown(dimension, filter_dimension, hours)
        return {
            "dimension": dimension,
            "filterDimension": filter_dimension,
            "data": data,
        }
    except Exception as e:
        logger.error("Failed to get ASH drilldown", error=str(e))
        raise


@router.get("/ash/wait-classes")
async def get_wait_class_breakdown(
    hours: float = Query(1, ge=0.083, le=24)
):
    try:
        return await ASHService.get_wait_class_breakdown(hours)
    except Exception as e:
        logger.error("Failed to get wait class breakdown", error=str(e))
        raise


@router.get("/awr/snapshots")
async def get_awr_snapshots():
    try:
        return await AWRService.get_snapshots()
    except Exception as e:
        logger.error("Failed to get AWR snapshots", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to load AWR snapshots: {e}")


@router.get("/awr/report")
async def get_awr_report(
    snap_id_start: int,
    snap_id_end: int,
    report_type: str = "html"
):
    try:
        return await AWRService.generate_report(snap_id_start, snap_id_end, report_type=report_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        message = str(e)
        if "20019" in message or "re-started during specified snapshot interval" in message:
            raise HTTPException(
                status_code=400,
                detail=f"The selected snapshot range {snap_id_start}-{snap_id_end} crosses an instance restart. Pick a range within a single startup window.",
            )
        logger.error("Failed to generate AWR report", error=str(e))
        raise HTTPException(status_code=500, detail=f"AWR report generation failed: {e}")