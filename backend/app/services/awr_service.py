from typing import Any, Dict, List

import structlog

from app.database import oracle_pool

logger = structlog.get_logger(__name__)

SNAPSHOTS_QUERY = """
SELECT
    snap_id,
    dbid,
    instance_number,
    TO_CHAR(begin_interval_time, 'YYYY-MM-DD HH24:MI:SS') as begin_time,
    TO_CHAR(end_interval_time, 'YYYY-MM-DD HH24:MI:SS') as end_time,
    ROUND((CAST(end_interval_time AS DATE) - CAST(begin_interval_time AS DATE)) * 24 * 60, 1) as duration_min,
    TO_CHAR(startup_time, 'YYYY-MM-DD HH24:MI:SS') as startup_time
FROM dba_hist_snapshot
WHERE dbid = :dbid
ORDER BY snap_id DESC
"""

REPORT_QUERY = """
SELECT
    output
FROM TABLE(dbms_workload_repository.{func_name}(:dbid, :instance_number, :snap_start, :snap_end, :options))
"""


class AWRService:
    @staticmethod
    async def get_snapshots() -> List[Dict[str, Any]]:
        dbid = await oracle_pool.execute_scalar("SELECT dbid FROM v$database")
        rows = await oracle_pool.execute_query(SNAPSHOTS_QUERY, {"dbid": dbid})
        return [
            {
                "snapId": r.get("snap_id"),
                "dbid": r.get("dbid"),
                "instanceNumber": r.get("instance_number"),
                "beginTime": r.get("begin_time"),
                "endTime": r.get("end_time"),
                "durationMin": r.get("duration_min", 0),
                "startupTime": r.get("startup_time"),
            }
            for r in rows
        ]

    @staticmethod
    async def generate_report(
        snap_id_start: int,
        snap_id_end: int,
        dbid: int | None = None,
        instance_number: int = 1,
        report_type: str = "html",
    ) -> Dict[str, Any]:
        if snap_id_end <= snap_id_start:
            raise ValueError("snap_id_end must be greater than snap_id_start")
        if dbid is None:
            dbid = await oracle_pool.execute_scalar("SELECT dbid FROM v$database")

        func_name = "awr_report_html" if report_type == "html" else "awr_report_text"
        query = REPORT_QUERY.format(func_name=func_name)
        rows = await oracle_pool.execute_query(
            query,
            {
                "dbid": dbid,
                "instance_number": instance_number,
                "snap_start": snap_id_start,
                "snap_end": snap_id_end,
                "options": 0,
            },
        )
        html = "".join(r.get("output") or "" for r in rows)
        return {
            "html": html,
            "dbid": dbid,
            "instanceNumber": instance_number,
            "snapIdStart": snap_id_start,
            "snapIdEnd": snap_id_end,
            "generatedAt": __import__("datetime").datetime.now().isoformat(),
            "reportType": report_type,
        }