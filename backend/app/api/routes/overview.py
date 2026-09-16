from fastapi import APIRouter, Depends
from app.services.instance_service import InstanceService
from app.services.session_service import SessionService
from app.services.storage_service import StorageService
from app.services.wait_service import WaitService
from app.services.alert_service import AlertService
from app.core.models import OverviewData
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get("", response_model=OverviewData)
async def get_overview():
    try:
        # Database status
        db_info = await InstanceService.get_database_info()
        
        # Alerts summary
        alerts = await AlertService.check_thresholds()
        alert_summary = {
            "critical": len([a for a in alerts if a["severity"] == "CRITICAL"]),
            "warning": len([a for a in alerts if a["severity"] == "WARNING"]),
            "info": 0,
            "last_checked": "2024-01-01T00:00:00Z",
        }
        
        # Storage summary
        tablespaces = await StorageService.get_tablespaces()
        total_gb = sum(ts["sizeMB"] for ts in tablespaces) / 1024
        used_gb = sum(ts["usedMB"] for ts in tablespaces) / 1024
        free_gb = sum(ts["freeMB"] for ts in tablespaces) / 1024
        critical_ts = len([ts for ts in tablespaces if ts["pctUsed"] >= 90])
        
        storage_summary = {
            "total_gb": round(total_gb, 2),
            "used_gb": round(used_gb, 2),
            "free_gb": round(free_gb, 2),
            "pct_used": round(used_gb / total_gb * 100, 1) if total_gb > 0 else 0,
            "tablespace_count": len(tablespaces),
            "critical_tablespaces": critical_ts,
        }
        
        # Sessions summary
        sessions = await SessionService.get_sessions()
        total_sessions = len(sessions)
        active_sessions = len([s for s in sessions if s.get("status") == "ACTIVE"])
        inactive_sessions = len([s for s in sessions if s.get("status") == "INACTIVE"])
        blocked_sessions = len([s for s in sessions if s.get("blocking_session") is not None])
        
        session_summary = {
            "total": total_sessions,
            "active": active_sessions,
            "inactive": inactive_sessions,
            "blocked": blocked_sessions,
            "pct_active": round(active_sessions / total_sessions * 100, 1) if total_sessions > 0 else 0,
        }
        
        # I/O summary
        io_metrics = await WaitService.get_io_metrics()
        io_summary = {
            "read_mbps": round(io_metrics.get("physicalReadBytesPerSec", 0) / 1024 / 1024, 2),
            "write_mbps": round(io_metrics.get("physicalWriteBytesPerSec", 0) / 1024 / 1024, 2),
            "read_iops": io_metrics.get("physicalReadsPerSec", 0),
            "write_iops": io_metrics.get("physicalWritesPerSec", 0),
            "avg_read_latency_ms": io_metrics.get("avgReadLatencyMs", 0),
            "avg_write_latency_ms": io_metrics.get("avgWriteLatencyMs", 0),
        }
        
        # Waits summary
        system_waits = await WaitService.get_system_waits()
        top_waits = sorted(system_waits, key=lambda x: x["pctDBTime"], reverse=True)[:5]
        
        waits_summary = {
            "top_wait_classes": [
                {
                    "wait_class": w["waitClass"],
                    "waits_per_sec": w["totalWaits"] / 3600,  # approximation
                    "time_waited_ms": w["timeWaitedSec"] * 1000,
                    "pct_db_time": w["pctDBTime"],
                }
                for w in top_waits
            ],
            "total_waits_per_sec": sum(w["totalWaits"] for w in system_waits) / 3600,
            "db_time_per_sec": sum(w["timeWaitedSec"] for w in system_waits) / 3600,
        }
        
        return OverviewData(
            database=db_info,
            alerts=alert_summary,
            storage=storage_summary,
            sessions=session_summary,
            io=io_summary,
            waits=waits_summary,
            timestamp="2024-01-01T00:00:00Z",
        )
    except Exception as e:
        logger.error("Failed to get overview", error=str(e))
        raise


@router.get("/timeseries")
async def get_overview_timeseries(hours: int = 24):
    try:
        from app.services.wait_service import WaitService
        history = await WaitService.get_metrics_history(hours)
        return {
            "timestamps": [],
            "series": history,
        }
    except Exception as e:
        logger.error("Failed to get timeseries", error=str(e))
        raise