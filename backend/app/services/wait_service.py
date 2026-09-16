from typing import List, Dict, Any
from app.database import oracle_pool
from app.core.oracle_queries import (
    SYSTEM_WAITS, SESSION_WAITS, IOS_METRICS, IO_LATENCY, METRICS_HISTORY,
    LIVE_WAIT_CLASSES, LIVE_SESSIONS
)
from app.config import settings
import structlog

logger = structlog.get_logger(__name__)


class WaitService:
    @staticmethod
    async def get_system_waits() -> List[Dict[str, Any]]:
        rows = await oracle_pool.execute_query(SYSTEM_WAITS)
        return [
            {
                "event": r.get("event"),
                "waitClass": r.get("wait_class"),
                "totalWaits": r.get("total_waits", 0),
                "timeWaitedSec": r.get("time_waited_sec", 0),
                "avgWaitMs": r.get("avg_wait_ms", 0),
                "pctDBTime": r.get("pct_db_time", 0),
            }
            for r in rows
        ]

    @staticmethod
    async def get_session_waits() -> List[Dict[str, Any]]:
        rows = await oracle_pool.execute_query(SESSION_WAITS)
        return [
            {
                "sid": r.get("sid"),
                "serial": r.get("serial#"),
                "username": r.get("username"),
                "event": r.get("event"),
                "waitClass": r.get("wait_class"),
                "state": r.get("state"),
                "secondsInWait": r.get("seconds_in_wait", 0),
                "p1Text": r.get("p1_text"),
                "p1": r.get("p1", 0),
                "p2Text": r.get("p2_text"),
                "p2": r.get("p2", 0),
                "p3Text": r.get("p3_text"),
                "p3": r.get("p3", 0),
            }
            for r in rows
        ]

    @staticmethod
    async def get_io_metrics() -> Dict[str, Any]:
        rows = await oracle_pool.execute_query(IOS_METRICS)
        metrics = {r.get("metric_name"): r.get("value") for r in rows}
        
        latency_rows = await oracle_pool.execute_query(IO_LATENCY)
        latency = latency_rows[0] if latency_rows else {}
        
        return {
            "physicalReadsPerSec": metrics.get("Physical Reads Per Sec", 0),
            "physicalWritesPerSec": metrics.get("Physical Writes Per Sec", 0),
            "physicalReadBytesPerSec": metrics.get("Physical Read Total Bytes Per Sec", 0),
            "physicalWriteBytesPerSec": metrics.get("Physical Write Total Bytes Per Sec", 0),
            "redoGeneratedPerSec": metrics.get("Redo Generated Per Sec", 0),
            "databaseTimePerSec": metrics.get("Database Time Per Sec", 0),
            "cpuUsagePerSec": metrics.get("CPU Usage Per Sec", 0),
            "logonsPerSec": metrics.get("Logons Per Sec", 0),
            "avgReadLatencyMs": latency.get("avg_read_latency_ms", 0),
            "avgWriteLatencyMs": latency.get("avg_write_latency_ms", 0),
        }

    @staticmethod
    async def get_metrics_history(hours: float = 24) -> Dict[str, List[Dict[str, Any]]]:
        rows = await oracle_pool.execute_query(METRICS_HISTORY, {"hours": hours})
        
        # Group by metric_name
        series = {}
        for row in rows:
            metric = row.get("metric_name")
            if metric not in series:
                series[metric] = []
            series[metric].append({
                "timestamp": row.get("timestamp"),
                "value": row.get("value", 0),
            })
        
        return series

    @staticmethod
    async def get_live_waits() -> Dict[str, Any]:
        wait_rows = await oracle_pool.execute_query(LIVE_WAIT_CLASSES)
        session_rows = await oracle_pool.execute_query(LIVE_SESSIONS)

        return {
            "waitClasses": [
                {
                    "waitClass": r.get("wait_class"),
                    "sessionCount": r.get("session_count", 0),
                    "totalWaitTimeSec": r.get("total_wait_time_sec", 0),
                }
                for r in wait_rows
            ],
            "sessions": [
                {
                    "sid": r.get("sid"),
                    "serial": r.get("serial#"),
                    "username": r.get("username"),
                    "program": r.get("program"),
                    "module": r.get("module"),
                    "machine": r.get("machine"),
                    "waitClass": r.get("wait_class"),
                    "event": r.get("event"),
                    "state": r.get("state"),
                    "status": r.get("status"),
                    "secondsInWait": r.get("seconds_in_wait", 0),
                    "sqlId": r.get("sql_id"),
                    "lastCallEt": r.get("last_call_et", 0),
                }
                for r in session_rows
            ],
            "totalActive": sum(r.get("session_count", 0) for r in wait_rows),
        }