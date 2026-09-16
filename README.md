# Oracle Monitor Dashboard

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](docker-compose.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

A modern, full-stack **Oracle Database Monitoring Dashboard** that replicates SQL Developer's monitoring capabilities. Built with **FastAPI** (Python) backend and **React + TypeScript** frontend.

## 🎯 Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Overview: DB status, alerts, storage, sessions, I/O, waits |
| **Instance Viewer** | 7 panels: Database, Clients, Processes, Memory, Storage, CPU, Top SQL |
| **Performance Hub** | ASH Analytics: AAS charts, wait classes, drill-down, AWR reports |
| **SQL Monitor** | Real-time SQL: executions, plans, parallelism, statistics |
| **Sessions** | Active/blocked sessions, blocking tree, long operations, kill session |
| **Storage** | Tablespace gauges, capacity planning, datafiles, segments |
| **Memory** | SGA/PGA breakdown, advisor recommendations |
| **Wait Events** | System/session waits, I/O metrics, historical trends |
| **Alerts** | Alert log, threshold config, real-time threshold checking |
| **Reports** | AWR report generation (HTML/Text), snapshot history, export |

## 🏗 Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│  Backend    │────▶│ Oracle DB   │
│  (React)    │     │  (FastAPI)  │     │  (23c Free) │
│  Port 3000  │     │  Port 8000  │     │  Port 1521  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │   Redis     │
                    │  Port 6379  │
                    └─────────────┘
```

**Tech Stack:**
- **Backend:** FastAPI, python-oracledb, Redis, Celery, Pydantic, structlog
- **Frontend:** React 18, TypeScript, MUI v5, TanStack Query, Recharts
- **Infrastructure:** Docker Compose, Prometheus, Grafana, Nginx

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- 8GB+ RAM recommended
- Ports: 1521, 3000, 8000, 6379, 3001, 9090

### Start Development Environment

```bash
# Clone repository
git clone <repository-url>
cd oracle-monitor-dashboard

# Configure environment
cp .env.example .env
# Edit .env with your Oracle password and secret key

# Start all services
make dev

# Or manually:
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | admin / admin123 |
| **Backend API** | http://localhost:8000 | - |
| **API Docs** | http://localhost:8000/docs | - |
| **Grafana** | http://localhost:3001 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |

### Default Users

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | DBA (full access) |
| viewer | viewer123 | Viewer (read-only) |

## 📁 Project Structure

```
oracle-monitor-dashboard/
├── docker-compose.yml          # Production stack
├── docker-compose.override.yml # Development overrides
├── Makefile                    # Common commands
├── .env.example                # Environment template
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── api/routes/         # 12 REST modules + WebSocket
│   │   ├── core/               # Oracle queries, models, security
│   │   ├── services/           # Business logic (9 services)
│   │   ├── tasks/              # Celery background tasks
│   │   └── utils/              # Helpers
│   ├── tests/                  # Unit & integration tests
│   └── alembic/                # Database migrations
├── frontend/                   # React + TypeScript app
│   ├── src/
│   │   ├── api/hooks/          # TanStack Query hooks
│   │   ├── components/         # 26 reusable components
│   │   ├── pages/              # 13 page components
│   │   ├── context/            # React contexts
│   │   ├── theme/              # SQL Developer MUI theme
│   │   └── types/              # TypeScript interfaces
│   └── tests/                  # Unit & E2E tests
├── docs/                       # Complete documentation
├── monitoring/                 # Prometheus/Grafana config
└── scripts/                    # Database init scripts
```

## 🛠 Development

```bash
# Common commands
make help              # Show all commands
make dev               # Start development environment
make dev-logs          # Follow logs
make backend-test      # Run backend tests
make frontend-test     # Run frontend tests
make backend-lint      # Lint backend (ruff)
make frontend-lint     # Lint frontend (eslint)
make reset             # Full reset (clean + rebuild)

# Database
make db-shell          # SQL*Plus shell
```

### Coding Standards
- **Backend:** Ruff (format/lint), type hints, async/await, Pydantic models
- **Frontend:** Prettier + ESLint, strict TypeScript, TanStack Query for server state
- **Commits:** Conventional Commits (`feat(api): description`)

## 📚 Documentation

All documentation in `/docs`:

| File | Description |
|------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flows, security |
| [BACKEND_API.md](docs/BACKEND_API.md) | Complete REST API reference |
| [ORACLE_QUERIES.md](docs/ORACLE_QUERIES.md) | 40 Oracle V$ queries reference |
| [FRONTEND_COMPONENTS.md](docs/FRONTEND_COMPONENTS.md) | React components catalog |
| [TECHNICAL_REFERENCE.md](docs/TECHNICAL_REFERENCE.md) | Code-level technical reference (routes, services, hooks, contexts) |
| [ADR](docs/adr/README.md) | Architecture Decision Records (12) |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, production, scaling |
| [CONFIGURATION.md](docs/CONFIGURATION.md) | All env vars, settings |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Workflow, coding standards |
| [FEATURES.md](docs/FEATURES.md) | All 11 functional modules |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues, FAQ |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Contribution guidelines |

Every document above has a **French version** served from
[`docs/fr/`](docs/fr/) (frame files mirrored in [`docs/adr/fr/`](docs/adr/fr/)).
Each page links to its counterpart via a language banner at the top.

## ⚙️ Configuration

Key environment variables (`.env`):

```bash
# Oracle Database
ORACLE_USER=monitor
ORACLE_PASSWORD=secure_password
ORACLE_DSN=localhost:1521/FREE

# Security (REQUIRED)
SECRET_KEY=your-32-character-secret-key

# Features
HAS_DIAGNOSTICS_PACK=true   # Enable AWR/DBA_HIST queries
ENABLE_KILL_SESSION=false   # Allow session kill (DBA only)

# Thresholds
THRESHOLD_TABLESPACE_WARN=80
THRESHOLD_TABLESPACE_CRIT=90
THRESHOLD_CPU_WARN=80
THRESHOLD_CPU_CRIT=90
```

See [CONFIGURATION.md](docs/CONFIGURATION.md) for complete reference.

## 🔐 Security

- JWT authentication with access/refresh tokens
- Role-based access (DBA / Viewer)
- Parameterized Oracle queries (no SQL injection)
- bcrypt password hashing
- CORS configuration
- Helmet-style security headers via MUI

## 📊 Monitoring

- **Prometheus** metrics at `/metrics`
- **Grafana** dashboards pre-configured
- Health checks: `GET /health`
- Structured JSON logging (structlog)

## 🐳 Production Deployment

```bash
# Build production images
make prod-build

# Start production
make prod

# With SSL (via reverse proxy)
# See DEPLOYMENT.md for Nginx/Traefik config
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feat/amazing-feature`)
2. Commit changes (`git commit -m 'feat: add amazing feature'`)
3. Push to branch (`git push origin feat/amazing-feature`)
4. Open Pull Request

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- [gvenzl/oracle-free](https://github.com/gvenzl/oracle-free) - Oracle Free Docker image
- [SQL Developer](https://www.oracle.com/tools/sql-developer/) - UI inspiration
- [Oracle Documentation](https://docs.oracle.com) - V$ views reference

---

**Built with ❤️ for Oracle DBAs**