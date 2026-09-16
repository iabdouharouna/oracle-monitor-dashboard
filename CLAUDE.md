# CLAUDE.md - Oracle Monitor Dashboard

## Project Overview

Oracle Monitor Dashboard - A full-stack Oracle Database monitoring dashboard replicating SQL Developer's monitoring capabilities.

**Stack:** FastAPI (Python 3.11) + React 18 + TypeScript + Oracle 23c Free

## Key Commands

```bash
# Development
make dev              # Start dev environment
make dev-logs         # Follow logs
make dev-down         # Stop dev

# Testing
make backend-test     # pytest -v
make frontend-test    # npm run test
make ci-test          # All tests

# Linting
make backend-lint     # ruff check .
make frontend-lint    # npm run lint
make ci-lint          # All linting

# Building
make dev-build        # Build dev images
make prod-build       # Build production images

# Database
make db-shell         # SQL*Plus shell
make db-logs          # Oracle logs
```

## Project Structure

```
oracle-monitor-dashboard/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── api/routes/   # 12 REST modules + WebSocket
│   │   ├── core/         # Oracle queries, models, security
│   │   ├── services/     # 9 business logic services
│   │   ├── tasks/        # Celery tasks
│   │   └── utils/
│   ├── tests/
│   └── alembic/
├── frontend/             # React + TypeScript
│   ├── src/
│   │   ├── api/hooks/    # TanStack Query hooks
│   │   ├── components/   # components (common/charts/layout)
│   │   ├── pages/        # 13 page components
│   │   ├── context/      # Auth, Connection, Settings
│   │   ├── theme/        # SQL Developer MUI theme (+ dark theme)
│   │   └── types/        # TypeScript interfaces
│   └── tests/
├── docs/                 # 11 comprehensive docs
├── monitoring/           # Prometheus/Grafana
└── scripts/              # Oracle init scripts
```

## Key Development Patterns

### Backend
- **Async/await** for all I/O
- **Pydantic models** for request/response validation
- **Structured logging** with structlog (JSON in prod)
- **Custom exceptions** in `app/core/exceptions.py`
- **Oracle queries** centralized in `app/core/oracle_queries.py`
- **Services** in `app/services/` - business logic layer

### Frontend
- **TanStack Query** for server state (`useQuery`, `useMutation`)
- **MUI v5** components with SQL Developer theme
- **Recharts** for visualizations
- **React Force Graph** for blocking tree
- **TypeScript strict mode** enabled
- **Custom hooks** in `src/api/hooks/`

## Oracle Queries

All 40 queries in `backend/app/core/oracle_queries.py`:
- Instance: INFO, CLIENTS, PROCESSES, MEMORY, STORAGE, CPU, TOP_SQL
- Sessions: SESSIONS, BLOCKING, LONG_OPS, KILL
- SQL Monitor: ACTIVE, DETAIL, PLAN, PARALLELISM
- ASH: AAS, TOP_SQL, WAIT_CLASSES, DRILLDOWN
- Storage: TABLESPACES, DATAFILES, SEGMENTS, GROWTH, CAPACITY
- Memory: SGA_ADVICE, PGA_ADVICE, MEMORY_TARGET_ADVICE
- Waits: SYSTEM_WAITS, SESSION_WAITS, IO_METRICS, HISTORY
- Alerts: ALERT_LOG, THRESHOLDS, CHECK
- AWR: SNAPSHOTS, TOP_SQL (requires Diagnostics Pack); report generation SQL lives in `app/services/awr_service.py`

Required grants in `scripts/init-db.sql`.

## Environment Variables

Critical (required):
- `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_DSN`
- `SECRET_KEY` (32+ chars)

Feature flags:
- `HAS_DIAGNOSTICS_PACK=true` - Enable AWR/DBA_HIST
- `ENABLE_KILL_SESSION=false` - Allow session kill

Thresholds configurable via API or env.

## Testing

```bash
# Backend
make backend-test              # All tests
docker exec oracle-monitor-backend pytest tests/unit/test_formatting.py -v

# Frontend
make frontend-test             # vitest
docker exec oracle-monitor-frontend npm run test:ui

# E2E
make frontend-e2e              # playwright
```

## Documentation

All docs in `/docs`:
- ARCHITECTURE.md, BACKEND_API.md, ORACLE_QUERIES.md
- FRONTEND_COMPONENTS.md, DEPLOYMENT.md, CONFIGURATION.md
- TECHNICAL_REFERENCE.md (code-level reference)
- DEVELOPMENT.md, FEATURES.md, TROUBLESHOOTING.md, CONTRIBUTING.md
- `docs/adr/` — Architecture Decision Records (index: `docs/adr/README.md`)

**Bilingual docs:** every doc under `docs/` has a French mirror in `docs/fr/`
(ADRs in `docs/adr/fr/`). When updating a doc, update both versions.

## Common Issues

| Issue | Solution |
|-------|----------|
| Oracle won't start | Check 8GB+ RAM, port 1521 free |
| Backend can't connect | Verify ORACLE_DSN, Oracle health check |
| Frontend network error | Check VITE_API_URL matches backend |
| Celery tasks stuck | Check Redis, restart celery-worker |
| Charts not rendering | Verify API response matches TypeScript types |

## Agent Guidelines

When working on this project:
1. Follow existing patterns in codebase
2. Use existing services/hooks before creating new ones
3. Add TypeScript types for new API endpoints
3. Write tests for new functionality
4. Update documentation in `/docs` when adding features
5. Follow Conventional Commits: `feat(api): description`