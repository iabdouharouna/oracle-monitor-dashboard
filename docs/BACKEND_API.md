> **Language:** English · [Version française](fr/BACKEND_API.md)

# Backend API Documentation

## Overview

The Oracle Monitor Dashboard backend exposes a RESTful API built with FastAPI. All endpoints are prefixed with `/api/v1` and follow OpenAPI 3.0 specification.

## Base URL

```
Development: http://localhost:8000/api/v1
Production:  https://your-domain.com/api/v1
```

## Authentication

Endpoints use OAuth2 Bearer tokens (JWT, HS256). The protected endpoints are:

- `GET /auth/me` — `get_current_user`
- `POST /sessions/{sid}/{serial}/kill` — `get_current_dba` (requires role `DBA`, else 403)
- `POST /databases` — `get_current_dba`
- `DELETE /databases/{database_name}` — `get_current_dba`

All other routes are unprotected at the route level.

```
Authorization: Bearer <access_token>
```

### Token Types

| Token | Lifetime | Usage |
|-------|----------|-------|
| Access Token | 30 minutes | API requests |
| Refresh Token | 7 days | Token renewal |

### Error Responses

```json
// 401 Unauthorized
{
  "detail": "Could not validate credentials",
  "code": "AUTHENTICATION_ERROR"
}

// 403 Forbidden
{
  "detail": "DBA role required",
  "code": "AUTHORIZATION_ERROR"
}

// 404 Not Found
{
  "detail": "Tablespace not found",
  "code": "NOT_FOUND"
}

// 422 Validation Error
{
  "detail": "Invalid threshold value",
  "code": "VALIDATION_ERROR"
}

// 500 Internal Error
{
  "detail": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

---

## Endpoints Reference

### Authentication

#### POST `/auth/login`
Login with username/password.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "DBA",
    "is_active": true
  }
}
```

#### POST `/auth/refresh`
Refresh access token using refresh token.

**Headers:**
```
Authorization: Bearer <refresh_token>
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### GET `/auth/me`
Get current user info.

**Response (200):**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "role": "DBA",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### POST `/auth/logout`
Logout (client-side token removal).

---

### Overview

#### GET `/overview`
Aggregated dashboard data.

**Response (200):**
```json
{
  "database": {
    "name": "ORCL",
    "version": "23.0.0.0.0",
    "host": "prod-db",
    "platform": "Linux x86_64",
    "status": "OPEN",
    "role": "PRIMARY",
    "startup_time": "2024-01-10 08:00:00",
    "uptime_seconds": 432000
  },
  "alerts": {
    "critical": 2,
    "warning": 5,
    "info": 0,
    "last_checked": "2024-01-15T10:30:00Z"
  },
  "storage": {
    "total_gb": 500.5,
    "used_gb": 380.2,
    "free_gb": 120.3,
    "pct_used": 75.9,
    "tablespace_count": 12,
    "critical_tablespaces": 1
  },
  "sessions": {
    "total": 145,
    "active": 23,
    "inactive": 120,
    "blocked": 2,
    "pct_active": 15.8
  },
  "io": {
    "read_mbps": 45.2,
    "write_mbps": 12.8,
    "read_iops": 1250,
    "write_iops": 480,
    "avg_read_latency_ms": 3.2,
    "avg_write_latency_ms": 1.8
  },
  "waits": {
    "top_wait_classes": [
      {"wait_class": "User I/O", "waits_per_sec": 1250, "time_waited_ms": 45000, "pct_db_time": 45.2},
      {"wait_class": "System I/O", "waits_per_sec": 320, "time_waited_ms": 8500, "pct_db_time": 12.1}
    ],
    "total_waits_per_sec": 1850,
    "db_time_per_sec": 2.5
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### GET `/overview/timeseries`
Historical metrics for sparklines.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| hours | integer | 24 | Hours of history |

**Response (200):**
```json
{
  "timestamps": ["2024-01-14T10:00:00Z", "2024-01-14T11:00:00Z", ...],
  "series": {
    "cpu_usage": [45.2, 48.1, ...],
    "sessions_active": [23, 28, ...],
    "physical_reads_mbps": [45.2, 52.3, ...]
  }
}
```

---

### Instance Viewer

#### GET `/instance/info`
Database instance information.

#### GET `/instance/clients`
Sessions grouped by machine/program/module.

#### GET `/instance/processes`
Process metrics (count, rates, cursors).

#### GET `/instance/memory`
SGA/PGA breakdown and cache hit ratios.

#### GET `/instance/storage`
Tablespaces, redo logs, archive rate.

#### GET `/instance/cpu-ratio`
DB CPU vs OS CPU utilization.

#### GET `/instance/top-sql`
Top SQL statements by CPU/elapsed/buffer gets.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 10 | Number of SQL statements |

#### GET `/instance/all`
Complete instance viewer data (all panels).

---

### Performance Hub (ASH Analytics)

#### GET `/performance/ash/aas`
Average Active Sessions time series.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| hours | float | 1 | Hours of history (0.083-24) |
| dimension | string | wait_class | Group by dimension |

**Dimensions:** `wait_class`, `event`, `sql_id`, `username`, `machine`, `module`, `action`

#### GET `/performance/ash/top-sql`
Top SQL by ASH samples.

#### GET `/performance/ash/wait-classes`
Wait class breakdown with percentages.

#### GET `/performance/ash/drilldown`
Drill-down data for secondary tables.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| dimension | string | wait_class | Primary dimension |
| filter_dimension | string | sql_id | Filter dimension |
| hours | float | 1 | Hours of history |

#### GET `/performance/awr/snapshots`
List AWR snapshots (requires Diagnostics Pack). Returns the last 30 days of snapshots for the
current database (`dbid` resolved from `v$database`).

**Response (200):**
```json
[
  {
    "snapId": 84,
    "dbid": 1509902213,
    "instanceNumber": 1,
    "beginTime": "2026-09-14 10:00:00",
    "endTime": "2026-09-14 10:30:00",
    "durationMin": 30.0,
    "startupTime": "2026-09-01 08:00:00"
  }
]
```
- `durationMin` is computed as `(CAST(end_interval_time AS DATE) - CAST(begin_interval_time AS DATE)) * 24 * 60`
  (the raw columns are `TIMESTAMP` — subtracting them yields an interval and `ROUND(...)` on it fails
  with `ORA-00932`).
- `startupTime` lets the UI detect instance startup windows.

#### GET `/performance/awr/report`
Generate an AWR report for a snapshot range.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| snap_id_start | integer | Start snapshot ID (required) |
| snap_id_end | integer | End snapshot ID (required, must be > start) |
| report_type | string | `html` (default) or `text` |

**Response (200):** the generated report (HTML or plain text), plus metadata:
```json
{
  "html": "<!DOCTYPE html><html>...AWR Report...</html>",
  "dbid": 1509902213,
  "instanceNumber": 1,
  "snapIdStart": 84,
  "snapIdEnd": 85,
  "generatedAt": "2026-09-16T10:30:00Z",
  "reportType": "html"
}
```

**Error: instance restart within range (400):**
`DBMS_WORKLOAD_REPOSITORY` raises **ORA-20019** when the selected snapshot range crosses an
instance restart. The backend maps it to a friendly HTTP 400:

```json
{
  "detail": "The selected snapshot range 89-91 crosses an instance restart. Pick a range within a single startup window."
}
```

The detection matches the error text `"20019"` or `"re-started during specified snapshot interval"`.
Any other failure returns HTTP 500 with `"AWR report generation failed: ..."`.

> The implementation uses `TABLE(dbms_workload_repository.awr_report_html(...))` /
> `awr_report_text(...)`. The package returns the report as a CLOB split across rows; the backend
> concatenates the `output` column of every row into a single string.

---

### SQL Monitor

#### GET `/sql-monitor/active`
Real-time monitored SQL executions.

**Response (200):**
```json
[
  {
    "sql_id": "abc123def456",
    "sql_exec_id": 1678901234,
    "status": "EXECUTING",
    "duration_sec": 45.2,
    "cpu_time_sec": 38.5,
    "io_time_sec": 6.7,
    "sql_text": "SELECT * FROM large_table WHERE ...",
    "username": "APP_USER",
    "module": "batch_process",
    "px_servers": 8,
    "start_time": "2024-01-15T10:25:00",
    "last_refresh_time": "2024-01-15T10:30:15"
  }
]
```

#### GET `/sql-monitor/detail`
Detailed SQL monitor entry with execution plan.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| sql_id | string | SQL identifier |
| sql_exec_id | integer | Execution identifier |

#### GET `/sql-monitor/plan`
Execution plan (tabular format).

#### GET `/sql-monitor/history`
Historical SQL monitor (requires Diagnostics Pack).

---

### Sessions

#### GET `/sessions`
Active sessions with filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | `ACTIVE`, `INACTIVE`, `KILLED` |
| username | string | Filter by username |
| machine | string | Filter by machine (LIKE) |
| min_duration | integer | Minimum last_call_et (seconds) |

**Response (200):**
```json
[
  {
    "sid": 123,
    "serial": 45678,
    "username": "APP_USER",
    "machine": "app-server-01",
    "program": "JDBC Thin Client",
    "module": "order_processing",
    "logon_time": "2024-01-15T08:00:00",
    "last_call_et": 120,
    "status": "ACTIVE",
    "state": "WAITING",
    "wait_class": "User I/O",
    "event": "db file sequential read",
    "seconds_in_wait": 5,
    "blocking_session": null,
    "sql_id": "abc123def456",
    "pga_allocated_mb": 25.4,
    "pga_used_mb": 18.2
  }
]
```

#### GET `/sessions/blocking`
Blocking session chains.

#### GET `/sessions/long-ops`
Long-running operations (V$SESSION_LONGOPS).

#### POST `/sessions/{sid}/{serial}/kill`
Kill a session (requires DBA role — 403 for the `VIEWER` role).

Executes `ALTER SYSTEM KILL SESSION '{sid},{serial}' IMMEDIATE`.

**Response (200):**
```json
{
  "message": "Session killed successfully"
}
```

On the frontend, the Sessions page exposes a **"Kill Selected (n)"** button (only for users whose
role is `DBA`): the user selects session rows in the `DataTable` (selection ids are `sid,serial`),
and the clients loops the kill mutation over every selected pair, then clears the selection.

---

### Storage

#### GET `/storage/tablespaces`
All tablespaces with usage.

**Response (200):**
```json
[
  {
    "name": "USERS",
    "type": "PERMANENT",
    "status": "ONLINE",
    "size_mb": 10240,
    "used_mb": 8192,
    "free_mb": 2048,
    "pct_used": 80.0,
    "autoextensible": true,
    "max_size_mb": 20480
  }
]
```

#### GET `/storage/tablespaces/{name}`
Detailed tablespace with datafiles, segments, growth trend.

#### GET `/storage/capacity`
Capacity planning projections.

---

### Memory

#### GET `/memory/sga-advice`
SGA Target Advisor recommendations.

#### GET `/memory/pga-advice`
PGA Target Advisor recommendations.

#### GET `/memory/memory-target-advice`
Memory Target Advisor (AMM).

#### GET `/memory/all`
All memory advisors combined.

---

### Wait Events

#### GET `/waits/system`
System wait events (V$SYSTEM_EVENT, non-idle).

#### GET `/waits/session`
Current session waits (V$SESSION_WAIT).

#### GET `/waits/io-metrics`
I/O metrics from V$SYSMETRIC.

#### GET `/waits/history`
Historical metrics from V$SYSMETRIC_HISTORY.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| hours | float | 24 | Hours of history |

---

### Alerts

#### GET `/alerts/log`
Alert log entries.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| hours | float | 24 | Hours of history |
| limit | integer | 100 | Max entries |

#### GET `/alerts/thresholds`
Current threshold configuration (effective: env defaults merged with `config/thresholds.json`).

```json
{
  "tablespaceWarn": 80,
  "tablespaceCrit": 90,
  "sessionsWarn": 70,
  "sessionsCrit": 85,
  "cpuWarn": 80,
  "cpuCrit": 90,
  "waitTimeMsWarn": 100,
  "waitTimeMsCrit": 500
}
```

#### PUT `/alerts/thresholds`
Update threshold configuration. Accepts partial payloads; every valid key is merged into the
persisted `config/thresholds.json` (created on first call) and the full effective config is returned.

**Request:**
```json
{
  "cpuWarn": 82,
  "cpuCrit": 93
}
```

**Response (200):** the full merged configuration (same shape as `GET`, showing the newly saved
values). The response is consumed by the Alerts page, which also shows a success/error Snackbar.

> Persistence details: keys are validated against a fixed set, only numeric non-boolean values are
> accepted, the file is written with `mkdir(parents=True, exist_ok=True)` and a
> `"THRESHOLDS_FILE: saved"` log line is emitted. Non-integer values are dropped on read.

#### GET `/alerts/check`
Check current thresholds against live metrics.

---

### Exports

#### GET `/exports/sessions/csv`
Export sessions to CSV.

#### GET `/exports/tablespaces/csv`
Export tablespaces to CSV.

#### GET `/exports/sql-monitor/csv`
Export SQL monitor to CSV.

---

### WebSocket

#### WS `/ws/{channel}`
Real-time updates via WebSocket.

**Channels:**
- `overview` - Dashboard KPIs, alerts
- `sql_monitor` - SQL monitor changes
- `sessions` - Session connect/disconnect/blocking
- `performance` - AAS data points (throttled 5s)

**Message Format:**
```json
{
  "type": "overview_update",
  "payload": { ... },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Client Heartbeat:**
```json
// Client sends
{"type": "ping", "data": "heartbeat"}

// Server responds
{"type": "pong", "data": "heartbeat"}
```

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| page | integer | 1 | - |
| size | integer | 50 | 500 |

**Response:**
```json
{
  "items": [...],
  "total": 1250,
  "page": 1,
  "size": 50,
  "pages": 25
}
```

---

## Rate Limiting (Planned)

| Endpoint Category | Limit |
|-------------------|-------|
| Auth | 5 req/min |
| Read APIs | 100 req/min |
| Write APIs | 20 req/min |
| WebSocket | 1 conn/user |

---

## OpenAPI Documentation

Interactive API docs available at:
- **Swagger UI**: `/docs`
- **ReDoc**: `/redoc`
- **OpenAPI JSON**: `/api/v1/openapi.json`

---

## WebSocket Events Reference

### Overview Channel
```json
// Server -> Client
{
  "type": "overview_update",
  "payload": {
    "sessions": {"active": 25, "total": 150},
    "cpu": {"db_cpu_pct": 45.2},
    "alerts": {"critical": 1}
  }
}
```

### SQL Monitor Channel
```json
{
  "type": "sql_monitor_update",
  "payload": {
    "action": "added|updated|removed",
    "sql_id": "abc123def456",
    "sql_exec_id": 12345,
    "status": "EXECUTING",
    "duration_sec": 10.5
  }
}
```

### Sessions Channel
```json
{
  "type": "sessions_update",
  "payload": {
    "action": "connected|disconnected|blocked|unblocked",
    "session": { "sid": 123, "serial": 456, ... }
  }
}
```

### Performance Channel
```json
{
  "type": "performance_update",
  "payload": {
    "aas_data": [
      {"timestamp": "2024-01-15T10:30:00", "wait_class": "User I/O", "aas": 12.5}
    ]
  }
}
```