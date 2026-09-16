from typing import List, Dict, Any
from app.database import oracle_pool
from app.core.oracle_queries import (
    MEMORY_ADVISOR_SGA, MEMORY_ADVISOR_PGA, MEMORY_TARGET_ADVICE
)
from app.config import settings
import structlog

logger = structlog.get_logger(__name__)


class MemoryService:
    @staticmethod
    async def get_sga_advice() -> List[Dict[str, Any]]:
        rows = await oracle_pool.execute_query(MEMORY_ADVISOR_SGA)
        return [
            {
                "parameter": "SGA Target",
                "currentValue": 1.0,
                "advice": [
                    {
                        "parameterValue": round((r.get("sga_size_factor") or 0) * 100, 1),
                        "estdDBTime": round((r.get("estd_db_time_factor") or 0) * 100, 1),
                        "estdPhysicalReads": round((r.get("estd_physical_reads_factor") or 0) * 100, 1),
                        "benefitPct": round((1 - (r.get("estd_db_time_factor") or 1)) * 100, 1),
                    }
                    for r in rows
                ],
            }
        ]

    @staticmethod
    async def get_pga_advice() -> List[Dict[str, Any]]:
        rows = await oracle_pool.execute_query(MEMORY_ADVISOR_PGA)
        return [
            {
                "parameter": "PGA Target",
                "currentValue": 1.0,
                "advice": [
                    {
                        "parameterValue": round(r.get("pga_target_factor", 0) * 100, 1),
                        "estdDBTime": round((r.get("estd_db_time_factor") or 0) * 100, 1),
                        "estdPhysicalReads": round((r.get("estd_physical_reads_factor") or 0) * 100, 1),
                        "benefitPct": round((1 - (r.get("estd_db_time_factor") or 1)) * 100, 1),
                    }
                    for r in rows
                ],
            }
        ]

    @staticmethod
    async def get_memory_target_advice() -> List[Dict[str, Any]]:
        rows = await oracle_pool.execute_query(MEMORY_TARGET_ADVICE)
        return [
            {
                "parameter": "Memory Target",
                "currentValue": 1.0,
                "advice": [
                    {
                        "parameterValue": round((r.get("memory_size_factor") or 0) * 100, 1),
                        "estdDBTime": round((r.get("estd_db_time_factor") or 0) * 100, 1),
                        "estdPhysicalReads": round((r.get("estd_physical_reads_factor") or 0) * 100, 1),
                        "benefitPct": round((1 - (r.get("estd_db_time_factor") or 1)) * 100, 1),
                    }
                    for r in rows
                ],
            }
        ]