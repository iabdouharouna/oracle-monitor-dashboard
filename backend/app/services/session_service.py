from typing import List, Dict, Any, Optional
from app.database import oracle_pool
from app.core.oracle_queries import (
    SESSIONS, BLOCKING_SESSIONS, LONG_OPS
)
from app.config import settings
import structlog

logger = structlog.get_logger(__name__)


class SessionService:
    @staticmethod
    async def get_sessions(
        status: Optional[str] = None,
        username: Optional[str] = None,
        machine: Optional[str] = None,
        min_duration: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        query = SESSIONS
        params = {}
        
        conditions = []
        if status:
            conditions.append("s.status = :status")
            params["status"] = status.upper()
        if username:
            conditions.append("s.username = :username")
            params["username"] = username.upper()
        if machine:
            conditions.append("s.machine LIKE :machine")
            params["machine"] = f"%{machine}%"
        if min_duration:
            conditions.append("s.last_call_et >= :min_duration")
            params["min_duration"] = min_duration
        
        if conditions:
            # Insert WHERE clause before ORDER BY
            query = query.replace("WHERE s.type = 'USER'", 
                                "WHERE s.type = 'USER' AND " + " AND ".join(conditions))
        
        rows = await oracle_pool.execute_query(query, params)
        return [
            {
                "sid": r.get("sid"),
                "serial": r.get("serial#"),
                "username": r.get("username"),
                "machine": r.get("machine") or "",
                "program": r.get("program") or "",
                "module": r.get("module"),
                "action": r.get("action"),
                "logonTime": r.get("logon_time"),
                "lastCallEt": r.get("last_call_et") or 0,
                "status": r.get("status"),
                "state": r.get("state"),
                "waitClass": r.get("wait_class"),
                "event": r.get("event"),
                "secondsInWait": r.get("seconds_in_wait") or 0,
                "blockingSession": r.get("blocking_session"),
                "blockingInstance": r.get("blocking_instance"),
                "sqlId": r.get("sql_id"),
                "prevSqlId": r.get("prev_sql_id"),
                "pgaAllocatedMB": r.get("pga_allocated_mb") or 0,
                "pgaUsedMB": r.get("pga_used_mb") or 0,
            }
            for r in rows
        ]

    @staticmethod
    async def get_blocking_chains() -> List[Dict[str, Any]]:
        rows = await oracle_pool.execute_query(BLOCKING_SESSIONS)
        
        # Build chains
        blockers = {}
        for row in rows:
            blocker_sid = row.get("blocking_session")
            if blocker_sid not in blockers:
                blockers[blocker_sid] = {
                    "blocker": {
                        "sid": blocker_sid,
                        "serial": row.get("serial#"),
                        "username": row.get("username"),
                        "module": row.get("module"),
                        "machine": row.get("machine"),
                        "seconds_in_wait": row.get("seconds_in_wait"),
                        "event": row.get("event"),
                    },
                    "blocked": [],
                    "object_name": row.get("object_name"),
                    "lock_type": "ROW",  # Would need more logic to determine
                    "duration_sec": row.get("seconds_in_wait", 0),
                }
            blockers[blocker_sid]["blocked"].append({
                "sid": row.get("sid"),
                "serial": row.get("serial#"),
                "username": row.get("username"),
                "module": row.get("module"),
                "machine": row.get("machine"),
                "seconds_in_wait": row.get("seconds_in_wait"),
                "event": row.get("event"),
            })
        
        return list(blockers.values())

    @staticmethod
    async def get_long_operations() -> List[Dict[str, Any]]:
        return await oracle_pool.execute_query(LONG_OPS)

    @staticmethod
    async def kill_session(sid: int, serial: int) -> bool:
        try:
            async with oracle_pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute(
                        f"ALTER SYSTEM KILL SESSION '{sid},{serial}' IMMEDIATE"
                    )
            return True
        except Exception as e:
            logger.error("Failed to kill session", sid=sid, serial=serial, error=str(e))
            return False