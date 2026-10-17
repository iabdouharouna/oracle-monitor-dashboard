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
            s.get("sid"), s.get("serial"), s.get("username"),
            s.get("machine"), s.get("program"), s.get("module"),
            s.get("logonTime"), s.get("status"), s.get("state"),
            s.get("waitClass"), s.get("event"), s.get("secondsInWait"),
            s.get("blockingSession"), s.get("sqlId"), s.get("pgaAllocatedMB")
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
        "Free MB", "Pct Used", "Pct Used Max", "Autoextensible", "Max Size MB"
    ])
    for ts in tablespaces:
        writer.writerow([
            ts.get("name"), ts.get("type"), ts.get("status"),
            ts.get("sizeMB"), ts.get("usedMB"), ts.get("freeMB"),
            ts.get("pctUsed"), ts.get("pctUsedMax"),
            ts.get("autoextensible"), ts.get("maxSizeMB")
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
            s.get("sqlId"), s.get("sqlExecId"), s.get("status"),
            s.get("durationSec"), s.get("cpuTimeSec"), s.get("ioTimeSec"),
            s.get("username"), s.get("module"), s.get("pxServers"),
            s.get("startTime"), s.get("lastRefreshTime"), s.get("sqlText")
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sql_monitor.csv"}
    )