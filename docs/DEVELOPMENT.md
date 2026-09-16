> **Language:** English · [Version française](fr/DEVELOPMENT.md)

# Development Guide

## Overview

This guide covers the development workflow for the Oracle Monitor Dashboard, including setup, coding standards, testing, and debugging.

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for frontend local development)
- Python 3.11+ (for backend local development)
- uv (Python package manager) - `pip install uv`
- Git

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd oracle-monitor-dashboard

# Copy environment template
cp .env.example .env

# Edit .env with your settings
# Minimum required:
# ORACLE_PASSWORD=your_password
# SECRET_KEY=your-32-char-secret-key

# Start development environment
make dev

# Or with docker-compose directly:
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```

### Access Points (Development)

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:3000 | Vite dev server (port 5173 proxied) |
| Backend API | http://localhost:8000 | FastAPI with auto-reload |
| API Docs | http://localhost:8000/docs | Swagger UI |
| ReDoc | http://localhost:8000/redoc | Alternative docs |
| Grafana | http://localhost:3001 | admin/admin |
| Prometheus | http://localhost:9090 | Metrics |

---

## Development Commands

### Makefile Commands

```bash
# Show all commands
make help

# Development
make dev              # Start dev environment
make dev-down         # Stop dev environment
make dev-logs         # Follow logs
make dev-build        # Rebuild images

# Production
make prod             # Start production
make prod-down        # Stop production
make prod-build       # Build production images

# Database
make db-shell         # SQL*Plus shell
make db-logs          # Oracle logs

# Backend
make backend-shell    # Bash in backend container
make backend-logs     # Backend logs
make backend-test     # Run tests
make backend-lint     # Lint code (ruff)
make backend-format   # Format code (ruff)
make backend-migrate  # Run migrations
make backend-makemigrations MSG="message"  # Create migration

# Frontend
make frontend-shell   # Shell in frontend container
make frontend-logs    # Frontend logs
make frontend-test    # Run tests
make frontend-lint    # Lint code (eslint)
make frontend-format  # Format code (prettier)
make frontend-build   # Build for production

# Utilities
make logs             # All logs
make ps               # Container status
make clean            # Remove everything
make reset            # Full reset (clean + dev-build + dev)

# CI
make ci-test          # All tests
make ci-lint          # All linting
```

### Direct Docker Commands

```bash
# Backend
docker exec -it oracle-monitor-backend bash
docker exec oracle-monitor-backend pytest -v
docker exec oracle-monitor-backend ruff check .
docker exec oracle-monitor-backend ruff format .

# Frontend
docker exec -it oracle-monitor-frontend sh
docker exec oracle-monitor-frontend npm run test
docker exec oracle-monitor-frontend npm run lint
docker exec oracle-monitor-frontend npm run format

# Database
docker exec -it oracle-monitor-db sqlplus monitor/password@FREE
docker logs -f oracle-monitor-db
```

---

## Backend Development

### Project Structure

```
backend/
├── app/
│   ├── api/routes/       # API endpoints
│   ├── core/             # Core modules
│   ├── services/         # Business logic
│   ├── tasks/            # Celery tasks
│   └── utils/            # Helpers
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── alembic/              # Migrations
├── pyproject.toml        # Dependencies
└── Dockerfile
```

### Adding a New API Endpoint

1. **Create route file** in `app/api/routes/`:

```python
# app/api/routes/new_feature.py
from fastapi import APIRouter, Query
from app.services.new_feature_service import NewFeatureService

router = APIRouter()

@router.get("/endpoint")
async def get_data(param: str = Query(...)):
    return await NewFeatureService.get_data(param)
```

2. **Create service** in `app/services/`:

```python
# app/services/new_feature_service.py
from app.database import oracle_pool
from app.core.oracle_queries import NEW_QUERY

class NewFeatureService:
    @staticmethod
    async def get_data(param: str):
        return await oracle_pool.execute_query(NEW_QUERY, {"param": param})
```

3. **Add query** in `app/core/oracle_queries.py`:

```python
NEW_QUERY = """
SELECT * FROM some_view WHERE column = :param
"""
```

4. **Register route** in `app/api/routes/__init__.py`:

```python
from app.api.routes import new_feature
# Add to __all__
```

5. **Include in main.py**:

```python
from app.api.routes import new_feature
app.include_router(new_feature.router, prefix=f"{settings.API_PREFIX}/new-feature", tags=["New Feature"])
```

### Adding a Database Query

1. Add SQL to `app/core/oracle_queries.py` with parameter placeholders
2. Use named parameters: `:param_name`
3. For dynamic queries, create a function returning the query string

```python
# Parameterized query
MY_QUERY = """
SELECT col1, col2 
FROM my_table 
WHERE id = :id 
  AND status = :status
"""

# Dynamic query builder
def get_dynamic_query(filter_col: str) -> str:
    valid_cols = {'col1', 'col2', 'col3'}
    if filter_col not in valid_cols:
        raise ValueError(f"Invalid column: {filter_col}")
    return f"SELECT * FROM my_table WHERE {filter_col} = :value"
```

### Database Migrations

```bash
# Create new migration
make backend-makemigrations MSG="add new_feature table"

# Apply migrations
make backend-migrate

# Check migration status
docker exec oracle-monitor-backend alembic current
docker exec oracle-monitor-backend alembic history
```

**Migration file structure:**
```python
# alembic/versions/xxxx_add_new_feature.py
def upgrade():
    op.create_table('new_feature', ...)

def downgrade():
    op.drop_table('new_feature')
```

### Testing Backend

```bash
# Run all tests
make backend-test

# Run specific test file
docker exec oracle-monitor-backend pytest tests/unit/test_formatting.py -v

# Run with coverage
docker exec oracle-monitor-backend pytest --cov=app --cov-report=html

# Run integration tests (requires Oracle)
docker exec oracle-monitor-backend pytest tests/integration/ -v
```

**Test Structure:**
```
tests/
├── conftest.py              # Fixtures
├── unit/
│   ├── test_formatting.py   # Unit tests
│   ├── test_oracle_queries.py
│   └── test_services.py
├── integration/
│   ├── test_api_overview.py
│   ├── test_api_instance.py
│   └── test_api_performance.py
└── fixtures/
    └── sample_data.py
```

**Example Unit Test:**
```python
# tests/unit/test_formatting.py
import pytest
from app.utils.formatting import format_bytes, format_duration

def test_format_bytes():
    assert format_bytes(0) == "0 B"
    assert format_bytes(1024) == "1.00 KB"
    assert format_bytes(1024**3) == "1.00 GB"

def test_format_duration():
    assert format_duration(30) == "30.0s"
    assert format_duration(90) == "1m 30s"
```

**Example Integration Test:**
```python
# tests/integration/test_api_overview.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_overview_endpoint(client: AsyncClient, auth_headers):
    response = await client.get("/api/v1/overview", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "database" in data
    assert "sessions" in data
```

### Linting & Formatting

```bash
# Lint
make backend-lint
# or
docker exec oracle-monitor-backend ruff check .

# Format
make backend-format
# or
docker exec oracle-monitor-backend ruff format .
```

**Ruff Configuration** (`pyproject.toml`):
```toml
[tool.ruff]
line-length = 100
target-version = "py311"
select = ["E", "F", "I", "N", "W", "UP", "B", "C4", "PL", "RUF", "SIM", "TID", "TRY"]
ignore = ["E501", "TRY003"]
fixable = ["ALL"]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

---

## Frontend Development

### Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios instance
│   │   ├── queryClient.ts     # TanStack Query config
│   │   ├── hooks/             # Feature hooks
│   │   └── websocket.ts       # WebSocket hook
│   ├── components/
│   │   ├── common/            # Reusable UI
│   │   ├── charts/            # Recharts components
│   │   └── layout/            # Layout components
│   ├── pages/                 # Page components
│   ├── context/               # React contexts
│   ├── theme/                 # MUI theme
│   ├── types/                 # TypeScript types
│   ├── hooks/                 # Custom hooks
│   └── utils/                 # Helpers
├── tests/
│   ├── unit/
│   └── e2e/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── Dockerfile
```

### Adding a New Page

1. **Create page component** in `src/pages/`:

```tsx
// src/pages/NewPage.tsx
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useNewFeature } from '../api/hooks/useNewFeature';
import { DataTable, LoadingSkeleton } from '../components/common';

export const NewPage: React.FC = () => {
  const { data, isLoading, error } = useNewFeature();

  if (isLoading) return <LoadingSkeleton variant="table" />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" fontWeight={600}>New Feature</Typography>
      <Paper sx={{ p: 2 }}>
        <DataTable
          rows={data?.map((d, i) => ({ id: i, ...d })) || []}
          columns={[
            { field: 'name', headerName: 'Name', flex: 1 },
            { field: 'value', headerName: 'Value', type: 'number' },
          ]}
        />
      </Paper>
    </Box>
  );
};
```

2. **Create hook** in `src/api/hooks/useNewFeature.ts`:

```typescript
// src/api/hooks/useNewFeature.ts
import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';
import type { NewFeatureData } from '../../types/api';

export function useNewFeature() {
  return useQuery({
    queryKey: ['new-feature'],
    queryFn: async () => {
      const { data } = await apiClient.get<NewFeatureData[]>('/new-feature/endpoint');
      return data;
    },
    refetchInterval: 30000,
  });
}
```

3. **Export hook** in `src/api/hooks/index.ts`:

```typescript
export * from './useNewFeature';
```

4. **Add types** in `src/types/api.ts`:

```typescript
export interface NewFeatureData {
  id: number;
  name: string;
  value: number;
}
```

4. **Add route** in `src/App.tsx`:

```tsx
import { NewPage } from './pages';

<Route path="/new-feature" element={<NewPage />} />
```

5. **Add to sidebar** in `src/components/layout/Sidebar.tsx`:

```tsx
const menuItems = [
  // ...
  { path: '/new-feature', label: 'New Feature', icon: <NewIcon /> },
];
```

### Adding a Chart Component

1. **Create chart** in `src/components/charts/`:

```tsx
// src/components/charts/MyChart.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MyChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
}

export const MyChart: React.FC<MyChartProps> = ({ data, height = 300 }) => {
  if (!data.length) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      No data available
    </div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#0066CC" />
      </BarChart>
    </ResponsiveContainer>
  );
};
```

2. **Export** in `src/components/charts/index.ts`:

```typescript
export { MyChart } from './MyChart';
```

### State Management with TanStack Query

```typescript
// Query with parameters
const { data } = useQuery({
  queryKey: ['feature', { param: value }],
  queryFn: () => apiClient.get('/endpoint', { params: { param: value } }),
  enabled: !!value,  // Only fetch when param exists
  staleTime: 30000,
  refetchInterval: 30000,
});

// Mutation
const mutation = useMutation({
  mutationFn: (payload) => apiClient.post('/endpoint', payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['feature'] });
  },
});

// Usage
mutation.mutate({ name: 'test' });
```

**Manual / auto refresh:** the `RefreshControl` in the header wraps `useAutoRefresh` and calls an
`onManualRefresh` callback when the user refreshes or the (settings-seeded) interval fires. Typical
page wiring:

```tsx
const handleRefresh = () => {
  queryClient.refetchQueries({ type: 'active' });   // refresh all active queries
  // or targeted: queryClient.invalidateQueries({ queryKey: ['feature'] });
};
...
<RefreshControl onManualRefresh={handleRefresh} />
```

`useAutoRefresh` keeps the callback in a stable ref so passing an inline handler does not reset the
timer. The initial interval/enabled state come from `SettingsContext`
(`settings.refreshInterval`, `settings.autoRefresh`).

### Testing Frontend

```bash
# Unit tests
make frontend-test

# Watch mode
docker exec oracle-monitor-frontend npm run test

# UI mode
docker exec oracle-monitor-frontend npm run test:ui

# E2E tests
make frontend-test-e2e
```

**Unit Test Example:**
```typescript
// tests/unit/components/KPICard.test.tsx
import { render, screen } from '@testing-library/react';
import { KPICard } from '../../components/common/KPICard';

describe('KPICard', () => {
  it('renders title and value', () => {
    render(<KPICard title="Test" value={100} unit="%" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders trend when provided', () => {
    render(<KPICard title="Test" value={100} trend={5.5} />);
    expect(screen.getByText('↑ 5.5%')).toBeInTheDocument();
  });
});
```

**E2E Test Example:**
```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard loads and shows KPI cards', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=Dashboard Overview')).toBeVisible();
  await expect(page.locator('text=Active Sessions')).toBeVisible();
});
```

### Linting & Formatting

```bash
# Lint
make frontend-lint
# or
docker exec oracle-monitor-frontend npm run lint

# Format
make frontend-format
# or
docker exec oracle-monitor-frontend npm run format
```

**ESLint Config** (`.eslintrc.json`):
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["react-refresh", "@typescript-eslint"],
  "rules": {
    "react-refresh/only-export-components": ["warn", { "allowConstantExport": true }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
  }
}
```

**Prettier Config** (`.prettierrc`):
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

---

## Debugging

### Backend Debugging

**VS Code Launch Config** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
      "cwd": "${workspaceFolder}/backend",
      "env": { "PYTHONPATH": "${workspaceFolder}/backend" }
    }
  ]
}
```

**Debug in Container:**
```bash
# Install debugpy in backend
docker exec oracle-monitor-backend pip install debugpy

# Run with debugger
docker exec oracle-monitor-backend python -m debugpy --listen 0.0.0.0:5678 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend Debugging

**React DevTools:**
- Install React Developer Tools browser extension
- Components and Profiler tabs available

**VS Code Debug Config:**
```json
{
  "type": "chrome",
  "request": "launch",
  "name": "Launch Chrome against localhost",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/frontend/src"
}
```

**Vite Debug:**
- Open DevTools → Sources → webpack:// → src
- Set breakpoints in TypeScript source

### Database Debugging

```bash
# Connect to Oracle
make db-shell

# Or directly
docker exec -it oracle-monitor-db sqlplus monitor/password@FREE

# Useful queries
SELECT * FROM v$session WHERE type = 'USER';
SELECT * FROM v$active_session_history WHERE sample_time > SYSDATE - 1/24;
SELECT * FROM v$sql_monitor WHERE status LIKE 'EXECUTING%';
```

### Log Analysis

```bash
# Backend logs with filtering
make backend-logs | grep ERROR
make backend-logs | grep -i "sql_monitor"

# Structured log parsing
make backend-logs | jq 'select(.level=="ERROR")'

# Follow specific service
docker logs -f oracle-monitor-backend 2>&1 | grep -E "(ERROR|WARN)"
```

---

## Git Workflow

### Branch Strategy

```
main                    # Production-ready
├── develop             # Integration branch
│   ├── feature/xyz     # Feature branches
│   ├── bugfix/abc      # Bug fixes
│   └── hotfix/def      # Urgent fixes
```

### Commit Convention

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

**Examples:**
```
feat(api): add SQL monitor detail endpoint
fix(frontend): resolve blocking tree rendering issue
docs(api): update SQL monitor API documentation
refactor(backend): extract Oracle queries to separate module
test(integration): add SQL monitor integration tests
```

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes with tests
2. Run linting and tests locally
3. Push branch and create PR
4. CI runs automatically
5. Code review (1 approval required)
6. Squash and merge to `develop`

---

## Code Quality Standards

### Python (Backend)

- **Type hints** required for all functions
- **Docstrings** for public functions/classes
- **Async/await** for I/O operations
- **Pydantic models** for request/response
- **Structured logging** with structlog
- **Error handling** with custom exceptions

### TypeScript (Frontend)

- **Strict mode** enabled
- **Explicit types** for props and state
- **Interface** for object shapes
- **Type-only imports** with `import type`
- **No `any`** - use `unknown` or generics
- **Functional components** with hooks

### General

- **Meaningful names** - no abbreviations
- **Small functions** - single responsibility
- **DRY** - extract common logic
- **Comments** - why, not what
- **Tests** - new features need tests

---

## Performance Profiling

### Backend

```python
# Add timing to service methods
import time
from functools import wraps

def timed(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = await func(*args, **kwargs)
        duration = (time.perf_counter() - start) * 1000
        logger.debug(f"{func.__name__} took {duration:.2f}ms")
        return result
    return wrapper
```

### Frontend

```typescript
// React DevTools Profiler
// Wrap component with <Profiler id="MyComponent" onRender={onRender}>

// Custom performance mark
performance.mark('feature-start');
// ... code ...
performance.mark('feature-end');
performance.measure('feature', 'feature-start', 'feature-end');
```

---

## Dependency Management

### Backend (uv)

```bash
# Add dependency
cd backend && uv add package-name

# Add dev dependency
cd backend && uv add --dev package-name

# Update lock file
cd backend && uv lock --upgrade

# Sync dependencies
cd backend && uv sync --all-extras
```

### Frontend (npm)

```bash
# Add dependency
cd frontend && npm install package-name

# Add dev dependency
cd frontend && npm install -D package-name

# Update
cd frontend && npm update

# Audit
cd frontend && npm audit
```

---

## Common Development Tasks

### Reset Database

```bash
# Full reset
make clean
make dev-build
make dev

# Or just reset Oracle
docker-compose down oracle
docker volume rm oracle-monitor-dashboard_oracle_data
make dev
```

### Clear Cache

```bash
# Redis
docker exec oracle-monitor-redis redis-cli FLUSHALL

# Frontend
docker exec oracle-monitor-frontend rm -rf node_modules/.vite
```

### Rebuild Single Service

```bash
docker-compose build backend
docker-compose up -d --no-deps backend
```

### View Running Queries

```bash
# Oracle
SELECT sql_text, elapsed_time/1e6 as secs 
FROM v$sql_monitor 
WHERE status LIKE 'EXECUTING%';

# Backend query log
make backend-logs | grep "Executing query"
```