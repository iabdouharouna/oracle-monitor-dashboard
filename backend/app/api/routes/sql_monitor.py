from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.services.sql_monitor_service import SQLMonitorService
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get("/active")
async def get_active_sql():
    try:
        return await SQLMonitorService.get_active_sql()
    except Exception as e:
        logger.error("Failed to get active SQL monitor", error=str(e))
        raise


@router.get("/detail")
async def get_sql_monitor_detail(
    sql_id: str = Query(..., description="SQL ID"),
    sql_exec_id: int = Query(..., description="SQL Execution ID")
):
    try:
        detail = await SQLMonitorService.get_sql_detail(sql_id, sql_exec_id)
        if not detail:
            raise HTTPException(status_code=404, detail="SQL monitor entry not found")
        return detail
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get SQL monitor detail", error=str(e))
        raise


@router.get("/plan")
async def get_execution_plan(
    sql_id: str = Query(..., description="SQL ID"),
    plan_hash_value: int = Query(..., description="Plan hash value")
):
    try:
        plan = await SQLMonitorService.get_execution_plan(sql_id, plan_hash_value)
        return plan
    except Exception as e:
        logger.error("Failed to get execution plan", error=str(e))
        raise


@router.get("/history")
async def get_sql_monitor_history():
    # Would query DBA_HIST_SQL_MONITOR if Diagnostics Pack
    return {"message": "Historical SQL monitor - requires Diagnostics Pack"}