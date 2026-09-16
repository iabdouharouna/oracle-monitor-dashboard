from typing import List, Dict, Any, Optional
from app.database import oracle_pool
from app.core.oracle_queries import (
    SQL_MONITOR_ACTIVE, SQL_MONITOR_DETAIL, EXECUTION_PLAN, PARALLELISM_DETAIL
)
from app.config import settings
import structlog

logger = structlog.get_logger(__name__)


class SQLMonitorService:
    @staticmethod
    def _map_active(r: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "sqlId": r.get("sql_id"),
            "sqlExecId": r.get("sql_exec_id"),
            "status": r.get("status"),
            "durationSec": r.get("duration_sec") or 0,
            "cpuTimeSec": r.get("cpu_time_sec") or 0,
            "ioTimeSec": r.get("io_time_sec") or 0,
            "sqlText": r.get("sql_text") or "",
            "username": r.get("username") or "",
            "module": r.get("module") or "",
            "pxServers": r.get("px_servers"),
            "startTime": r.get("start_time"),
            "lastRefreshTime": r.get("last_refresh_time"),
        }

    @staticmethod
    def _map_detail(r: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "sqlId": r.get("sql_id"),
            "sqlExecId": r.get("sql_exec_id"),
            "planHashValue": r.get("plan_hash_value") or 0,
            "status": r.get("status"),
            "durationSec": r.get("duration_sec") or 0,
            "cpuTimeSec": r.get("cpu_time_sec") or 0,
            "ioTimeSec": r.get("io_time_sec") or 0,
            "sqlText": r.get("sql_text") or "",
            "username": r.get("username") or "",
            "module": r.get("module") or "",
            "pxServers": r.get("px_servers"),
            "executions": r.get("executions") or 0,
            "bufferGets": r.get("buffer_gets") or 0,
            "diskReads": r.get("disk_reads") or 0,
            "diskWrites": r.get("disk_writes") or 0,
            "physicalReadRequests": r.get("physical_read_requests") or 0,
            "physicalReadBytes": r.get("physical_read_bytes") or 0,
            "physicalWriteRequests": r.get("physical_write_requests") or 0,
            "physicalWriteBytes": r.get("physical_write_bytes") or 0,
            "startTime": r.get("start_time"),
            "lastRefreshTime": r.get("last_refresh_time"),
        }

    @staticmethod
    def _map_plan(p: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": p.get("id"),
            "parentId": p.get("parent_id"),
            "operation": p.get("operation"),
            "options": p.get("options"),
            "objectName": p.get("object_name"),
            "cost": p.get("cost") or 0,
            "cardinality": p.get("cardinality") or 0,
            "bytes": p.get("bytes") or 0,
            "optimizer": p.get("optimizer"),
            "distribution": p.get("distribution"),
            "accessPredicates": p.get("access_predicates"),
            "filterPredicates": p.get("filter_predicates"),
            "depth": 0,
        }

    @staticmethod
    async def get_active_sql() -> List[Dict[str, Any]]:
        rows = await oracle_pool.execute_query(SQL_MONITOR_ACTIVE)
        return [SQLMonitorService._map_active(r) for r in rows]

    @staticmethod
    async def get_sql_detail(sql_id: str, sql_exec_id: int) -> Optional[Dict[str, Any]]:
        rows = await oracle_pool.execute_query(
            SQL_MONITOR_DETAIL, 
            {"sql_id": sql_id, "sql_exec_id": sql_exec_id}
        )
        if not rows:
            return None
        
        detail = SQLMonitorService._map_detail(rows[0])
        
        # Get execution plan
        plan_rows = await oracle_pool.execute_query(
            EXECUTION_PLAN,
            {"sql_id": sql_id, "plan_hash_value": detail["planHashValue"]}
        )
        plan = [SQLMonitorService._map_plan(p) for p in plan_rows]
        
        # Calculate depth for tree display
        detail["executionPlan"] = SQLMonitorService._calculate_plan_depth(plan)
        
        # Get parallelism details
        px_rows = await oracle_pool.execute_query(PARALLELISM_DETAIL)
        detail["parallelism"] = [
            {
                "qcsid": p.get("qcsid"),
                "dfoNumber": p.get("dfo_number"),
                "tqId": p.get("tq_id"),
                "serverType": p.get("server_type"),
                "numRows": p.get("num_rows") or 0,
                "bytes": p.get("bytes") or 0,
                "openTime": p.get("open_time") or 0,
                "avgLatency": p.get("avg_latency") or 0,
            }
            for p in px_rows
        ]
        
        return detail

    @staticmethod
    def _calculate_plan_depth(plan_steps: List[Dict]) -> List[Dict]:
        if not plan_steps:
            return []
        
        # Build adjacency list
        children = {}
        for step in plan_steps:
            pid = step.get("parentId")
            if pid not in children:
                children[pid] = []
            children[pid].append(step)
        
        # Recursive depth calculation
        def set_depth(steps: List[Dict], depth: int = 0):
            for step in steps:
                step["depth"] = depth
                step_id = step.get("id")
                if step_id in children:
                    set_depth(children[step_id], depth + 1)
        
        if None in children:
            set_depth(children[None])
        
        return plan_steps

    @staticmethod
    async def get_execution_plan(sql_id: str, plan_hash_value: int) -> List[Dict[str, Any]]:
        rows = await oracle_pool.execute_query(
            EXECUTION_PLAN,
            {"sql_id": sql_id, "plan_hash_value": plan_hash_value}
        )
        return [SQLMonitorService._map_plan(p) for p in rows]