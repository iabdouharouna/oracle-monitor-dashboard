> **Language:** English · [Version française](fr/ARCHITECTURE.md)

# System Architecture

> **Décisions d'architecture.** Chaque choix structurant est tracé dans les
> [Architecture Decision Records (ADR)](adr/README.md) — voir ADR-0001 à ADR-0012.

## Overview

The Oracle Monitor Dashboard is a full-stack application built with a **FastAPI backend** and **React + TypeScript frontend**, designed to replicate SQL Developer's monitoring capabilities for Oracle Database.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORACLE MONITOR DASHBOARD                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   FRONTEND   │◄───│    BACKEND   │◄───│   ORACLE DB  │                  │
│  │  (React)     │    │  (FastAPI)   │    │  (23c Free)  │                  │
│  │  Port: 3000  │    │  Port: 8000  │    │  Port: 1521  │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│         │                   │                   │                           │
│         │                   ▼                   │                           │
│         │          ┌──────────────┐             │                           │
│         │          │    REDIS     │             │                           │
│         │          │  Port: 6379  │             │                           │
│         │          └──────────────┘             │                           │
│         │                   │                   │                           │
│         │          ┌──────────────┐             │                           │
│         └──────────│  PROMETHEUS  │             │                           │
│                    │  Port: 9090  │             │                           │
│                    └──────────────┘             │                           │
│                          │                      │                           │
│                    ┌──────────────┐             │                           │
│                    │   GRAFANA    │             │                           │
│                    │  Port: 3001  │             │                           │
│                    └──────────────┘             │                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Web Framework | FastAPI | 0.104+ | Async REST API, OpenAPI docs |
| Database Driver | python-oracledb | 2.5+ | Oracle connectivity (thin mode) |
| Caching | Redis | 7+ | Query cache, session store, Celery broker |
| Task Queue | Celery | 5.3+ | Background jobs (metrics, alerts) |
| Validation | Pydantic | 2.5+ | Data validation, settings |
| Auth | python-jose + passlib | 3.3+/1.7+ | JWT, bcrypt |
| Logging | structlog | 24.1+ | Structured JSON logging |
| Metrics | prometheus-client | 0.19+ | Prometheus exposition |

### Frontend
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | React | 18.2+ | UI library |
| Language | TypeScript | 5.4+ | Type safety |
| Build Tool | Vite | 5.2+ | Fast dev/build |
| UI Library | MUI (Material UI) | 5.15+ | Enterprise components |
| Data Grid | MUI X DataGrid | 7.2+ | Advanced tables |
| State Management | TanStack Query | 5.28+ | Server state, caching |
| Charts | Recharts | 2.12+ | Composable charts |
| Graph | React Force Graph | 1.25+ | Blocking tree visualization |
| HTTP Client | Axios | 1.6+ | API communication |
| Date | date-fns | 3.6+ | Date formatting |
| Notifications | react-hot-toast | 2.4+ | Toast messages |

### Infrastructure
| Component | Technology | Purpose |
|-----------|------------|---------|
| Containerization | Docker Compose | Multi-container orchestration |
| Oracle DB | gvenzl/oracle-free:23-slim | Free Oracle 23c |
| Reverse Proxy | Nginx | Static serving, API proxy |
| Monitoring | Prometheus + Grafana | Metrics collection & visualization |
| CI/CD | GitHub Actions (planned) | Automated testing & deployment |

## Backend Architecture

```
backend/
├── app/
│   ├── api/
│   │   ├── routes/          # 12 REST modules + WebSocket
│   │   │   ├── auth.py      # Authentication endpoints
│   │   │   ├── overview.py  # Dashboard aggregation
│   │   │   ├── instance.py  # Instance Viewer (7 panels)
│   │   │   ├── performance.py # ASH + AWR (snapshots/report)
│   │   │   ├── sql_monitor.py # V$SQL_MONITOR
│   │   │   ├── sessions.py  # Sessions & blocking + kill
│   │   │   ├── storage.py   # Tablespaces, capacity
│   │   │   ├── memory.py    # SGA/PGA advisors
│   │   │   ├── waits.py     # Wait events, I/O
│   │   │   ├── alerts.py    # Alert log, thresholds
│   │   │   ├── databases.py # Multi-DB connections (CRUD)
│   │   │   └── exports.py   # CSV exports
│   │   └── websocket.py     # Real-time push
│   ├── core/
│   │   ├── oracle_queries.py    # All Oracle SQL queries (40)
│   │   ├── models.py            # Pydantic models
│   │   ├── security.py          # JWT, bcrypt, OAuth2
│   │   ├── exceptions.py        # Custom exceptions
│   │   └── constants.py         # Wait classes, thresholds
│   ├── services/                # Business logic layer
│   │   ├── instance_service.py
│   │   ├── ash_service.py
│   │   ├── awr_service.py       # AWR snapshots + report generation
│   │   ├── sql_monitor_service.py
│   │   ├── session_service.py
│   │   ├── storage_service.py
│   │   ├── memory_service.py
│   │   ├── wait_service.py
│   │   └── alert_service.py     # Thresholds (env + config/thresholds.json)
│   ├── tasks/                   # Celery background tasks
│   │   ├── collect_metrics.py
│   │   ├── check_thresholds.py
│   │   ├── generate_awr.py
│   │   └── cleanup.py
│   ├── utils/                   # Helpers
│   └── main.py                  # FastAPI app factory
```

### Request Flow

```
Client Request
      │
      ▼
┌─────────────────┐
│   Nginx (80)    │  ── Static files / proxy to backend
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   FastAPI       │  ── CORS, Auth middleware
│   (Port 8000)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Dependency    │  ── Oracle pool, Redis, Auth
│   Injection     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Route     │  ── Validation, error handling
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Service       │  ── Business logic, query composition
│   Layer         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Oracle Query  │  ── Parameterized SQL from oracle_queries.py
│   Execution     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Oracle DB     │  ── Connection pool (async)
└─────────────────┘
```

## Frontend Architecture

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts           # Axios instance + interceptors
│   │   ├── queryClient.ts      # TanStack Query config
│   │   ├── hooks/              # Feature-specific hooks
│   │   │   ├── useOverview.ts
│   │   │   ├── useInstance.ts
│   │   │   ├── usePerformance.ts
│   │   │   ├── useSqlMonitor.ts
│   │   │   ├── useSessions.ts
│   │   │   ├── useStorage.ts
│   │   │   ├── useMemory.ts
│   │   │   ├── useWaits.ts
│   │   │   └── useAlerts.ts
│   │   └── websocket.ts        # WebSocket hook
│   ├── components/
│   │   ├── common/             # Reusable UI components
│   │   │   ├── KPICard.tsx
│   │   │   ├── GaugeChart.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── RefreshControl.tsx
│   │   │   ├── TimeRangeSelector.tsx
│   │   │   └── DatabaseSelector.tsx
│   │   ├── charts/             # Chart components (Recharts)
│   │   │   ├── AASChart.tsx
│   │   │   ├── WaitClassChart.tsx
│   │   │   ├── TopSQLChart.tsx
│   │   │   ├── MemoryBreakdown.tsx
│   │   │   ├── TablespaceGauges.tsx
│   │   │   ├── BlockingTree.tsx
│   │   │   ├── ExecutionPlan.tsx
│   │   │   ├── CPURatioChart.tsx
│   │   │   └── StorageTrendChart.tsx
│   │   └── layout/             # Page layout
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       └── PageLayout.tsx
│   ├── pages/                  # Page components
│   │   ├── Dashboard.tsx
│   │   ├── InstanceViewer.tsx
│   │   ├── PerformanceHub.tsx
│   │   ├── SQLMonitor.tsx
│   │   ├── Sessions.tsx
│   │   ├── Storage.tsx
│   │   ├── Memory.tsx
│   │   ├── WaitEvents.tsx
│   │   ├── Alerts.tsx
│   │   ├── Settings.tsx
│   │   └── Reports.tsx
│   ├── context/
│   │   ├── AuthContext.tsx        # Authentication state
│   │   ├── ConnectionContext.tsx  # Active DB connection (X-Database header)
│   │   └── SettingsContext.tsx    # User preferences → localStorage
│   ├── theme/
│   │   └── theme.ts               # SQL Developer MUI theme + dark theme
│   ├── types/
│   │   └── api.ts                 # TypeScript interfaces
│   └── App.tsx                 # Routing + providers
```

### State Management

```
┌─────────────────────────────────────────────────────────────┐
│                    TANSTACK QUERY CACHE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Query Keys:                                                 │
│  ├── ['overview']                    ── 30s refresh         │
│  ├── ['instance', 'all']             ── 30s refresh         │
│  ├── ['instance', 'info']            ── 5min refresh        │
│  ├── ['instance', 'clients']         ── 60s refresh         │
│  ├── ['instance', 'memory']          ── 60s refresh         │
│  ├── ['instance', 'storage']         ── 60s refresh         │
│  ├── ['performance', 'ash', 'aas']   ── 10s refresh         │
│  ├── ['sql-monitor', 'active']       ── 5s refresh          │
│  ├── ['sessions', {...filters}]      ── 15s refresh         │
│  ├── ['storage', 'tablespaces']      ── 60s refresh         │
│  ├── ['waits', 'system']             ── 30s refresh         │
│  ├── ['waits', 'io-metrics']         ── 30s refresh         │
│  └── ['alerts', 'check']             ── 60s refresh         │
│                                                              │
│  Features:                                                   │
│  ✅ Automatic refetch on window focus (disabled)            │
│  ✅ Background refetch on reconnect                          │
│  ✅ Stale time: 30s, Cache time: 5min                        │
│  ✅ Retry: 1x on failure                                     │
│  ✅ Optimistic updates for mutations                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Patterns

### 1. Real-time Monitoring (WebSocket)

```
Backend                          Frontend
   │                                 │
   ├─► /ws/overview ───────────────► │  Auto-refresh UI
   ├─► /ws/sql-monitor ───────────► │  Live SQL updates
   ├─► /ws/sessions ──────────────► │  Session changes
   └─► /ws/performance ───────────► │  AAS chart updates
```

### 2. Background Metrics Collection (Celery)

```
Celery Beat (Scheduler)
   │
   ├─► Every 30s: collect_metrics.collect_all_metrics()
   │    └─► Query Oracle V$ views
   │    └─► Store in Redis (TTL-based)
   │    └─► Push via WebSocket
   │
   ├─► Every 60s: check_thresholds.check_all_thresholds()
   │    └─► Evaluate thresholds
   │    └─► Create alert_history records
   │    └─► Push alert notifications
   │
   ├─► Daily 02:00: generate_awr.create_awr_snapshot()
   │    └─► Execute DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT
   │
   └─► Daily 03:00: cleanup.cleanup_old_data()
        └─► Purge old metrics, alert history
```

### 3. Query Caching Strategy

```
Redis Cache Layers:
┌─────────────────────────────────────────────────────────────┐
│  Key Pattern: {prefix}:{function}:{hash(args)}              │
├─────────────────────────────────────────────────────────────┤
│  TTLs:                                                       │
│  ├── instance:info          ── 300s (5 min)                 │
│  ├── instance:clients       ── 60s                          │
│  ├── instance:memory        ── 60s                          │
│  ├── instance:storage       ── 60s                          │
│  ├── ash:aas                ── 10s                          │
│  ├── sql:monitor:active     ── 5s                           │
│  ├── sessions:list          ── 15s                          │
│  ├── storage:tablespaces    ── 60s                          │
│  ├── waits:system           ── 30s                          │
│  └── waits:history          ── 60s                          │
│                                                              │
│  Invalidation:                                               │
│  ├── Manual: API calls to /alerts/check                     │
│  ├── Time-based: TTL expiration                              │
│  └── Pattern: redis.delete_pattern("instance:*")            │
└─────────────────────────────────────────────────────────────┘
```

## Security Architecture

### Authentication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │     │   Backend    │     │   Database   │
│  (Browser)   │     │  (FastAPI)   │     │  (PostgreSQL)│
└──────┬───────┘     └──────┬───────┘     └──────────────┘
       │                    │
       │  POST /auth/login  │
       │  {username, pwd}   │
       ├───────────────────►│
       │                    │
       │  Verify bcrypt     │
       │  Create JWT pair   │
       │  (access + refresh)│
       │◄───────────────────┤
       │                    │
       │  GET /api/...      │
       │  Authorization:    │
       │  Bearer <access>   │
       ├───────────────────►│
       │                    │
       │  Validate JWT      │
       │  Check role/perm   │
       │◄───────────────────┤
       │                    │
       │  401 if expired    │
       │  POST /auth/refresh│
       │  Bearer <refresh>  │
       ├───────────────────►│
       │                    │
       │  Validate refresh  │
       │  Issue new pair    │
       │◄───────────────────┤
```

### Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **DBA** | Full access: kill sessions, modify thresholds, view all data, generate reports |
| **VIEWER** | Read-only: dashboards, queries, exports (no destructive actions) |

### Security Headers & Middleware

```python
# CORS Configuration
CORS_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]
CORS_ALLOW_CREDENTIALS = True

# JWT Configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
BCRYPT_ROUNDS = 12

# Rate Limiting (planned)
# - Login: 5 attempts/minute
# - API: 100 requests/minute per user
# - WebSocket: 1 connection per user
```

## Scalability Considerations

### Horizontal Scaling

| Component | Scaling Strategy |
|-----------|------------------|
| **Backend** | Stateless - run multiple replicas behind load balancer |
| **Frontend** | Static files - CDN distribution |
| **Redis** | Cluster mode for HA; Sentinel for failover |
| **Celery Workers** | Add worker replicas; partition queues |
| **Oracle** | Read replicas for reporting queries; RAC for HA |

### Performance Optimizations

| Area | Optimization |
|------|--------------|
| **Oracle Queries** | Parameterized, indexed columns, minimal columns |
| **Connection Pool** | Async pool (min=2, max=20), connection reuse |
| **Caching** | Redis TTL-based, per-endpoint granularity |
| **Pagination** | Server-side, configurable page size (max 500) |
| **WebSocket** | Throttled updates (5s min), per-channel subscription |
| **Frontend** | Code splitting, lazy loading, memoization |

## Monitoring & Observability

### Application Metrics (Prometheus)

```
# HTTP Metrics
http_requests_total{method, endpoint, status}
http_request_duration_seconds{method, endpoint}
http_requests_in_progress

# Business Metrics
oracle_monitor_active_sessions
oracle_monitor_tablespace_usage_percent{tablespace}
oracle_monitor_cpu_usage_percent
oracle_monitor_alert_total{severity}

# System Metrics
process_cpu_seconds_total
process_resident_memory_bytes
process_open_fds
```

### Health Checks

| Endpoint | Checks |
|----------|--------|
| `GET /health` | Oracle connectivity, Redis connectivity |
| `GET /metrics` | Prometheus metrics exposition |
| Docker HEALTHCHECK | Container-level liveness |

### Logging

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "logger": "app.services.instance_service",
  "message": "Instance info retrieved",
  "duration_ms": 45,
  "query": "INSTANCE_INFO"
}
```

## Failure Modes & Resilience

| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Oracle DB down | Health check, query timeout | Circuit breaker, cached data, alert |
| Redis down | Connection error | Graceful degradation (no cache) |
| High query latency | Prometheus alert | Query optimization, index review |
| Memory leak | Container restart | Resource limits, profiling |
| Auth token expiry | 401 response | Auto-refresh with refresh token |

## Future Architecture Enhancements

- ✅ **Multi-database support** - Connection pooling per target (implemented; see below)
- [ ] **Plugin system** - Custom metrics collectors
- [ ] **Event streaming** - Kafka for audit log streaming
- [ ] **ML-based anomaly detection** - Forecasting, baselines
- [ ] **GraphQL API** - Flexible querying
- [ ] **Mobile PWA** - Offline-capable dashboard