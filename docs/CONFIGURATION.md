> **Language:** English · [Version française](fr/CONFIGURATION.md)

# Configuration Guide

## Overview

The Oracle Monitor Dashboard uses a layered configuration approach:
1. **Environment variables** (`.env` file) - Primary configuration
2. **YAML settings** (`config/settings.yaml`) - Feature flags, thresholds
3. **Code defaults** (`app/config.py`) - Fallback values with validation
4. **Persisted runtime overrides** (`config/thresholds.json`) - Threshold values saved at runtime via the API (highest precedence for thresholds)

## Environment Variables (`.env`)

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ORACLE_USER` | Oracle monitoring username | `monitor` |
| `ORACLE_PASSWORD` | Oracle password | `secure_password_2024` |
| `ORACLE_DSN` | Connection string (host:port/service) | `localhost:1521/FREE` |
| `SECRET_KEY` | JWT signing key (min 32 chars) | `your-32-char-secret-key` |

### Security

| Variable | Default | Description |
|----------|---------|-------------|
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| `BCRYPT_ROUNDS` | `12` | Password hashing cost |

### Oracle Connection Pool

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `ORACLE_POOL_MIN` | `2` | 1-10 | Minimum connections |
| `ORACLE_POOL_MAX` | `20` | 2-100 | Maximum connections |
| `ORACLE_POOL_INCREMENT` | `2` | 1-10 | Pool growth increment |
| `ORACLE_TIMEOUT` | `30` | 5-300 | Connection timeout (seconds) |
| `ORACLE_ENCODING` | `UTF-8` | - | Character encoding |
| `ORACLE_NCHAR_ENCODING` | `UTF-8` | - | NCHAR encoding |

### Redis

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection URL |
| `REDIS_MAX_CONNECTIONS` | `50` | Max pool connections |
| `REDIS_SOCKET_TIMEOUT` | `5` | Socket timeout (seconds) |
| `REDIS_SOCKET_CONNECT_TIMEOUT` | `5` | Connect timeout (seconds) |

### Cache TTLs (seconds)

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_TTL_DEFAULT` | `30` | Default cache TTL |
| `CACHE_TTL_INSTANCE_INFO` | `300` | Instance info cache |
| `CACHE_TTL_TABLESPACES` | `60` | Tablespace cache |
| `CACHE_TTL_ASH` | `10` | ASH data cache |
| `CACHE_TTL_SQL_MONITOR` | `5` | SQL monitor cache |
| `CACHE_TTL_SESSIONS` | `15` | Sessions cache |
| `CACHE_TTL_WAITS` | `15` | Wait events cache |
| `CACHE_TTL_MEMORY` | `60` | Memory cache |

### CORS

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed origins (comma-separated) |
| `CORS_ALLOW_CREDENTIALS` | `true` | Allow cookies/auth |
| `CORS_ALLOW_METHODS` | `GET,POST,PUT,DELETE,OPTIONS` | Allowed methods |
| `CORS_ALLOW_HEADERS` | `*` | Allowed headers |

### Features

| Variable | Default | Description |
|----------|---------|-------------|
| `HAS_DIAGNOSTICS_PACK` | `true` | Enable AWR/DBA_HIST queries |
| `ENABLE_KILL_SESSION` | `false` | Allow session kill (DBA only) |
| `ENABLE_AWR_REPORTS` | `true` | Enable AWR report generation |
| `ENABLE_AUTO_REFRESH` | `true` | Enable auto-refresh by default |
| `DEFAULT_REFRESH_INTERVAL` | `30` | Default refresh (seconds) |

### Thresholds

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `THRESHOLD_TABLESPACE_WARN` | `80` | 50-95 | Tablespace warning % |
| `THRESHOLD_TABLESPACE_CRIT` | `90` | 60-99 | Tablespace critical % |
| `THRESHOLD_SESSIONS_WARN` | `70` | 50-90 | Sessions warning % |
| `THRESHOLD_SESSIONS_CRIT` | `85` | 60-95 | Sessions critical % |
| `THRESHOLD_CPU_WARN` | `80` | 50-95 | CPU warning % |
| `THRESHOLD_CPU_CRIT` | `90` | 60-99 | CPU critical % |
| `THRESHOLD_WAIT_TIME_MS_WARN` | `100` | 10-1000 | Wait time warning (ms) |
| `THRESHOLD_WAIT_TIME_MS_CRIT` | `500` | 50-5000 | Wait time critical (ms) |
| `THRESHOLDS_FILE` | `config/thresholds.json` | - | Path to persisted threshold overrides |

> **Precedence:** threshold values are resolved by `AlertService.effective_thresholds()`
> (defaults from env → merged with `config/thresholds.json`). Runtime overrides saved via
> `PUT /api/v1/alerts/thresholds` **win** over the environment defaults. The file is created
> lazily on the first `PUT /api/v1/alerts/thresholds` call (a sample:

```json
{
  "tablespaceWarn": 85,
  "tablespaceCrit": 92,
  "sessionsWarn": 75,
  "sessionsCrit": 90,
  "cpuWarn": 80,
  "cpuCrit": 90,
  "waitTimeMsWarn": 150,
  "waitTimeMsCrit": 600
}
```

Only keys with integer values are read back; non-numeric entries are ignored.
`GET /api/v1/alerts/thresholds` always returns the effective (merged) configuration.

### Runtime threshold persistence

To change a threshold at runtime (no restart, no env change):

```bash
curl -X PUT http://localhost:8000/api/v1/alerts/thresholds \
  -H "Content-Type: application/json" \
  -d '{"cpuWarn": 82, "cpuCrit": 93}'
```

The response is the full merged configuration. Overrides are persisted to
`config/thresholds.json` (backed up alongside `config/databases.json`).

### Celery

| Variable | Default | Description |
|----------|---------|-------------|
| `CELERY_BROKER_URL` | `redis://redis:6379/1` | Celery broker |
| `CELERY_RESULT_BACKEND` | `redis://redis:6379/2` | Celery results |
| `CELERY_TASK_TRACK_STARTED` | `true` | Track task start |
| `CELERY_TASK_TIME_LIMIT` | `300` | Task timeout (seconds) |
| `CELERY_WORKER_PREFETCH_MULTIPLIER` | `4` | Prefetch multiplier |

### Monitoring

| Variable | Default | Description |
|----------|---------|-------------|
| `PROMETHEUS_METRICS_ENABLED` | `true` | Enable Prometheus metrics |
| `METRICS_PORT` | `9090` | Metrics port (internal) |

### Pagination

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `DEFAULT_PAGE_SIZE` | `50` | 1-500 | Default page size |
| `MAX_PAGE_SIZE` | `500` | 1-5000 | Max page size |

### Export

| Variable | Default | Description |
|----------|---------|-------------|
| `EXPORT_MAX_ROWS` | `10000` | Max rows in CSV export |
| `REPORT_TEMPLATE_DIR` | `app/templates/reports` | Report templates path |

### Frontend (Build-time)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |
| `VITE_WS_URL` | `ws://localhost:8000` | WebSocket URL |
| `VITE_APP_TITLE` | `Oracle Monitor Dashboard` | App title |

---

## YAML Settings (`config/settings.yaml`)

Alternative configuration via YAML (merged with env vars, env takes precedence).

```yaml
# config/settings.yaml
database:
  user: "${ORACLE_USER}"
  password: "${ORACLE_PASSWORD}"
  dsn: "${ORACLE_DSN}"
  pool_min: 2
  pool_max: 20
  pool_increment: 2
  timeout: 30

dashboard:
  title: "Oracle Monitor Dashboard"
  theme: "sql_developer"     # light/dark/sql_developer
  default_refresh_sec: 30
  refresh_options: [5, 15, 30, 60, 0]  # 0 = OFF
  timezone: "UTC"

thresholds:
  tablespace_pct_warn: 80
  tablespace_pct_crit: 90
  session_pct_warn: 70
  session_pct_crit: 85
  cpu_pct_warn: 80
  cpu_pct_crit: 90
  wait_time_ms_warn: 100

features:
  enable_sql_monitor: true
  enable_ash_analytics: true
  enable_kill_session: false
  enable_awr_history: true
  max_sql_text_length: 2000

cache:
  instance_info_ttl: 300
  tablespace_ttl: 60
  ash_ttl: 10
  sql_monitor_ttl: 5
```

---

## Pydantic Settings (`app/config.py`)

All settings are defined in `app/config.py` using Pydantic Settings with:

- **Type validation** - Automatic type coercion and validation
- **Field constraints** - Range checks (ge, le), min_length
- **Environment loading** - From `.env` file with `utf-8` encoding
- **Case sensitivity** - Environment variables are case-sensitive
- **Extra ignore** - Unknown env vars are ignored

### Settings Class Structure

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    
    # Application
    APP_NAME: str = "Oracle Monitor Dashboard"
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # Oracle Database
    ORACLE_USER: str
    ORACLE_PASSWORD: SecretStr
    ORACLE_DSN: str
    # ... pool settings
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    # ... connection settings
    
    # Cache TTLs
    CACHE_TTL_DEFAULT: int = 30
    # ... per-endpoint TTLs
    
    # Auth
    SECRET_KEY: SecretStr
    # ... JWT settings
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    # ... CORS settings
    
    # Features
    HAS_DIAGNOSTICS_PACK: bool = True
    # ... feature flags
    
    # Thresholds
    THRESHOLD_TABLESPACE_WARN: int = 80
    # ... all thresholds with validation
    
    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/1"
    # ... Celery settings
    
    # Monitoring
    PROMETHEUS_METRICS_ENABLED: bool = True
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 500
    
    # Export
    EXPORT_MAX_ROWS: int = 10000
    REPORT_TEMPLATE_DIR: Path = Path("app/templates/reports")
```

### Custom Validators

```python
@field_validator("CORS_ORIGINS", mode="before")
@classmethod
def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
    if isinstance(v, str):
        return [origin.strip() for origin in v.split(",")]
    return v
```

### Accessing Settings

```python
from app.config import settings

# Global instance (cached)
settings = get_settings()

# Usage
pool_size = settings.ORACLE_POOL_MAX
threshold = settings.THRESHOLD_TABLESPACE_WARN
secret = settings.SECRET_KEY.get_secret_value()
```

---

## Frontend Configuration

### Vite Config (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/x-data-grid', ...],
          charts: ['recharts', 'd3', 'react-force-graph-2d'],
          query: ['@tanstack/react-query'],
          utils: ['date-fns', 'lodash-es', 'clsx'],
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
```

### Environment Variables (`.env`)

```bash
# Development
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_APP_TITLE=Oracle Monitor Dashboard

# Production (set at build time)
# VITE_API_URL=https://api.your-domain.com
# VITE_WS_URL=wss://api.your-domain.com
```

### Accessing in Code

```typescript
// Type-safe access
const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;
const APP_TITLE = import.meta.env.VITE_APP_TITLE;

// ViteEnv interface (vite-env.d.ts)
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_APP_TITLE: string;
}
```

---

## Feature Flags

### Backend Features (`app/config.py`)

| Flag | Default | Description |
|------|---------|-------------|
| `HAS_DIAGNOSTICS_PACK` | `true` | Enable DBA_HIST_* queries |
| `ENABLE_KILL_SESSION` | `false` | Allow session kill (DBA) |
| `ENABLE_AWR_REPORTS` | `true` | AWR report generation |
| `ENABLE_AUTO_REFRESH` | `true` | Default auto-refresh |

### Frontend Feature Flags

Configured via `src/context/ConnectionContext.tsx` or feature-specific hooks:

```typescript
// Example: Conditional rendering based on feature
const { hasDiagnosticsPack } = useConnection();

{hasDiagnosticsPack && (
  <Tab label="AWR Reports" />
)}
```

---

## Theme Configuration

### MUI Theme (`src/theme/theme.ts`)

```typescript
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0066CC', light: '#4D94DB', dark: '#004499' },
    secondary: { main: '#FF8C00', light: '#FFB340', dark: '#CC7000' },
    success: { main: '#00A651' },
    warning: { main: '#FF8C00' },
    error: { main: '#D13438' },
    info: { main: '#0078D4' },
    background: { default: '#F5F7FA', paper: '#FFFFFF' },
    // ...
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    // ... h1-h6, body1, body2, button, caption, overline
  },
  components: {
    // MUI component overrides
    MuiButton: { styleOverrides: { root: { textTransform: 'none' } } },
    MuiDataGrid: { styleOverrides: { root: { border: '1px solid #E1E4E8' } } },
    // ...
  },
});
```

### Dark Mode (`src/theme/theme.ts` + `src/context/SettingsContext.tsx`)

Dark mode is **implemented** and user-selectable from **Settings → Appearance**. The theme file
exports a light theme, a dark theme, and a factory that selects between them:

```typescript
// src/theme/theme.ts
export const theme;                       // light theme (SQL Developer palette)
export const darkTheme;                   // dark theme (background #1E2430, paper #262E3D)
export function createAppTheme(mode: 'light' | 'dark'): Theme;
```

The choice is provided by `SettingsContext` (`settings.theme`) and applied at the root in
`main.tsx`:

```typescript
// src/main.tsx
const ThemedApp = () => {
  const { settings } = useSettings();
  const theme = createAppTheme(settings.theme);
  return <ThemeProvider theme={theme}>...</ThemeProvider>;
};
```

The selected mode is persisted to `localStorage` under `oracle-monitor-settings`
(`{ "theme": "light" | "dark", ... }`) so it survives a reload. Toggling it re-renders the
whole app with the dark palette immediately.

---

## Logging Configuration

### Structlog (`app/lifespan.py`)

```python
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer() if not settings.DEBUG 
        else structlog.dev.ConsoleRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)
```

### Log Levels

| Level | Usage |
|-------|-------|
| `DEBUG` | Detailed diagnostic info |
| `INFO` | General operational info |
| `WARNING` | Unexpected but handled |
| `ERROR` | Failed operations |
| `CRITICAL` | System unusable |

### Log Output

**Development:** Pretty-printed console output with colors
**Production:** JSON lines for log aggregation (ELK, Datadog, etc.)

---

## Database Migration Config (`alembic.ini`)

```ini
[alembic]
script_location = alembic
version_locations = %(script_location)s/versions
sqlalchemy.url = driver://user:pass@host/db

[post_write_hooks]
hooks = format
format.type = console_scripts
format.entrypoint = ruff format
format.options = %(script_filename)s
```

### Migration Environment (`alembic/env.py`)

```python
# Uses async engine for Oracle
from sqlalchemy.ext.asyncio import async_engine_from_config

def run_migrations_online():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
```

---

## CI/CD Configuration (GitHub Actions Example)

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      oracle:
        image: gvenzl/oracle-free:23-slim
        env:
          ORACLE_PASSWORD: oracle
        ports: [1521:1521]
      redis:
        image: redis:7-alpine
        ports: [6379:6379]
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: cd backend && uv sync --all-extras
      - run: cd backend && uv run pytest -v

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test:run
      - run: cd frontend && npm run lint

  docker-build:
    needs: [backend-test, frontend-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker-compose build
```

---

## Configuration Validation

### Startup Validation

The application validates configuration on startup:

```python
# In app/main.py lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Validate Oracle connection
    await oracle_pool.execute_scalar("SELECT 1 FROM DUAL")
    
    # Validate Redis connection
    await redis_client.health_check()
    
    # Log configuration summary
    logger.info("Configuration loaded", 
        pool_max=settings.ORACLE_POOL_MAX,
        cache_ttl=settings.CACHE_TTL_DEFAULT,
        diagnostics_pack=settings.HAS_DIAGNOSTICS_PACK,
    )
```

### Configuration Health Check

```bash
# Check configuration via API
curl http://localhost:8000/health

# Response includes config status
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "version": "1.0.0"
}
```

---

## Environment-Specific Configs

### Development (`.env` + `docker-compose.override.yml`)

```bash
DEBUG=true
LOG_LEVEL=DEBUG
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Staging

```bash
DEBUG=false
LOG_LEVEL=INFO
ORACLE_DSN=staging-db:1521/FREE
CORS_ORIGINS=https://staging.your-domain.com
VITE_API_URL=https://api-staging.your-domain.com
```

### Production

```bash
DEBUG=false
LOG_LEVEL=INFO
ORACLE_DSN=prod-db:1521/FREE
CORS_ORIGINS=https://your-domain.com
VITE_API_URL=https://api.your-domain.com
SECRET_KEY=<from-secret-manager>
ORACLE_PASSWORD=<from-secret-manager>
```

### Secret Management

**Docker Secrets:**
```yaml
# docker-compose.yml
secrets:
  oracle_password:
    file: ./secrets/oracle_password.txt
  secret_key:
    file: ./secrets/secret_key.txt

services:
  backend:
    secrets:
      - oracle_password
      - secret_key
    environment:
      - ORACLE_PASSWORD_FILE=/run/secrets/oracle_password
      - SECRET_KEY_FILE=/run/secrets/secret_key
```

**External Secret Stores:**
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Secret Manager

Use init containers or sidecars to inject secrets at runtime.