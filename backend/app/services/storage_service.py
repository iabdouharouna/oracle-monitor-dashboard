from typing import List, Dict, Any, Optional
from app.database import oracle_pool
from app.core.oracle_queries import (
    TABLESPACES, DATAFILES, SEGMENTS, TABLESPACE_GROWTH
)
from app.config import settings
import structlog

logger = structlog.get_logger(__name__)


class StorageService:
    @staticmethod
    async def get_tablespaces() -> List[Dict[str, Any]]:
        rows = await oracle_pool.execute_query(TABLESPACES)
        return [
            {
                "name": ts.get("tablespace_name"),
                "type": ts.get("contents"),
                "status": ts.get("status"),
                "sizeMB": ts.get("size_mb", 0),
                "usedMB": ts.get("used_mb", 0),
                "freeMB": ts.get("free_mb", 0),
                "pctUsed": ts.get("pct_used", 0),
                "autoextensible": ts.get("autoextensible") == "YES",
                "maxSizeMB": ts.get("max_size_mb") if ts.get("max_size_mb", 0) > 0 else None,
            }
            for ts in rows
        ]

    @staticmethod
    async def get_tablespace_detail(name: str) -> Optional[Dict[str, Any]]:
        tablespaces = await StorageService.get_tablespaces()
        ts = next((t for t in tablespaces if t["name"] == name), None)
        if not ts:
            return None
        
        datafiles = await oracle_pool.execute_query(DATAFILES, {"tablespace_name": name})
        segments = await oracle_pool.execute_query(SEGMENTS, {"tablespace_name": name})
        growth = await oracle_pool.execute_query(TABLESPACE_GROWTH, {"tablespace_name": name})
        
        ts["datafiles"] = [
            {
                "fileId": df.get("file_id"),
                "fileName": df.get("file_name"),
                "tablespaceName": df.get("tablespace_name"),
                "sizeMB": df.get("size_mb", 0),
                "maxSizeMB": df.get("max_size_mb"),
                "autoextensible": df.get("autoextensible") == "YES",
                "incrementMB": df.get("increment_mb"),
                "status": df.get("status"),
                "onlineStatus": df.get("online_status"),
            }
            for df in datafiles
        ]
        
        ts["segments"] = [
            {
                "owner": s.get("owner"),
                "segmentName": s.get("segment_name"),
                "segmentType": s.get("segment_type"),
                "sizeMB": s.get("size_mb", 0),
                "extents": s.get("extents", 0),
            }
            for s in segments
        ]
        
        ts["growthTrend"] = [
            {
                "date": g.get("date_str"),
                "usedMB": g.get("used_mb", 0),
                "allocatedMB": g.get("allocated_mb", 0),
            }
            for g in growth
        ]
        
        return ts

    @staticmethod
    async def get_capacity_planning() -> List[Dict[str, Any]]:
        tablespaces = await StorageService.get_tablespaces()
        projections = []
        
        for ts in tablespaces:
            if ts["type"] == "TEMPORARY":
                continue
            
            growth = await oracle_pool.execute_query(
                TABLESPACE_GROWTH, 
                {"tablespace_name": ts["name"]}
            )
            
            if len(growth) < 2:
                continue
            
            # Calculate daily growth rate (linear approximation)
            first = growth[0]
            last = growth[-1]
            days_diff = 30  # Approximation
            
            growth_rate = (last["used_mb"] - first["used_mb"]) / days_diff if days_diff > 0 else 0
            
            if growth_rate <= 0:
                continue
            
            freeMB = ts["freeMB"]
            warnThreshold = ts["sizeMB"] * settings.THRESHOLD_TABLESPACE_WARN / 100
            critThreshold = ts["sizeMB"] * settings.THRESHOLD_TABLESPACE_CRIT / 100
            maxSize = ts["maxSizeMB"] or ts["sizeMB"]
            
            currentUsed = ts["usedMB"]
            
            days_until_warn = (warnThreshold - currentUsed) / growth_rate if growth_rate > 0 else None
            days_until_crit = (critThreshold - currentUsed) / growth_rate if growth_rate > 0 else None
            days_until_full = (maxSize - currentUsed) / growth_rate if growth_rate > 0 else None
            
            projections.append({
                "tablespaceName": ts["name"],
                "currentUsedMB": currentUsed,
                "currentFreeMB": freeMB,
                "growthRateMBPerDay": round(growth_rate, 2),
                "daysUntilWarning": int(days_until_warn) if days_until_warn and days_until_warn > 0 else None,
                "daysUntilCritical": int(days_until_crit) if days_until_crit and days_until_crit > 0 else None,
                "daysUntilFull": int(days_until_full) if days_until_full and days_until_full > 0 else None,
            })
        
        return projections