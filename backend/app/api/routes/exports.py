from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
import io
import csv
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get("/sessions/csv")
async def export_sessions_csv():
    from app.services.session_service import SessionService
    sessions = await SessionService.get_sessions()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "SID", "Serial", "Username", "Machine", "Program", "Module",
        "Logon Time", "Status", "State", "Wait Class", "Event",
        "Seconds in Wait", "Blocking Session", "SQL ID", "PGA Allocated MB"
    ])
    for s in sessions:
        writer.writerow([
            s.get("sid"), s.get("serial#"), s.get("username"),
            s.get("machine"), s.get("program"), s.get("module"),
            s.get("logon_time"), s.get("status"), s.get("state"),
            s.get("wait_class"), s.get("event"), s.get("seconds_in_wait"),
            s.get("blocking_session"), s.get("sql_id"), s.get("pga_allocated_mb")
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sessions.csv"}
    )


@router.get("/tablespaces/csv")
async def export_tablespaces_csv():
    from app.services.storage_service import StorageService
    tablespaces = await StorageService.get_tablespaces()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Tablespace", "Type", "Status", "Size MB", "Used MB", 
        "Free MB", "Pct Used", "Autoextensible", "Max Size MB"
    ])
    for ts in tablespaces:
        writer.writerow([
            ts.get("name"), ts.get("type"), ts.get("status"),
            ts.get("size_mb"), ts.get("used_mb"), ts.get("free_mb"),
            ts.get("pct_used"), ts.get("autoextensible"), ts.get("max_size_mb")
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tablespaces.csv"}
    )


@router.get("/sql-monitor/csv")
async def export_sql_monitor_csv():
    from app.services.sql_monitor_service import SQLMonitorService
    sqls = await SQLMonitorService.get_active_sql()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "SQL ID", "SQL Exec ID", "Status", "Duration Sec", "CPU Time Sec",
        "IO Time Sec", "Username", "Module", "PX Servers", "Start Time",
        "Last Refresh Time", "SQL Text"
    ])
    for s in sqls:
        writer.writerow([
            s.get("sql_id"), s.get("sql_exec_id"), s.get("status"),
            s.get("duration_sec"), s.get("cpu_time_sec"), s.get("io_time_sec"),
            s.get("username"), s.get("module"), s.get("px_servers"),
            s.get("start_time"), s.get("last_refresh_time"), s.get("sql_text")
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sql_monitor.csv"}
    )