WAIT_CLASSES = [
    "Idle",
    "User I/O",
    "System I/O",
    "Commit",
    "Concurrency",
    "Cluster",
    "Application",
    "Administrative",
    "Configuration",
    "Network",
    "Scheduler",
    "Queueing",
    "Other",
]

WAIT_CLASS_COLORS = {
    "User I/O": "#0066CC",
    "System I/O": "#00A651",
    "Commit": "#FF8C00",
    "Concurrency": "#D13438",
    "Cluster": "#8B5CF6",
    "Application": "#EC4899",
    "Administrative": "#6B7280",
    "Configuration": "#F59E0B",
    "Network": "#06B6D4",
    "Scheduler": "#84CC16",
    "Queueing": "#F97316",
    "Other": "#9CA3AF",
    "Idle": "#E5E7EB",
}

SESSION_STATUS = ["ACTIVE", "INACTIVE", "KILLED", "CACHED", "SNIPED"]
SESSION_STATES = ["WAITING", "ON CPU"]

TABLESPACE_TYPES = ["PERMANENT", "TEMPORARY", "UNDO"]
TABLESPACE_STATUSES = ["ONLINE", "OFFLINE", "READ ONLY"]

SQL_MONITOR_STATUS = [
    "EXECUTING",
    "DONE (ERROR)",
    "DONE (ALL ROWS)",
    "DONE (FIRST N ROWS)",
]

ALERT_SEVERITIES = ["CRITICAL", "ERROR", "WARNING", "INFO"]

DEFAULT_THRESHOLDS = {
    "tablespace_warn": 80,
    "tablespace_crit": 90,
    "sessions_warn": 70,
    "sessions_crit": 85,
    "cpu_warn": 80,
    "cpu_crit": 90,
    "wait_time_ms_warn": 100,
    "wait_time_ms_crit": 500,
}

REFRESH_INTERVALS = [5, 15, 30, 60, 0]

TIME_RANGES = {
    "5m": "5 minutes",
    "15m": "15 minutes",
    "1h": "1 hour",
    "6h": "6 hours",
    "24h": "24 hours",
    "7d": "7 days",
    "30d": "30 days",
}