from typing import List, Dict, Any
import json
from pathlib import Path
from app.database import oracle_pool
from app.core.oracle_queries import ALERT_LOG
from app.config import settings
import structlog

logger = structlog.get_logger(__name__)


class AlertService:
    @staticmethod
    async def get_alert_log(hours: float = 24, limit: int = 100) -> List[Dict[str, Any]]:
        rows = await oracle_pool.execute_query(ALERT_LOG, {"hours": hours, "limit": limit})
        return [
            {
                "timestamp": r.get("timestamp"),
                "severity": r.get("severity"),
                "message": r.get("message"),
                "facility": r.get("facility"),
            }
            for r in rows
        ]

    @staticmethod
    async def check_thresholds() -> List[Dict[str, Any]]:
        from app.connections import get_catalog

        if not get_catalog():
            logger.info("No Oracle database configured, threshold check skipped")
            return []

        alerts = []
        t = AlertService.effective_thresholds()

        # Check tablespace thresholds
        from app.services.storage_service import StorageService
        tablespaces = await StorageService.get_tablespaces()
        for ts in tablespaces:
            pct = ts.get("pct_used", 0)
            if pct >= t["tablespaceCrit"]:
                alerts.append({
                    "metric": f"tablespace.{ts['name']}.pct_used",
                    "value": pct,
                    "threshold": t["tablespaceCrit"],
                    "severity": "CRITICAL",
                    "message": f"Tablespace {ts['name']} is {pct:.1f}% full (critical: {t['tablespaceCrit']}%)",
                })
            elif pct >= t["tablespaceWarn"]:
                alerts.append({
                    "metric": f"tablespace.{ts['name']}.pct_used",
                    "value": pct,
                    "threshold": t["tablespaceWarn"],
                    "severity": "WARNING",
                    "message": f"Tablespace {ts['name']} is {pct:.1f}% full (warning: {t['tablespaceWarn']}%)",
                })
        
        # Check session count
        from app.services.session_service import SessionService
        sessions = await SessionService.get_sessions()
        total_sessions = len(sessions)
        active_sessions = len([s for s in sessions if s.get("status") == "ACTIVE"])
        
        limit_row = await oracle_pool.execute_query(
            "SELECT value FROM v$parameter WHERE name = 'sessions'", fetch_all=False
        )
        max_sessions = int(limit_row[0]["value"]) if limit_row else 1000
        pct_sessions = (total_sessions / max_sessions) * 100 if max_sessions > 0 else 0
        
        if pct_sessions >= t["sessionsCrit"]:
            alerts.append({
                "metric": "sessions.pct_used",
                "value": pct_sessions,
                "threshold": t["sessionsCrit"],
                "severity": "CRITICAL",
                "message": f"Session usage at {pct_sessions:.1f}% (critical: {t['sessionsCrit']}%)",
            })
        elif pct_sessions >= t["sessionsWarn"]:
            alerts.append({
                "metric": "sessions.pct_used",
                "value": pct_sessions,
                "threshold": t["sessionsWarn"],
                "severity": "WARNING",
                "message": f"Session usage at {pct_sessions:.1f}% (warning: {t['sessionsWarn']}%)",
            })
        
        # Check CPU
        from app.services.instance_service import InstanceService
        cpu = await InstanceService.get_cpu_ratio()
        db_cpu = cpu.get("db_cpu_pct", 0)
        
        if db_cpu >= t["cpuCrit"]:
            alerts.append({
                "metric": "cpu.db_cpu_pct",
                "value": db_cpu,
                "threshold": t["cpuCrit"],
                "severity": "CRITICAL",
                "message": f"Database CPU at {db_cpu:.1f}% (critical: {t['cpuCrit']}%)",
            })
        elif db_cpu >= t["cpuWarn"]:
            alerts.append({
                "metric": "cpu.db_cpu_pct",
                "value": db_cpu,
                "threshold": t["cpuWarn"],
                "severity": "WARNING",
                "message": f"Database CPU at {db_cpu:.1f}% (warning: {t['cpuWarn']}%)",
            })
        
        return alerts

    @staticmethod
    def get_threshold_config() -> Dict[str, int]:
        return {
            "tablespaceWarn": settings.THRESHOLD_TABLESPACE_WARN,
            "tablespaceCrit": settings.THRESHOLD_TABLESPACE_CRIT,
            "sessionsWarn": settings.THRESHOLD_SESSIONS_WARN,
            "sessionsCrit": settings.THRESHOLD_SESSIONS_CRIT,
            "cpuWarn": settings.THRESHOLD_CPU_WARN,
            "cpuCrit": settings.THRESHOLD_CPU_CRIT,
            "waitTimeMsWarn": settings.THRESHOLD_WAIT_TIME_MS_WARN,
            "waitTimeMsCrit": settings.THRESHOLD_WAIT_TIME_MS_CRIT,
        }

    @staticmethod
    def _thresholds_file() -> Path:
        return Path(settings.THRESHOLDS_FILE)

    @staticmethod
    def load_persisted_thresholds() -> Dict[str, int]:
        path = AlertService._thresholds_file()
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            return {}
        return {k: v for k, v in data.items() if isinstance(v, int)}

    @staticmethod
    def effective_thresholds() -> Dict[str, int]:
        merged = dict(AlertService.get_threshold_config())
        merged.update(AlertService.load_persisted_thresholds())
        return merged

    @staticmethod
    def update_thresholds(thresholds: Dict[str, Any]) -> Dict[str, int]:
        valid_keys = AlertService.get_threshold_config().keys()
        updated: Dict[str, int] = {}
        for key, value in thresholds.items():
            if key in valid_keys and isinstance(value, (int, float)) and not isinstance(value, bool):
                updated[key] = int(value)

        persisted = AlertService.load_persisted_thresholds()
        persisted.update(updated)
        path = AlertService._thresholds_file()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(persisted, indent=2), encoding="utf-8")
        logger.info("THRESHOLDS_FILE: saved", path=str(path), count=len(persisted))

        merged = dict(AlertService.get_threshold_config())
        merged.update(persisted)
        return merged

    @staticmethod
    async def record_triggered(alerts: List[Dict[str, Any]]) -> None:
        """Persist triggered alerts to Redis for later history queries."""
        from app.redis import redis_client
        from datetime import datetime, timezone

        if not alerts:
            return
        try:
            now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            for alert in alerts:
                payload = json.dumps(
                    {**alert, "timestamp": now, "acknowledged": False}, ensure_ascii=False
                )
                await redis_client.client.rpush("alerts:history", payload)
            await redis_client.client.ltrim("alerts:history", -1000, -1)
        except Exception:
            logger.exception("Failed to record triggered alerts")

    @staticmethod
    async def get_history(limit: int = 100) -> List[Dict[str, Any]]:
        """Return persisted alert history from Redis (most recent first)."""
        from app.redis import redis_client

        try:
            raw = await redis_client.client.lrange("alerts:history", -limit, -1)
            alerts = []
            for item in reversed(raw):
                if isinstance(item, bytes):
                    item = item.decode("utf-8")
                try:
                    alert = json.loads(item)
                except (ValueError, TypeError):
                    continue
                alert["id"] = str(len(alerts) + 1)
                alerts.append(alert)
            return alerts
        except Exception:
            logger.exception("Failed to get alert history")
            return []