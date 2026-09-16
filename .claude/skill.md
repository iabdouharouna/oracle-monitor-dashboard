# Oracle Monitor Dashboard - Skill Definition

## Overview
This skill provides comprehensive assistance for developing, debugging, and maintaining the Oracle Monitor Dashboard - a full-stack Oracle Database monitoring application replicating SQL Developer's monitoring capabilities.

## Capabilities

### Backend Development (FastAPI + Python)
- **API Development**: Create REST endpoints following existing patterns in `app/api/routes/`
- **Oracle Queries**: Write parameterized SQL for V$ views in `app/core/oracle_queries.py`
- **Service Layer**: Implement business logic in `app/services/`
- **Database Models**: Define Pydantic models in `app/core/models.py`
- **Authentication**: JWT/OAuth2 in `app/core/security.py`
- **Background Tasks**: Celery tasks in `app/tasks/`
- **Testing**: pytest with async support in `tests/`

### Frontend Development (React + TypeScript)
- **Component Creation**: MUI v5 components in `src/components/`
- **Page Development**: Feature pages in `src/pages/`
- **Data Fetching**: TanStack Query hooks in `src/api/hooks/`
- **State Management**: React Context for auth/connection
- **Charts**: Recharts visualizations in `src/components/charts/`
- **Theming**: SQL Developer theme in `src/theme/theme.ts`
- **Testing**: Vitest + Playwright in `tests/`

### Oracle Database Expertise
- **V$ Views**: Deep knowledge of performance views
- **ASH Analytics**: Active Session History queries
- **AWR Reports**: Automatic Workload Repository
- **SQL Monitoring**: Real-time SQL execution tracking
- **Performance Tuning**: Wait events, I/O, memory, storage
- **Diagnostics Pack**: AWR/DBA_HIST_* views

### DevOps & Deployment
- **Docker Compose**: Multi-service orchestration
- **CI/CD**: GitHub Actions workflows
- **Monitoring**: Prometheus + Grafana
- **Production**: Nginx reverse proxy, SSL, scaling

## Workflows

### Feature Development
1. Analyze requirements against existing modules
2. Check existing patterns in codebase
3. Implement backend (query → service → route → model)
4. Implement frontend (types → hook → component → page)
5. Add tests (unit + integration)
6. Update documentation in `/docs`
7. Create PR with conventional commit

### Bug Fixing
1. Reproduce issue locally
2. Identify root cause (logs, debugging)
3. Implement minimal fix
4. Add regression test
8. Update troubleshooting docs

### Performance Optimization
1. Profile slow endpoints (`/metrics`, query timing)
2. Analyze Oracle execution plans
3. Adjust cache TTLs
4. Add indexes or materialized views
5. Scale services horizontally

## Code Standards

### Python (Backend)
- Ruff formatting (100 char line, double quotes)
- Type hints required
- Async/await for I/O
- Structured logging (structlog)
- Custom exceptions

### TypeScript (Frontend)
- Strict mode enabled
- Explicit types, no `any`
- Functional components + hooks
- TanStack Query for server state
- MUI v5 components

## Key Integration Points

### Backend → Frontend
- REST API: `/api/v1/*` with OpenAPI docs
- WebSocket: `/ws/{channel}` for real-time
- Auth: JWT Bearer tokens
- Errors: Standardized format with codes

### Backend → Oracle
- Async connection pool (python-oracledb thin)
- Parameterized queries only
- Redis caching layer (TTL per endpoint)
- Celery for background jobs

## Common Tasks

### Adding New Metric
1. Add Oracle query to `oracle_queries.py`
2. Create service method in `services/`
3. Add API route in `api/routes/`
4. Add Pydantic model in `core/models.py`
5. Create TypeScript type in `types/api.ts`
6. Create hook in `api/hooks/`
7. Build UI component/page

### Adding New Chart
1. Create component in `components/charts/`
2. Use Recharts or react-force-graph-2d
3. Follow theme colors (WAIT_CLASS_COLORS)
4. Add to page component
4. Export from `components/charts/index.ts`

### Modifying Thresholds
1. Update defaults in `config.py`
2. Add to `ThresholdConfig` model
3. Add PUT endpoint in `alerts.py`
4. Add UI in `Alerts.tsx`
5. Update `AlertService.check_thresholds()`

## Documentation Maintenance
Update corresponding `.md` in `/docs` for any changes:
- ARCHITECTURE.md - system changes
- BACKEND_API.md - new endpoints
- ORACLE_QUERIES.md - new queries
- FRONTEND_COMPONENTS.md - new components
- FEATURES.md - new features
- TROUBLESHOOTING.md - new issues