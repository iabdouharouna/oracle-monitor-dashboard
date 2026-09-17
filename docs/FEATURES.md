> **Language:** English · [Version française](fr/FEATURES.md)

# Functional Features Documentation

## Overview

The Oracle Monitor Dashboard replicates the monitoring capabilities of SQL Developer, organized into 12 functional modules accessible via the sidebar navigation.

---

## 1. Dashboard (Overview)

**Route:** `/`  
**API:** `GET /api/v1/overview`  
**Refresh:** 30 seconds (configurable)

### Features

| Component | Description | Data Source |
|-----------|-------------|-------------|
| **Database Status** | Name, version, host, platform, status (OPEN/MOUNTED), role, uptime | `v$instance`, `v$database` |
| **Alert Summary** | Critical/Warning/Info counts from threshold checks | `AlertService.check_thresholds()` |
| **Storage Overview** | Total/Used/Free GB, % used, tablespace count, critical count | `dba_tablespaces` + `dba_free_space` |
| **Session Summary** | Total/Active/Inactive/Blocked, % active | `v$session` |
| **I/O Performance** | Read/Write MB/s, IOPS, avg latency | `v$sysmetric`, `v$iostat_function` |
| **Wait Events** | Top 5 wait classes by % DB time | `v$system_event` |

### Visualizations

- **4 KPI Cards** - Status, Storage, Sessions, CPU
- **AAS Chart** (placeholder) - Average Active Sessions trend
- **Wait Class Pie** - Top wait classes distribution
- **Top SQL Bar** - Top 10 by CPU time
- **CPU Ratio** - DB CPU vs OS CPU vs DB Time
- **Tablespace Gauges** - Radial gauges per tablespace
- **I/O Summary Grid** - Read/Write MB/s, latency
- **Quick Stats Grid** - Version, platform, host, role, blocked sessions, critical tablespaces

### Actions

- Manual refresh button
- Auto-refresh interval selector (5s, 15s, 30s, 60s, Off)
- Time range selector for historical view
- Quick links to detailed pages

---

## 2. Instance Viewer

**Route:** `/instance`  
**API:** `GET /api/v1/instance/*`  
**Refresh:** 30-300 seconds per panel

### Tabs

#### Database
**API:** `GET /instance/info`  
**Data:** Instance name, version, host, platform, startup time, log mode, role, instance number, uptime

#### Clients
**API:** `GET /instance/clients`  
**Data:** Sessions grouped by machine, program, module with counts  
**Source:** `v$session` grouped by machine/program/module

#### Processes
**API:** `GET /instance/processes`  
**Data:** Process count, execute rate, parse rate, open cursors, commit/rollback rate  
**Source:** `v$process`, `v$sysstat`

#### Memory
**API:** `GET /instance/memory`  
**Components:**
- **SGA Breakdown** - Buffer Cache, Shared Pool, Large Pool, Java Pool, Streams Pool, Redo Log Buffer, Fixed SGA
- **PGA** - Aggregate target, allocated, used, cache hit %, max allocated
- **Ratios** - Buffer cache hit %, Library cache hit %
**Sources:** `v$sgastat`, `v$sgainfo`, `v$pgastat`, `v$librarycache`, `v$sysstat`

#### Storage
**API:** `GET /instance/storage`  
**Components:**
- **Tablespaces** - Name, type, status, size/used/free MB, % used, autoextend, max size
- **Redo Logs** - Group, members, size, status, switches/hour
- **Archive Log Rate** - Archives/hour, MB/hour
**Sources:** `dba_tablespaces`, `dba_data_files`, `dba_free_space`, `v$log`, `v$log_history`, `v$archived_log`

#### CPU Ratio
**API:** `GET /instance/cpu-ratio`  
**Data:** DB CPU %, Background CPU %, DB Time/sec  
**Source:** `v$sys_time_model`, `v$osstat`

#### Top SQL
**API:** `GET /instance/top-sql?limit=10`  
**Data:** SQL ID, plan hash, executions, CPU/elapsed time, buffer gets, disk reads, rows, SQL text  
**Source:** `v$sqlstats`

### Visualizations

- KPI cards for each metric
- Memory treemap (SGA/PGA breakdown)
- Tablespace radial gauges
- CPU ratio grouped bar chart
- Top SQL data table with sortable columns

---

## 3. Performance Hub (ASH Analytics)

**Route:** `/performance`  
**API:** `GET /api/v1/performance/ash/*`  
**Refresh:** 10-30 seconds

### Features

#### AAS Time Series Chart
**API:** `GET /performance/ash/aas?hours=1&dimension=wait_class`  
**Visualization:** Stacked area chart showing Average Active Sessions over time  
**Dimensions:** Wait Class, Event, SQL ID, Username, Machine, Module, Action  
**Interaction:** Click legend to filter wait classes  
**Resolution:** 10-second samples → AAS per minute

#### Wait Class Breakdown
**API:** `GET /performance/ash/wait-classes?hours=1`  
**Visualization:** Donut chart with percentage labels  
**Data:** Samples, AAS, % of total per wait class

#### Top SQL by ASH
**API:** `GET /performance/ash/top-sql?hours=1`  
**Data:** SQL ID, samples, AAS, % DB time, SQL text preview  
**Source:** `v$active_session_history` + `v$sql`

#### Drill-down Tables
**API:** `GET /performance/ash/drilldown?dimension=wait_class&filter_dimension=sql_id&hours=1`  
**Function:** Secondary dimension analysis (e.g., SQL IDs by Wait Class)  
**Output:** Dimension value, filter value, samples, AAS, % total

#### Time Range Selector
Presets: 5m, 15m, 1h, 6h, 24h, 7d, 30d  
Custom: Date/time picker for arbitrary ranges

### AWR Integration (Requires Diagnostics Pack)

| Feature | API | Description |
|---------|-----|-------------|
| Snapshots | `GET /performance/awr/snapshots` | List AWR snapshots (30 days) |
| Report | `GET /performance/awr/report` | Generate HTML/Text report for a snapshot range |

**Report generation details:**
- `report_type` accepts `html` (default) or `text`.
- Selecting a range that crosses an instance restart returns a friendly error: pick a range within a
  single startup window (backend maps `ORA-20019` to HTTP 400).
- The report is delivered as a single concatenated string (the Oracle package returns the report as
  a CLOB split across rows).

> `compare` and `sql-history` endpoints are **not** implemented; the Reports page exposes the AWR
> Report tab and an informational ASH tab. Historical top SQL from `dba_hist_sqlstat` is defined in
> the query catalog but not exposed via API.

---

## 4. SQL Monitor

**Route:** `/sql-monitor`  
**API:** `GET /api/v1/sql-monitor/*`  
**Refresh:** 5 seconds

### Active SQL List
**API:** `GET /sql-monitor/active`  
**Data:** Real-time monitored SQL from `v$sql_monitor`  
**Columns:** Status, SQL ID, Exec ID, User, Module, Duration, CPU, I/O, PX, Start Time, SQL Text  
**Status Indicators:** 
- 🟢 EXECUTING (blue)
- ✅ DONE (green)
- ❌ ERROR (red)
- ⚠️ FIRST N ROWS (orange)

### SQL Detail View
**API:** `GET /sql-monitor/detail?sql_id=xxx&sql_exec_id=123`  
**Components:**

1. **Summary Cards** - Status, Duration, CPU, I/O, PX Servers, Buffer Gets, Disk Reads, Start Time
2. **SQL Text** - Formatted, syntax-highlighted (monospace)
3. **Execution Plan** - Tree view with:
   - Operation/Options/Object
   - Cost, Cardinality, Bytes
   - Access/Filter predicates
   - Color-coded by operation type
4. **Parallelism Details** - DFO, TQ, Server Type, Rows, Bytes, Latency
5. **Statistics** - All execution metrics in key-value grid

### Execution Plan Visualization
**API:** `GET /sql-monitor/plan?sql_id=xxx&plan_hash_value=yyy`  
**Component:** `ExecutionPlan` - Hierarchical tree (MUI TreeView)  
**Features:** Expand/collapse, operation icons, cost/rows/bytes per node

### Historical SQL (Diagnostics Pack)
**API:** `GET /sql-monitor/history`  
**Source:** `dba_hist_sql_monitor`

---

## 5. Sessions

**Route:** `/sessions`  
**API:** `GET /api/v1/sessions/*`  
**Refresh:** 15 seconds

### Session List
**API:** `GET /sessions?status=&username=&machine=&min_duration=`  
**Filters:** Status, Username, Machine, Min Duration  
**Columns:** SID, Serial#, Username, Machine, Program, Module, Logon, Last Call, Status, State, Wait Class, Event, Seconds in Wait, Blocker SID, SQL ID, PGA Used

### Blocking Tree
**API:** `GET /sessions/blocking`  
**Visualization:** Force-directed graph (react-force-graph-2d)  
**Nodes:** 
- Red = Blocker (active)
- Orange = Blocked
**Edges:** Directional arrows (blocker → blocked)  
**Interaction:** Drag, zoom, pan, click for detail, right-click context menu

### Long Operations
**API:** `GET /sessions/long-ops`  
**Source:** `v$session_longops`  
**Columns:** SID, Serial#, Operation, Target, % Done, Elapsed, Remaining, Message

### Session Actions (DBA Only)
**API:** `POST /sessions/{sid}/{serial}/kill`  
**Requires:** DBA role (backend `get_current_dba` — 403 for `VIEWER`); `ENABLE_KILL_SESSION` is a
config flag that currently is **not** enforced by the kill route.  
**Frontend:** the row selection is enabled only when `user.role === 'DBA'`, and a
**"Kill Selected (n)"** button issues a kill mutation per selected `sid,serial` pair (selection ids
are `"sid,serial"` strings), then clears the selection.
**Confirmation:** Browser confirm dialog  
**Audit:** Logged with username/timestamp

### Visualizations

- Session summary KPIs (Total, Active, Blocked, Long Ops)
- Filterable, sortable data grid (MUI DataGrid)
- Blocking tree with force-directed layout
- Long operations table

---

## 6. Storage

**Route:** `/storage`  
**API:** `GET /api/v1/storage/*`  
**Refresh:** 60 seconds (tablespaces), 5 min (capacity)

### Tabs

#### Permanent/Undo Tablespaces
**API:** `GET /storage/tablespaces`  
**Data:** Name, Type, Status, Size/Used/Free MB, % Used, Autoextend, Max Size  
**Actions:** Click row → Detail panel

#### Temporary Tablespaces
**API:** Same endpoint, filtered by type  
**Data:** Same columns (no autoextend typically)

#### Capacity Planning
**API:** `GET /storage/capacity`  
**Algorithm:** Linear regression on 30-day growth (`dba_hist_tbspc_space_usage`)  
**Projections:** Days until Warning/Critical/Full  
**Requires:** Diagnostics Pack + 2+ data points

### Tablespace Detail Panel
**API:** `GET /storage/tablespaces/{name}`  
**Components:**

1. **Gauge Chart** - Usage % with thresholds
2. **Key Metrics** - Size, Used, Free MB
3. **Growth Trend Chart** - Line chart with:
   - Used space (line)
   - Allocated space (area)
   - Warning/Critical/Max threshold lines
4. **Datafiles Table** - File#, Name, Size, Max, Autoextend, Increment, Status, Online
5. **Top Segments** - Owner, Name, Type, Size, Extents (top 20)

### Visualizations

- **Tablespace Gauges Grid** - Responsive grid of radial gauges
- **Capacity Planning Table** - Growth rate, days to thresholds
- **Storage Trend Chart** - Historical growth with thresholds
- **DataFiles/segments tables** with sorting

---

## 7. Memory

**Route:** `/memory`  
**API:** `GET /api/v1/memory/*`  
**Refresh:** 5 minutes

### Current Configuration
**Displays:** SGA/PGA breakdown (from Instance Viewer)  
**Components:** Buffer Cache, Shared Pool, Large Pool, Java Pool, Streams Pool, Redo Buffer, PGA Allocated/Used

### Advisors (Requires Diagnostics Pack)

| Advisor | API | Parameters |
|---------|-----|------------|
| SGA Target | `GET /memory/sga-advice` | Size factor, DB time factor, Physical reads factor, Benefit % |
| PGA Target | `GET /memory/pga-advice` | Target factor, DB time factor, Physical reads factor, Benefit % |
| Memory Target (AMM) | `GET /memory/memory-target-advice` | Size factor, DB time factor, Physical reads factor, Benefit % |

### Key Ratios
**KPIs:** Buffer Cache Hit %, Library Cache Hit %, PGA Cache Hit %, Shared Pool Free %

The **Shared Pool Free %** KPI is computed from real data: the backend exposes
`sharedPoolFreeMB` in the SGA metrics (`GET /instance/memory`), and the Memory page derives the
percentage as `sharedPoolFreeMB / sharedPoolMB * 100`.

### Visualizations

- Memory treemap (SGA/PGA breakdown)
- Advisor data tables with benefit %
- KPI cards for key ratios

---

## 8. Wait Events

**Route:** `/waits`  
**API:** `GET /api/v1/waits/*`  
**Refresh:** 15-60 seconds

### Tabs

#### System Waits
**API:** `GET /waits/system`  
**Source:** `v$system_event` (non-idle)  
**Columns:** Event, Wait Class, Total Waits, Time Waited (sec), Avg Wait (ms), % DB Time  
**Sort:** By time waited descending

#### Session Waits
**API:** `GET /waits/session`  
**Source:** `v$session_wait` + `v$session`  
**Columns:** SID, Serial#, Username, Event, Wait Class, State, Seconds in Wait, P1/P2/P3

#### Historical Trends
**API:** `GET /waits/history?hours=24`  
**Source:** `v$sysmetric_history`  
**Metrics:** Physical Reads/Writes/sec, DB Time/sec, CPU Usage/sec  
**Visualization:** Line charts per metric

### I/O Metrics Summary
**API:** `GET /waits/io-metrics`  
**KPIs:** 
- Physical Reads/Writes per sec
- Read/Write MB/s
- Redo Generated MB/s
- DB Time/sec
- CPU Usage/sec
- Logons/sec
- Avg Read/Write Latency (ms)

### Visualizations

- Wait class pie chart
- Top 20 wait events table
- Session waits table
- Historical metrics line charts (Recharts)

---

## 9. Alerts

**Route:** `/alerts`  
**API:** `GET /api/v1/alerts/*`  
**Refresh:** 60 seconds

### Alert Log
**API:** `GET /alerts/log?hours=24&limit=100`  
**Source:** `v$diag_alert_ext`  
**Columns:** Timestamp, Severity, Message, Facility  
**Severities:** CRITICAL, ERROR, WARNING, INFO

### Threshold Configuration
**API:** `GET/PUT /alerts/thresholds`  
**Editable Thresholds:**

| Threshold | Default | Range |
|-----------|---------|-------|
| Tablespace Warning % | 80 | 50-95 |
| Tablespace Critical % | 90 | 60-99 |
| Sessions Warning % | 70 | 50-90 |
| Sessions Critical % | 85 | 60-95 |
| CPU Warning % | 80 | 50-95 |
| CPU Critical % | 90 | 60-99 |
| Wait Time Warning (ms) | 100 | 10-1000 |
| Wait Time Critical (ms) | 500 | 50-5000 |

**UI:** Editable grid with Save/Cancel, numeric inputs with min/max  
**Persistence:** saving issues a `PUT /alerts/thresholds` with `Partial<ThresholdConfig>`; the
backend persists overrides to `config/thresholds.json` (winning over env defaults) and returns the
full merged config. Success/error is surfaced via Snackbar.

### Active Threshold Alerts
**API:** `GET /alerts/check`  
**Real-time evaluation against current metrics**  
**Output:** Metric, value, threshold, severity, message, timestamp, acknowledged flag

### Visualizations

- Alert log table with severity chips
- Threshold configuration grid (editable)
- Active alerts table with severity chips
- Manual refresh + auto-refresh

---

## 10. Reports

**Route:** `/reports`  
**API:** `GET /api/v1/performance/awr/*` (AWR report), `GET /api/v1/exports/*` (CSV)

### Report Types

| Report | Description | Format | Implemented |
|--------|-------------|--------|-------------|
| AWR Report | Workload repository for snapshot range | HTML, Text | ✅ |
| ASH Report | Active Session History for time range | — | ❌ (tab is informational) |
| AWR Compare Period | Compare two snapshot periods | — | ❌ |
| SQL Report | Detailed analysis for specific SQL | — | ❌ |

### Report Generation (AWR)
1. Load real snapshots (`GET /performance/awr/snapshots`) into start/end dropdowns
2. Choose format (HTML/Text)
3. Generate via `GET /performance/awr/report?snap_id_start=&snap_id_end=&report_type=`
4. Preview in a dialog — HTML rendered in an inline `<iframe srcDoc>`, text in a `<pre>` block
5. Export: download HTML or Text via Blob

**Errors:** a snapshot range that crosses an instance restart shows a visible banner with the
backend's friendly message (pick a range within a single startup window).

### Export CSV
**API:** `GET /exports/{sessions|tablespaces|sql-monitor}/csv`  
**Downloads:** CSV file with current filtered data

> There is no "recent reports" history — each generated report is previewed and exported from the
> live dialog.

---

## 11. Settings

**Route:** `/settings`  
**API:** none (client-side, persisted to `localStorage` via `SettingsContext`)

### Profile
Read-only display of the authenticated user (username, email, role).

### Appearance
| Setting | Effect |
|---------|--------|
| Dark Mode | Instantly switches the MUI theme via `createAppTheme(settings.theme)` (persisted) |
| Compact Mode | Persisted preference (applied where supported) |
| Timezone / Language | Persisted preference |

### Monitoring
| Setting | Effect |
|---------|--------|
| Auto Refresh Enabled | Seeds every `RefreshControl`'s enabled state |
| Browser Notifications | Requests the real `Notification` permission; switch stays off if denied |
| Sound Alerts | Persisted preference |
| Refresh Interval (5-120s) | Seeds every `RefreshControl`'s interval |

### Notifications
"Send test notification" issues a real browser `Notification` and shows the permission status.

### Security / Data Retention
These sections are disabled with an informational note — password change, API keys, 2FA, session
management, and webhook/retention configuration require server-side support that is not
implemented. A "Reset to defaults" button restores the factory settings.

### About
Version, frontend/backend stack summary.

---

## 12. Connections

**Route:** `/connections`  
**API:** `GET/POST/DELETE /api/v1/databases`  
**Role:** DBA required for adding and removing databases

### Description

At startup **no database is configured**. The Connections page is the enrollment user interface: it lists
the effective catalog (`DATABASES_JSON` env var + persisted `config/databases.json`) and lets a DBA add or
remove the monitored Oracle instances.

- **Add:** the `AddDatabaseDialog` tests connectivity before saving; `POST /api/v1/databases`
  (`routes/databases.py` → `oracle_pool.create_pool`) creates the dedicated Oracle pool immediately after
  the successful connection test. The first enrolled database automatically becomes the default.
- **Remove:** `DELETE /api/v1/databases/{name}` closes the pool (`drop_pool`) and removes the connection.
  Deleting the last database returns the app to the initial "no database" onboarding state.
- **Seeded databases** (from `DATABASES_JSON`) are **immutable**: DELETE returns HTTP 400.
- **Gate:** monitoring pages are wrapped in a `DatabaseGate` component that redirects to `/connections`
  whenever no database exists; the "Connections" link is added to the sidebar, and the header keeps the
  database selector plus the "Add database..." button.

---

## Cross-Cutting Features

### Real-time Updates (WebSocket)
**Channels:** `overview`, `sql_monitor`, `sessions`, `performance`  
**Protocol:** WebSocket with auto-reconnect, heartbeat  
**Throttling:** Performance channel 5s min interval

### Auto-refresh Control
**Global:** Per-page refresh interval selector (`RefreshControl`)  
**Options:** 5s, 15s, 30s, 60s, Off  
**Persisted:** in `SettingsContext` → `localStorage` (`oracle-monitor-settings`); the initial
interval and enabled state of every `RefreshControl` come from these settings, and the Settings
page lets the user configure them.

### Header Notifications
The header bell badge is driven by **real threshold data**: it polls `useCheckThresholds()`
(`GET /alerts/check`, 60 s) and shows the number of triggered alerts in a red badge. The dropdown
lists each alert's message/severity/threshold (empty state: "No active threshold alerts").

### Time Range Selection
**Global:** Consistent across all time-series pages  
**Presets:** 5m, 15m, 1h, 6h, 24h, 7d, 30d  
**Custom:** Date/time range picker

### Multi-database Support
**Selector:** Live database selector in header fed by `GET /api/v1/databases`  
**Connection:** Per-database connection pooling (one `oracledb` pool per configured base; pool created on
enrollment and lazily on first request, dropped on delete)  
**Routing:** Active database switched per-request via `X-Database` header (contextvar)  
**Status:** Real Online/Offline indicators with latency (live `SELECT` probe per base)  
**Management:** "Add database..." dialog (header) or the Connections page (DBA role); the dialog tests
connectivity before persisting (CRUD via POST/DELETE)  
**Config:** `DATABASES_JSON` env var (JSON list, immutable — not removable from the UI) and/or persisted
`config/databases.json` (shared across services via the `app_config` volume); no PRIMARY from `ORACLE_*` anymore

Example `DATABASES_JSON`:
```json
[
  {"name": "FREE2", "host": "oradb-free", "port": 1521, "serviceName": "freepdb1",
   "username": "monitor", "password": "secret", "isDefault": false}
]
```

### Export Capabilities
| Page | Export |
|------|--------|
| Sessions | CSV |
| Tablespaces | CSV |
| SQL Monitor | CSV |
| Reports | HTML, Text (AWR) |

### Role-Based Access
| Feature | DBA | Viewer |
|---------|-----|--------|
| View all pages | ✅ | ✅ |
| Kill session (incl. Kill Selected) | ✅ | ❌ |
| Modify thresholds | ✅ | ❌ |
| Generate AWR | ✅ | ✅ |
| Add/remove databases | ✅ | ❌ |

> Note: the threshold edit grid is currently rendered for all roles; the backend `POST/DELETE
> /databases` and kill endpoints enforce the DBA role server-side.

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+R` | Refresh current page |
| `Ctrl+K` | Command palette (future) |
| `Escape` | Close dialogs |

### Accessibility
- Semantic HTML
- ARIA labels on interactive elements
- Color contrast (WCAG AA)
- Keyboard navigation
- Focus management
- Screen reader compatible