from typing import List, Dict, Any
from app.database import oracle_pool
from app.core.oracle_queries import (
    INSTANCE_INFO, INSTANCE_UPTIME, CLIENT_SUMMARY, PROCESS_METRICS,
    MEMORY_METRICS, PGA_METRICS, LIBRARY_CACHE, BUFFER_CACHE_HIT,
    TABLESPACES, REDO_LOGS, ARCHIVE_LOG_RATE, CPU_RATIO, TOP_SQL,
    SGA_INFO
)
from app.config import settings
import structlog

logger = structlog.get_logger(__name__)


class InstanceService:
    @staticmethod
    async def get_database_info() -> Dict[str, Any]:
        rows = await oracle_pool.execute_query(INSTANCE_INFO)
        if not rows:
            return {}
        row = rows[0]
        uptime_rows = await oracle_pool.execute_query(INSTANCE_UPTIME)
        uptime = uptime_rows[0].get("uptime_seconds", 0) if uptime_rows else 0
        
        return {
            "name": row.get("db_name"),
            "version": row.get("version"),
            "host": row.get("host_name"),
            "platform": row.get("platform_name"),
            "status": row.get("status"),
            "startup_time": row.get("startup_time"),
            "log_mode": row.get("log_mode"),
            "role": row.get("database_role"),
            "instance_number": row.get("instance_number"),
            "uptime_seconds": uptime,
        }

    @staticmethod
    async def get_clients() -> List[Dict[str, Any]]:
        return await oracle_pool.execute_query(CLIENT_SUMMARY)

    @staticmethod
    async def get_processes() -> Dict[str, Any]:
        rows = await oracle_pool.execute_query(PROCESS_METRICS)
        if not rows:
            return {}
        row = rows[0]
        
        # Calculate rates (per second) - would need delta from previous collection
        # For MVP, return current values
        return {
            "process_count": row.get("process_count", 0),
            "exec_rate": row.get("exec_count", 0) / max(1, row.get("uptime_seconds", 1)) if "uptime_seconds" in row else 0,
            "parse_rate": row.get("parse_count", 0) / max(1, row.get("uptime_seconds", 1)) if "uptime_seconds" in row else 0,
            "open_cursors": row.get("open_cursors", 0),
            "commit_rate": row.get("commits", 0) / max(1, row.get("uptime_seconds", 1)) if "uptime_seconds" in row else 0,
            "rollback_rate": row.get("rollbacks", 0) / max(1, row.get("uptime_seconds", 1)) if "uptime_seconds" in row else 0,
        }

    @staticmethod
    async def get_memory() -> Dict[str, Any]:
        # SGA breakdown
        sga_rows = await oracle_pool.execute_query(MEMORY_METRICS)
        sga_data = {}
        for row in sga_rows:
            pool = row.get("pool", "unknown")
            name = row.get("name", "unknown")
            bytes_val = row.get("bytes", 0)
            key = f"{pool}_{name}".lower().replace(" ", "_")
            sga_data[key] = bytes_val

        # PGA
        pga_rows = await oracle_pool.execute_query(PGA_METRICS)
        pga_data = {row.get("name"): row.get("value") for row in pga_rows}

        # SGA Info
        sga_info_rows = await oracle_pool.execute_query(SGA_INFO)
        sga_info = {row.get("name"): row.get("size_mb") for row in sga_info_rows}

        # Buffer cache hit ratio
        bch_rows = await oracle_pool.execute_query(BUFFER_CACHE_HIT)
        buffer_cache_hit = bch_rows[0].get("hit_ratio", 0) if bch_rows else 0

        # Library cache hit ratio
        lc_rows = await oracle_pool.execute_query(LIBRARY_CACHE)
        total_gets = sum(r.get("gets", 0) for r in lc_rows)
        total_gethits = sum(r.get("gethits", 0) for r in lc_rows)
        library_cache_hit = (total_gethits / total_gets * 100) if total_gets > 0 else 0

        return {
            "sga": {
                "total_mb": sga_info.get("Maximum SGA Size", 0),
                "buffer_cache_mb": sga_info.get("Buffer Cache Size", 0),
                "shared_pool_mb": sga_info.get("Shared Pool Size", 0),
                "large_pool_mb": sga_info.get("Large Pool Size", 0),
                "java_pool_mb": sga_info.get("Java Pool Size", 0),
                "streams_pool_mb": sga_info.get("Streams Pool Size", 0),
                "redo_log_buffer_mb": sga_info.get("Redo Buffers", 0),
                "fixed_sga": sga_info.get("Fixed SGA Size", 0),
                "shared_pool_free_mb": sga_data.get("shared_pool_free_memory", 0) / 1024 / 1024,
            },
            "pga": {
                "aggregate_target_mb": pga_data.get("aggregate PGA target parameter", 0) / 1024 / 1024,
                "total_allocated_mb": pga_data.get("total PGA allocated", 0) / 1024 / 1024,
                "total_used_mb": pga_data.get("total PGA used for auto workareas", 0) / 1024 / 1024,
                "cache_hit_percentage": pga_data.get("cache hit percentage", 0),
                "max_allocated_mb": pga_data.get("maximum PGA allocated", 0) / 1024 / 1024,
            },
            "buffer_cache_hit_ratio": buffer_cache_hit,
            "library_cache_hit_ratio": library_cache_hit,
        }

    @staticmethod
    async def get_storage() -> Dict[str, Any]:
        tablespaces = await oracle_pool.execute_query(TABLESPACES)
        redo_logs = await oracle_pool.execute_query(REDO_LOGS)
        archive_rows = await oracle_pool.execute_query(ARCHIVE_LOG_RATE)
        
        return {
            "tablespaces": [
                {
                    "name": ts.get("tablespace_name"),
                    "type": ts.get("contents"),
                    "status": ts.get("status"),
                    "size_mb": ts.get("size_mb", 0),
                    "used_mb": ts.get("used_mb", 0),
                    "free_mb": ts.get("free_mb", 0),
                    "pct_used": ts.get("pct_used", 0),
                    "autoextensible": ts.get("autoextensible") == "YES",
                    "max_size_mb": ts.get("max_size_mb") if ts.get("max_size_mb", 0) > 0 else None,
                }
                for ts in tablespaces
            ],
            "redo_logs": [
                {
                    "group": rl.get("group#"),
                    "members": rl.get("members"),
                    "size_mb": rl.get("size_mb", 0),
                    "status": rl.get("status"),
                    "switches_per_hour": rl.get("switches_per_hour", 0),
                }
                for rl in redo_logs
            ],
            "archive_log_rate": (archive_rows[0].get("mb_per_hour") or 0) if archive_rows else 0,
        }

    @staticmethod
    async def get_cpu_ratio() -> Dict[str, Any]:
        rows = await oracle_pool.execute_query(CPU_RATIO)
        if not rows:
            return {"dbCpuPct": 0, "osCpuPct": 0, "dbTimePerSec": 0}
        row = rows[0]
        return {
            "dbCpuPct": row.get("db_cpu_pct", 0),
            "osCpuPct": row.get("bg_cpu_pct", 0),
            "dbTimePerSec": row.get("db_time_per_sec", 0),
        }

    @staticmethod
    async def get_top_sql(limit: int = 10) -> List[Dict[str, Any]]:
        rows = await oracle_pool.execute_query(TOP_SQL, {"limit": limit})
        return [
            {
                "sqlId": r.get("sql_id"),
                "planHashValue": r.get("plan_hash_value") or 0,
                "executions": r.get("executions") or 0,
                "elapsedTimeSec": r.get("elapsed_time_sec") or 0,
                "cpuTimeSec": r.get("cpu_time_sec") or 0,
                "bufferGets": r.get("buffer_gets") or 0,
                "diskReads": r.get("disk_reads") or 0,
                "rowsProcessed": r.get("rows_processed") or 0,
                "sqlText": r.get("sql_text") or "",
            }
            for r in rows
        ]