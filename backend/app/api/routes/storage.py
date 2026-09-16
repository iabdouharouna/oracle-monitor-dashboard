from fastapi import APIRouter, Query, HTTPException
from app.services.storage_service import StorageService
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get("/tablespaces")
async def get_tablespaces():
    try:
        return await StorageService.get_tablespaces()
    except Exception as e:
        logger.error("Failed to get tablespaces", error=str(e))
        raise


@router.get("/tablespaces/{name}")
async def get_tablespace_detail(name: str):
    try:
        detail = await StorageService.get_tablespace_detail(name)
        if not detail:
            raise HTTPException(status_code=404, detail="Tablespace not found")
        return detail
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get tablespace detail", error=str(e))
        raise


@router.get("/capacity")
async def get_capacity_planning():
    try:
        return await StorageService.get_capacity_planning()
    except Exception as e:
        logger.error("Failed to get capacity planning", error=str(e))
        raise