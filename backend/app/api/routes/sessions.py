from fastapi import APIRouter, Query, HTTPException, Depends, Body
from typing import Optional
from app.services.session_service import SessionService
from app.api.deps import get_current_dba
from app.core.security import TokenData
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get("")
async def get_sessions(
    status: Optional[str] = Query(None, description="Filter by status"),
    username: Optional[str] = Query(None, description="Filter by username"),
    machine: Optional[str] = Query(None, description="Filter by machine"),
    min_duration: Optional[int] = Query(None, description="Minimum last call elapsed time in seconds"),
):
    try:
        return await SessionService.get_sessions(status, username, machine, min_duration)
    except Exception as e:
        logger.error("Failed to get sessions", error=str(e))
        raise


@router.get("/blocking")
async def get_blocking_chains():
    try:
        return await SessionService.get_blocking_chains()
    except Exception as e:
        logger.error("Failed to get blocking chains", error=str(e))
        raise


@router.get("/long-ops")
async def get_long_operations():
    try:
        return await SessionService.get_long_operations()
    except Exception as e:
        logger.error("Failed to get long operations", error=str(e))
        raise


@router.post("/{sid}/{serial}/kill")
async def kill_session(
    sid: int,
    serial: int,
    current_user: TokenData = Depends(get_current_dba),
):
    try:
        success = await SessionService.kill_session(sid, serial)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to kill session")
        logger.warning("Session killed", sid=sid, serial=serial, by=current_user.username)
        return {"message": "Session killed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to kill session", error=str(e))
        raise