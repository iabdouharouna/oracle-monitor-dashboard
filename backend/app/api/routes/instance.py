from fastapi import APIRouter, Query
from app.services.instance_service import InstanceService
from app.core.models import (
    InstanceInfo, DatabaseInfo, ClientSummary, ProcessMetrics,
    MemoryMetrics, StorageMetrics, CPURatio, TopSQL
)
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get("/info", response_model=DatabaseInfo)
async def get_instance_info():
    try:
        return await InstanceService.get_database_info()
    except Exception as e:
        logger.error("Failed to get instance info", error=str(e))
        raise


@router.get("/clients", response_model=list[ClientSummary])
async def get_clients():
    try:
        return await InstanceService.get_clients()
    except Exception as e:
        logger.error("Failed to get clients", error=str(e))
        raise


@router.get("/processes", response_model=ProcessMetrics)
async def get_processes():
    try:
        return await InstanceService.get_processes()
    except Exception as e:
        logger.error("Failed to get processes", error=str(e))
        raise


@router.get("/memory", response_model=MemoryMetrics)
async def get_memory():
    try:
        return await InstanceService.get_memory()
    except Exception as e:
        logger.error("Failed to get memory", error=str(e))
        raise


@router.get("/storage", response_model=StorageMetrics)
async def get_storage():
    try:
        return await InstanceService.get_storage()
    except Exception as e:
        logger.error("Failed to get storage", error=str(e))
        raise


@router.get("/cpu-ratio", response_model=CPURatio)
async def get_cpu_ratio():
    try:
        return await InstanceService.get_cpu_ratio()
    except Exception as e:
        logger.error("Failed to get CPU ratio", error=str(e))
        raise


@router.get("/top-sql", response_model=list[TopSQL])
async def get_top_sql(limit: int = Query(10, ge=1, le=50)):
    try:
        return await InstanceService.get_top_sql(limit)
    except Exception as e:
        logger.error("Failed to get top SQL", error=str(e))
        raise


@router.get("/all", response_model=InstanceInfo)
async def get_all_instance_data():
    try:
        return InstanceInfo(
            database=await InstanceService.get_database_info(),
            clients=await InstanceService.get_clients(),
            processes=await InstanceService.get_processes(),
            memory=await InstanceService.get_memory(),
            storage=await InstanceService.get_storage(),
            cpu_ratio=await InstanceService.get_cpu_ratio(),
            top_sql=await InstanceService.get_top_sql(10),
        )
    except Exception as e:
        logger.error("Failed to get all instance data", error=str(e))
        raise