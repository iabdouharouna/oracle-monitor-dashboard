from typing import List, Dict, Any, Optional
from app.database import oracle_pool
from app.core.oracle_queries import (
    ASH_AAS, ASH_TOP_SQL, ASH_DRILLDOWN, get_drilldown_query
)
from app.config import settings
import structlog

logger = structlog.get_logger(__name__)


class ASHService:
    @staticmethod
    async def get_aas_data(hours: float = 1) -> List[Dict[str, Any]]:
        rows = await oracle_pool.execute_query(ASH_AAS, {"hours": hours})
        return [
            {
                "timestamp": r.get("time_bucket"),
                "waitClass": r.get("wait_class"),
                "aas": r.get("aas", 0),
                "samples": r.get("samples", 0),
            }
            for r in rows
        ]

    @staticmethod
    async def get_top_sql(hours: float = 1) -> List[Dict[str, Any]]:
        rows = await oracle_pool.execute_query(ASH_TOP_SQL, {"hours": hours})
        return [
            {
                "sqlId": r.get("sql_id"),
                "aas": r.get("aas", 0),
                "samples": r.get("samples", 0),
                "pctDBTime": r.get("pct_db_time", 0),
                "sqlText": r.get("sql_text", ""),
            }
            for r in rows
        ]

    @staticmethod
    async def get_drilldown(
        dimension: str,
        filter_dimension: str,
        hours: float = 1
    ) -> List[Dict[str, Any]]:
        query = get_drilldown_query(dimension, filter_dimension)
        rows = await oracle_pool.execute_query(query, {"hours": hours})
        return [
            {
                "dimensionValue": r.get("dimension_value") or "Unknown",
                "filterValue": r.get("filter_value") or "Unknown",
                "samples": r.get("samples", 0),
                "aas": r.get("aas", 0),
                "pctTotal": r.get("pct_total", 0),
            }
            for r in rows
        ]


    @staticmethod
    async def get_wait_class_breakdown(hours: float = 1) -> List[Dict[str, Any]]:
        aas_data = await ASHService.get_aas_data(hours)
        
        # Aggregate by wait class
        breakdown = {}
        for row in aas_data:
            wc = row.get("waitClass", "Other")
            if wc not in breakdown:
                breakdown[wc] = {"samples": 0, "aas": 0}
            breakdown[wc]["samples"] += row.get("samples", 0)
            breakdown[wc]["aas"] += row.get("aas", 0)
        
        total_samples = sum(v["samples"] for v in breakdown.values())
        
        return [
            {
                "waitClass": wc,
                "samples": data["samples"],
                "aas": round(data["aas"], 2),
                "pctTotal": round(data["samples"] * 100 / total_samples, 1) if total_samples > 0 else 0,
            }
            for wc, data in breakdown.items()
        ]