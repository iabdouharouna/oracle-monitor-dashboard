from fastapi import APIRouter
from app.services.memory_service import MemoryService
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get("/sga-advice")
async def get_sga_advice():
    try:
        return await MemoryService.get_sga_advice()
    except Exception as e:
        logger.error("Failed to get SGA advice", error=str(e))
        raise


@router.get("/pga-advice")
async def get_pga_advice():
    try:
        return await MemoryService.get_pga_advice()
    except Exception as e:
        logger.error("Failed to get PGA advice", error=str(e))
        raise


@router.get("/memory-target-advice")
async def get_memory_target_advice():
    try:
        return await MemoryService.get_memory_target_advice()
    except Exception as e:
        logger.error("Failed to get memory target advice", error=str(e))
        raise


@router.get("/all")
async def get_all_memory_advice():
    try:
        sga = await MemoryService.get_sga_advice()
        pga = await MemoryService.get_pga_advice()
        mem = await MemoryService.get_memory_target_advice()
        return sga + pga + mem
    except Exception as e:
        logger.error("Failed to get all memory advice", error=str(e))
        raise