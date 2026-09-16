> **Language:** English · [Version française](fr/TECHNICAL_REFERENCE.md)

# Code Technical Reference

Technical reference documentation for the Oracle Monitor Dashboard codebase
(FastAPI + React 18 + TypeScript + Oracle 23c).

> **Code-level complement.** For business concepts, data flows, and high-level architecture, see
> `ARCHITECTURE.md`, `BACKEND_API.md`, `ORACLE_QUERIES.md`, `FRONTEND_COMPONENTS.md`.

---

## 1. Code tree

```
oracle-monitor-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app factory, middleware, routes, /health /metrics
│   │   ├── config.py                  # Pydantic Settings (env + .env) — THRESHOLDS_FILE
│   │   ├── api/
│   │   │   ├── deps.py                # get_oracle_pool / get_redis / get_current_user / get_current_dba
│   │   │   ├── routes/                # 12 REST modules + websocket.py
│   │   │   └── websocket.py           # WS /ws/{channel} + ConnectionManager
│   │   ├── core/
│   │   │   ├── oracle_queries.py      # 40 SQL constants + get_drilldown_query()
│   │   │   ├── models.py              # Pydantic models (CamelModel, ~60 models)
│   │   │   ├── security.py            # JWT HS256, bcrypt, OAuth2
│   │   │   └── database.py            # OraclePool multi-DB (X-Database / contextvar)
│   │   ├── services/                  # Business logic (9 services)
│   │   ├── tasks/                     # Celery (collect_metrics, check_thresholds, generate_awr…)
│   │   └── utils/
│   └── tests/
└── frontend/
    └── src/
        ├── main.tsx                   # Providers: QueryClient > Settings > Theme > Auth > Connection
        ├── App.tsx                    # Routing (ProtectedRoute / PublicRoute)
        ├── api/
        │   ├── client.ts              # Axios (baseURL, auth interceptor + single-flight refresh)
        │   ├── queryClient.ts         # TanStack config (staleTime 30s, gcTime 5m, retry 1)
        │   ├── dbSelection.ts         # Active DB selection (localStorage selectedDatabase)
        │   ├── websocket.ts           # useWebSocket (backoff, not consumed yet)
        │   └── hooks/                 # useOverview, useInstance, usePerformance… (9 modules)
        ├── context/                   # AuthContext, ConnectionContext, SettingsContext
        ├── hooks/                     # useAutoRefresh, useDebounce, useLocalStorage…
        ├── components/                # common/ charts/ layout/
        ├── theme/theme.ts             # sqlDeveloperPalette, theme, darkTheme, createAppTheme
        ├── types/api.ts               # TS interfaces aligned with Pydantic models
        └── utils/                     # helpers, formatters, validators, date
```

---

## 2. Backend

### 2.1 Config (`app/config.py`)

- Pydantic `Settings`, reads `.env` (utf-8), `case_sensitive=True`, `extra="ignore"`.
- Key elements:
  - `API_PREFIX = "/api/v1"`
  - `SECRET_KEY` (min 32 chars), `ALGORITHM="HS256"`, access 30 min, refresh 7 days
  - `HAS_DIAGNOSTICS_PACK`, `ENABLE_KILL_SESSION`, `ENABLE_AWR_REPORTS`
  - 8 `THRESHOLD_*` variables (warn/crit for tablespace, sessions, cpu, wait-time)
  - **`THRESHOLDS_FILE = "config/thresholds.json"`** — runtime override file
  - `DATABASES_JSON` — JSON list of secondary databases

### 2.2 Authentication (`app/core/security.py` + `app/api/deps.py`)

- OAuth2 Bearer JWT HS256. `pwd_context` bcrypt (12 rounds).
- `create_access_token` / `create_refresh_token` → claim `type: "access"|"refresh"`, `sub=username`.
- `get_current_user`: decodes the token, requires `type=="access"`, returns `TokenData(username, role)`.
- `get_current_dba`: chains on `get_current_user`, raises 403 if `role != DBA`.
- **Protected endpoints (only 4):**
  - `GET /api/v1/auth/me` (`get_current_user`)
  - `POST /api/v1/sessions/{sid}/{serial}/kill` (`get_current_dba`)
  - `POST /api/v1/databases` (`get_current_dba`)
  - `DELETE /api/v1/databases/{name}` (`get_current_dba`)

### 2.3 Multi-DB Oracle connector (`app/core/database.py`)

- **One `oracledb` pool per base** (`OraclePool`); active base resolved via:
  1. `X-Database` header captured in a `contextvar` (middleware `active_database_middleware` in `main.py`),
  2. otherwise the PRIMARY base (`ORACLE_*`).
- `resolve_active_name()`: explicit requested name → routed pool name.
- `execute_query(sql, params)` / `execute_scalar(...)`: async methods used by all services.

### 2.4 SQL queries (`app/core/oracle_queries.py`)

- **40 constants** + `get_drilldown_query(dimension, filter_dimension)` (validates against an
  allow-list and formats the `ASH_DRILLDOWN` template).
- Conventions: snake_case aliases, `:param` (bind), `FETCH FIRST n ROWS ONLY`, V$ filter `type='USER'`.
- `MEMORY_METRICS` produces `shared_pool_free_mb` (pool `shared pool`, name `free memory`, bytes → MB).
- `AWR_SNAPSHOTS` / `AWR_TOP_SQL` are defined but **not referenced** (the AWR service uses its own
  SQL). Do not remove without checking usages.

### 2.5 Services & routes

Each route delegates to a service (empty-service pattern → `HTTPException`).

| Service | File | Primary responsibilities |
|---------|------|--------------------------|
| `InstanceService` | `services/instance_service.py` | info/clients/processes/memory/storage/cpu/top-sql (`/instance/*`) |
| `ASHService` | `services/ash_service.py` | AAS, top SQL, drilldown, wait-class breakdown (`/performance/ash/*`) |
| `AWRService` | `services/awr_service.py` | AWR snapshots + report (`/performance/awr/*`) |
| `SQLMonitorService` | `services/sql_monitor_service.py` | active/detail/plan (+ plan `depth` calculation) |
| `SessionService` | `services/session_service.py` | sessions (filters), blocking chains, long ops, kill |
| `StorageService` | `services/storage_service.py` | tablespaces, detail (datafiles/segments/growth), capacity projection |
| `MemoryService` | `services/memory_service.py` | SGA/PGA/Memory Target advice |
| `WaitService` | `services/wait_service.py` | system/session waits, IO, history, live |
| `AlertService` | `services/alert_service.py` | alert log, thresholds (env + file), check |

#### 2.5.1 AWR (`services/awr_service.py`) — key notes

- `SNAPSHOTS_QUERY` queries `dba_hist_snapshot` filtered by `:dbid` (resolved via
  `SELECT dbid FROM v$database`), descending. Columns: `snapId, dbid, instanceNumber,
  beginTime, endTime, durationMin, startupTime`.
- **`durationMin`**: `ROUND((CAST(end_interval_time AS DATE) - CAST(begin_interval_time AS DATE)) * 24 * 60, 1)`.
  Do not replace with `end_interval_time - begin_interval_time`: both columns are
  `TIMESTAMP` → difference is `INTERVAL`, and `ROUND()` raises `ORA-00932`.
- `REPORT_QUERY`: `SELECT output FROM TABLE(dbms_workload_repository.{func_name}(:dbid, :instance_number, :snap_start, :snap_end, :options))`.
  - `func_name` = `awr_report_html` or `awr_report_text`, injected at query formatting.
  - The package returns the report as a CLOB split across multiple rows → concatenate the
    `output` column from each row.
- `generate_report(snap_id_start, snap_id_end, dbid=None, instance_number=1, report_type="html")`:
  validates `snap_id_end > snap_id_start` (`ValueError`), resolves `dbid` if absent, executes, joins
  fragments, returns `{html, dbid, instanceNumber, snapIdStart, snapIdEnd, generatedAt, reportType}`.
- **ORA-20019 (instance restart within range)**: handled in the **route**
  (`routes/performance.py`, ~L75-92) — if the message contains `"20019"` or
  `"re-started during specified snapshot interval"` → HTTP 400 with
  *"The selected snapshot range {start}-{end} crosses an instance restart. Pick a range within a single startup window."*
  Otherwise HTTP 500 `"AWR report generation failed: {e}"`.

#### 2.5.2 Thresholds (`services/alert_service.py`)

- `get_threshold_config()`: reads the 8 `THRESHOLD_*` from settings → camelCase dict
  (`tablespaceWarn`, `tablespaceCrit`, `sessionsWarn`, `sessionsCrit`, `cpuWarn`, `cpuCrit`,
  `waitTimeMsWarn`, `waitTimeMsCrit`).
- `load_persisted_thresholds()`: reads `config/thresholds.json`; `{}` on error; only keeps
  integer-valued keys.
- `effective_thresholds()`: **merged** (env defaults, then file overrides — file wins).
- `update_thresholds(thresholds)`: keeps valid numeric non-boolean keys (cast int),
  `mkdir(parents=True, exist_ok=True)` + `write_text`, logs `"THRESHOLDS_FILE: saved"`,
  returns the merged dict.
- `check_thresholds()`: evaluates tablespaces (`StorageService`), sessions (count vs
  `v$parameter.sessions`) and CPU (`InstanceService.get_cpu_ratio`); produces dicts
  `{metric, value, threshold, severity, message}`.

### 2.6 WebSocket (`app/api/websocket.py`)

- Mounted **without** a prefix: `ws://<host>:8000/ws/{channel}`.
- Valid channels: `overview`, `sql_monitor`, `sessions`, `performance` — otherwise close code `4004`.
- Ping/pong stub: server replies `{"type":"pong","data":...}` to every client message.
- `push_*_update` helpers broadcast `{"type":"<channel>_update","payload":...}`. No callers in the
  codebase currently (intended for the Celery path).

---

## 3. Frontend

### 3.1 Bootstrap (`main.tsx`)

Provider order (outermost to innermost):
`QueryClientProvider` → `SettingsProvider` → `ThemedApp` (which recreates `createAppTheme(settings.theme)`
and contains `ThemeProvider` + `CssBaseline` + `BrowserRouter` + `AuthProvider` + `ConnectionProvider` + `App` + `Toaster` + devtools).

### 3.2 API client (`src/api/client.ts`)

- `baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'`; timeout 30 s.
- **Request interceptor**: attaches `Authorization: Bearer <accessToken>` (tokens in localStorage
  `oracle_monitor_tokens`, via `utils/helpers.ts`) and `X-Database: <activeDatabase>`
  (`api/dbSelection.ts`, localStorage `selectedDatabase`).
- **Response interceptor**: on 401 → **single-flight** refresh (`POST /auth/refresh` with
  `refresh_token` as query), pending queue `failedQueue` for concurrent 401s; replays the
  original request; on failure → purge tokens + redirect to `/login`.

### 3.3 TanStack Query (`src/api/queryClient.ts`)

- `staleTime: 30s`, `gcTime: 5m`, `retry: 1`, no refetch on focus, refetch on reconnect,
  mutations `retry: 0`.

### 3.4 API hooks (`src/api/hooks/*.ts`)

| Hook | Method + endpoint | Polling |
|------|-------------------|---------|
| `useOverview` | `GET /overview` | 30s |
| `useAWRSnapshots` | `GET /performance/awr/snapshots` | staleTime 5min |
| `useGenerateAWRReport` | **mutation** `GET /performance/awr/report?snap_id_start=&snap_id_end=&report_type=` | — |
| `useUpdateThresholds` | **mutation** `PUT /alerts/thresholds` (invalidates `['alerts','thresholds']`) | — |
| `useCheckThresholds` | `GET /alerts/check` | 60s |
| `useKillSession` | **mutation** `POST /sessions/{sid}/{serial}/kill` (invalidates sessions + blocking) | — |
| `useLiveWaits(1500)` | `GET /waits/live` | 1.5s (background) |

All other hooks follow `GET /<module>/<resource>` with a given `refetchInterval`.

### 3.5 Contexts

- **`AuthContext`**: `{user, login, logout, isLoading, isAuthenticated}`. Login posts
  `application/x-www-form-urlencoded` (`URLSearchParams`) → stores tokens → `GET /auth/me`.
  `user.role` = `'DBA' | 'VIEWER'`.
- **`ConnectionContext`**: `{connection, setConnection, isConnected}`; persisted in localStorage
  `oracle_monitor_connection`.
- **`SettingsContext`**: `{settings, updateSettings, resetSettings}`; `AppSettings`
  (`theme, autoRefresh, refreshInterval, notifications, soundAlerts, compactMode, timezone, language`);
  localStorage `oracle-monitor-settings`; deep-merged with defaults at load time; written on
  every change. `useSettings()` must be under `SettingsProvider`.

### 3.6 UI auto-refresh (`src/hooks/useAutoRefresh.ts`)

- Options: `{ defaultInterval=30, enabled=true, onRefresh }`.
- **Stable ref pattern**: `onRefreshRef.current = onRefresh` on every render — the timer is
  not reset when the inline callback changes.
- `useEffect`: if `enabled && interval>0`, `setInterval` → `triggerRefresh()` every
  `interval*1000` ms; `triggerRefresh()` increments a counter, stamps `lastRefresh`, and calls
  the ref.
- `RefreshControl` consumes it with `useSettings()` for the initial state
  (`effectiveInterval = defaultInterval ?? settings.refreshInterval`, `enabled: settings.autoRefresh`).

### 3.7 Pages & route wiring (`src/App.tsx`)

Routes protected by `ProtectedRoute`; `/login` under `PublicRoute`; `*` → `/`:

| Route | Page | Key hooks |
|-------|------|-----------|
| `/` | Dashboard | `useOverview`, `useASHAAS`, `useASHWaitClasses`, `useCPURatio`, `useTopSQL`, `useTablespaces` + refresh-all `queryClient.refetchQueries({type:'active'})` |
| `/instance` | InstanceViewer | `useAllInstanceData` |
| `/performance` | PerformanceHub | `useASHAAS`, `useASHWaitClasses`, `useASHDDrilldown`, `useASHTopSQL` |
| `/sql-monitor` | SQLMonitor | `useActiveSQL`, `useSQLMonitorDetail`, `useExecutionPlan(sqlId, planHashValue)` |
| `/sessions` | Sessions | `useSessions`, `useBlockingChains`, `useLongOperations`, `useKillSession`; `canKill = role==='DBA'` |
| `/storage` | Storage | `useTablespaces`, `useTablespaceDetail`, `useCapacityPlanning` |
| `/memory` | Memory | `useSGAAdvice`, `usePGAAdvice`, `useMemoryTargetAdvice`, `useMemory`; `sharedPoolFreePct` |
| `/waits` | WaitEvents | `useSystemWaits`, `useSessionWaits`, `useIOMetrics`, `useMetricsHistory` |
| `/live` | LiveMonitor | `useLiveWaits(1500)` (buffer 200 samples) |
| `/alerts` | Alerts | `useAlertLog`, `useThresholds`, `useCheckThresholds`, `useUpdateThresholds` |
| `/reports` | Reports | `useAWRSnapshots`, `useGenerateAWRReport` (preview iframe `<pre>`, Blob export) |
| `/settings` | Settings | `useAuth` (profile), `useSettings` |

### 3.8 Key components

- **`GaugeChart`**: MUI/Recharts half-donut, colors `#00A651`/`#FF8C00`/`#D13438` based on
  `thresholds`. Added props: `onClick`, `sx` (pointer cursor + click → tablespace detail).
- **`DataTable`**: `@mui/x-data-grid` wrapper with pagination, loading, error, rowClick, and
  **checkbox selection** (`onSelectionChange` receives ids — for Sessions, ids are `"sid,serial"`).
- **`RefreshControl`**: `{defaultInterval?, onManualRefresh?}`, wired to Settings.
- **`AddDatabaseDialog`**: after a successful `mutateAsync` → `setTested(true)` (banner
  "Connection tested successfully.") then deferred close ~1.2 s.
- **Header**: notification badge driven by `useCheckThresholds()` (`activeAlerts.length`),
  dropdown listing `alert.message/severity/threshold`; Profile/Settings items point to
  `/settings`.

---

## 4. Types & serialization contract

### 4.1 Backend — `CamelModel`

`app/core/models.py`: `CamelModel` generates the camelCase alias for **all** responses
(DB snake_case → JSON camelCase). Example:
`shared_pool_free_mb` ↔ `sharedPoolFreeMB` (via `serialization_alias`).

### 4.2 Frontend — `src/types/api.ts`

Major interfaces aligned with the Pydantic models. Notable cases:

```ts
interface SGAMetrics { totalMB; bufferCacheMB; sharedPoolMB; sharedPoolFreeMB?: number; /* … */ }
interface AWRSnapshot { snapId; dbid; instanceNumber; beginTime; endTime; durationMin; startupTime }
interface AWRReport  { html; dbid; instanceNumber; snapIdStart; snapIdEnd; generatedAt; reportType }
interface ThresholdConfig { tablespaceWarn; /* … */ waitTimeMsCrit }  // 8 number fields
interface TriggeredAlert { id; metric; value; threshold; severity: 'WARNING'|'CRITICAL'; message; timestamp; acknowledged }
```

⚠️ `useDatabases.ts` defines its **own** `DatabaseInfo` interface (connection metadata),
distinct from the `DatabaseInfo` in `types/api.ts` (instance info) — keep them separate.

---

## 5. Pitfalls & conventions to follow

1. **AWR duration** — always `CAST(... AS DATE)` before arithmetic; never compute duration from
   raw `TIMESTAMP` columns (ORA-00932).
2. **AWR report** — the CLOB arrives in multiple rows (column `output`); concatenate.
3. **AWR restart** — a range crossing a restart raises ORA-20019 → mapped to 400 by the route,
   not by the service.
4. **Thresholds** — never hardcode the sessions limit (`1000`): `check_thresholds` reads
   `v$parameter.sessions`. Always go through `effective_thresholds()` to read a value.
5. **Multi-DB routing** — pass the active base via the `X-Database` header (contextvar);
   `VITE_API_URL` points to `/api/v1` (the Vite dev proxy forwards `/api` and `/ws`).
6. **Refresh Control** — wire to `onManualRefresh` so the header refresh triggers your queries;
   prefer `refetchQueries({type:'active'})` or `invalidateQueries`.
7. **Mutations** — `retry: 0`; invalidate related queryKeys in `onSuccess`.
8. **Role** — kill and add/remove databases require `DBA` on the server; on the UI
   `canKill = user?.role === 'DBA'`.
9. **localStorage** — reserved keys: `oracle_monitor_tokens`, `oracle_monitor_connection`,
   `selectedDatabase`, `oracle-monitor-settings`.
10. **Types** — every new backend response must be added to `types/api.ts` (camelCase alias).

---

## 6. Adding a feature — checklist

1. **SQL**: constant in `oracle_queries.py` (`:` bind, snake_case alias).
2. **Model**: Pydantic model (inherit `CamelModel` if exposed via API).
3. **Service**: static method in the domain service (use `oracle_pool.execute_query`).
4. **Route**: REST endpoint in `routes/<domain>.py` (prefix `/api/v1`, validate params,
   map known errors → 400/404/500; `get_current_dba` for sensitive actions).
5. **Hook**: `use<Feature>` in `src/api/hooks/` (query with `refetchInterval` OR mutation with
   invalidation).
6. **TS type**: interface in `types/api.ts`, refetch/invalidation aligned.
7. **UI**: page/component + route in `App.tsx` + Sidebar entry.
8. **Doc**: update `BACKEND_API.md`, `FEATURES.md`, and optionally `ORACLE_QUERIES.md`.