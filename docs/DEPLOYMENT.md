> **Language:** English · [Version française](fr/DEPLOYMENT.md)

# Deployment Guide

## Overview

This guide covers deploying the Oracle Monitor Dashboard in development and production environments using Docker Compose.

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 8 GB | 16+ GB |
| Disk | 20 GB | 50+ GB |
| OS | Linux/macOS/Windows | Linux |

### Software Requirements

- Docker Engine 24.0+
- Docker Compose 2.20+
- Git (for cloning)

---

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd oracle-monitor-dashboard
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

**Required variables:**
```bash
SECRET_KEY=your-32-character-secret-key-minimum
```

**Optional variables (legacy):**
```bash
# ORACLE_USER, ORACLE_PASSWORD, ORACLE_DSN are no longer used at startup.
# Databases are enrolled via the UI (Connections page) or seeded with DATABASES_JSON.
# DATABASES_JSON='[{"name":"FREE","host":"oracle","port":1521,"serviceName":"FREE","username":"monitor","password":"secret","isDefault":true}]'
```

### 3. Start Development Environment

```bash
# Build and start all services
make dev

# Or manually:
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```

### 4. Verify Deployment

```bash
# Check service status
make ps

# View logs
make dev-logs

# Access points:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# Monitoring: http://localhost:3000/monitoring
```

---

## Database Enrollment

At startup **no database is configured**. All monitored Oracle instances must be enrolled before the
monitoring pages become usable:

- **UI (default):** sign in with a DBA account and open the **Connections** page (route `/connections`,
  also reachable from the sidebar or by clicking "Add database..." in the header). The dialog tests
  connectivity first, then `POST /api/v1/databases` creates the Oracle pool immediately. The first
  enrolled database becomes the default automatically; deleting the last one returns to the initial
  "no database" state (onboarding UI).
- **Seeding (optional):** set `DATABASES_JSON` to a JSON list of connections. Seeded databases are
  immutable — they cannot be deleted from the UI (HTTP 400). If the variable is absent, the list
  starts empty.
- **Pool lifecycle:** pools are created on warm enrollment (`oracle_pool.create_pool`) and closed on
  DELETE (`drop_pool`). A pool for a database persisted in `config/databases.json` is also created
  lazily on first request if missing.
- **Zero-database behavior:** `GET /health` returns HTTP 200 with
  `{"status":"healthy","database":"not_configured"}`; the Celery tasks `collect_db_metrics`,
  `check_all_thresholds` and `create_awr_snapshot` skip cleanly; every monitoring endpoint returns
  HTTP 503 `DatabaseConnectionError` until a database is enrolled.

---

## Docker Compose Architecture

### Production Stack (`docker-compose.yml`)

```yaml
services:
  oracle:          # Oracle Database 23c Free
    image: gvenzl/oracle-free:23-slim
    ports: [1521, 5500]
    volumes: [oracle_data]
    healthcheck: SQL*Plus connectivity

  redis:           # Redis 7 Alpine
    ports: [6379]
    volumes: [redis_data]
    config: maxmemory 256mb, LRU eviction

  backend:         # FastAPI (2 workers)
    build: ./backend (production target)
    ports: [8000]
    depends_on: [redis]
    volumes: [app_config:/app/config]

  celery-worker:   # Background tasks (2 replicas)
    command: celery worker --concurrency=4
    depends_on: [backend, redis]
    volumes: [app_config:/app/config]

  celery-beat:     # Scheduler
    command: celery beat --scheduler PersistentScheduler
    volumes: [celery_beat_data, app_config:/app/config]

  frontend:        # Nginx + React build
    build: ./frontend (production target)
    ports: [3000:80]
    depends_on: [backend]
```

### Development Override (`docker-compose.override.yml`)

- Volume mounts for hot reload
- Debug logging enabled
- Frontend on port 5173 (Vite dev server)
- Backend with `--reload` flag

---

## Service Details

### Oracle Database

**Image:** `gvenzl/oracle-free:23-slim`

**Configuration:**
- Database: `FREE` (CDB)
- PDB: `FREEPDB1`
- Default users: `SYS`, `SYSTEM`, `MONITOR`
- EM Express: Port 5500

**Initialization:** Runs `scripts/init-db.sql` on first start to create monitor user and grants.

**Health Check:**
```bash
sqlplus -L sys/password@//localhost:1521/FREE as sysdba @healthcheck.sql
```

**Data Persistence:** `oracle_data` volume at `/opt/oracle/oradata`

---

### Redis

**Image:** `redis:7-alpine`

**Configuration:**
- Append-only persistence
- Max memory: 256MB
- Eviction policy: allkeys-lru
- Databases: 0 (cache), 1 (Celery broker), 2 (Celery results)

---

### Backend (FastAPI)

**Build:** Multi-stage Dockerfile
- Base: `python:3.11-slim`
- Dependencies: `uv` for fast installs
- Production: Non-root user, compiled bytecode; `/app/config` created and owned by `appuser`
  (the shared `app_config` volume is mounted here so the backend can persist `config/databases.json`)

**Environment Variables:**
```bash
ORACLE_POOL_MIN=2
ORACLE_POOL_MAX=20
REDIS_URL=redis://redis:6379/0
SECRET_KEY=${SECRET_KEY}
HAS_DIAGNOSTICS_PACK=true
DEBUG=false
LOG_LEVEL=INFO
```

> `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_DSN` are **legacy** and no longer required:
> no database exists at startup. Databases are enrolled from the UI (Connections page, DBA role) or
> seeded via the optional `DATABASES_JSON` env var (a JSON list of immutable connections). Without
> either, the frontend shows the onboarding/Connections page.

**Gunicorn Workers:** 2 (configurable via `WEB_CONCURRENCY`)

**Health Check:** `GET /health` - reports `"healthy"` with `"database":"not_configured"` when no
database is enrolled (container stays healthy); Celery tasks (`collect_db_metrics`,
`check_all_thresholds`, `create_awr_snapshot`) skip cleanly.

---

### Celery Workers

**Worker:** 2 replicas, 4 concurrency each
```bash
celery -A app.celery_app worker -l INFO --concurrency=4
```

**Beat Scheduler:** Persistent scheduler
```bash
celery -A app.celery_app beat -l INFO --scheduler celery.beat.PersistentScheduler
```

**Scheduled Tasks:**
| Task | Schedule | Description |
|------|----------|-------------|
| collect_metrics | Every 30s | Collect Oracle metrics |
| check_thresholds | Every 60s | Evaluate alert thresholds |
| generate_awr_snapshot | Daily 02:00 | Create AWR snapshot |
| cleanup_old_data | Daily 03:00 | Purge old metrics/alerts |

---

### Frontend (Nginx + React)

**Build:** Multi-stage
1. `node:20-alpine` → `npm ci` → `npm run build`
2. `nginx:alpine` → Copy `dist/` → Custom nginx config

**Nginx Config:**
- Serves static files from `/usr/share/nginx/html`
- Proxies `/api` → `backend:8000`
- Proxies `/ws` → `backend:8000` (WebSocket upgrade)
- Gzip compression enabled
- Health check endpoint `/health`

---

### Monitoring Stack

Metrics are collected internally and stored in Redis:
- **DB metrics** collected by Celery (`collect_all_metrics`), every 30s
- **API metrics** accumulated in-process and flushed every `METRICS_FLUSH_INTERVAL` (30s)
- **Host metrics** (CPU/RAM/disk via psutil) collected alongside DB metrics
- Retention: 7 days (`METRICS_RETENTION_HOURS`), up to 30k points per series
- Exposed via `GET /api/v1/metrics/history` and `GET /api/v1/metrics/available`
- Triggered alerts persisted to Redis (`alerts:history`) and shown in the Monitoring page

---

## Production Deployment

### 1. Prepare Production Environment

```bash
# On production server
mkdir -p /opt/oracle-monitor
cd /opt/oracle-monitor

# Clone repository
git clone <repo-url> .

# Generate secure secrets
openssl rand -base64 32  # For SECRET_KEY
```

### 2. Configure Production `.env`

```bash
cat > .env << EOF
# Security
SECRET_KEY=your_32_char_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis
REDIS_URL=redis://redis:6379/0

# Features
HAS_DIAGNOSTICS_PACK=true
DEBUG=false
LOG_LEVEL=INFO

# Optional: seed databases (immutable: not removable from the UI)
# DATABASES_JSON='[{"name":"FREE","host":"oracle","port":1521,"serviceName":"FREE",
#   "username":"monitor","password":"secret","isDefault":true}]'

# Frontend (build time)
VITE_API_URL=https://your-domain.com
VITE_WS_URL=wss://your-domain.com
VITE_APP_TITLE=Oracle Monitor Dashboard
EOF
```

### 3. SSL/TLS Configuration (Recommended)

**Option A: Reverse Proxy (Nginx/Traefik)**
```nginx
server {
    listen 443 ssl http2;
    server_name monitor.your-domain.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Option B: Cloud Load Balancer (AWS ALB, GCP LB, Azure Front Door)**
- Terminate SSL at load balancer
- Forward HTTP to frontend/backend
- Configure WebSocket support

### 4. Deploy Production Stack

```bash
# Build and start production
make prod

# Or manually:
docker-compose up -d --build

# Verify
make ps
make logs
```

### 5. Post-Deployment Verification

```bash
# Check all services healthy
docker-compose ps

# Test API
curl https://your-domain.com/health

# Test Frontend
curl -I https://your-domain.com

# Check metrics
curl https://your-domain.com/metrics
```

---

## Database Setup

### Option 1: Embedded Oracle (Default)

The Docker Compose includes Oracle 23c Free. Data persists in `oracle_data` volume.

**Backup:**
```bash
# Full backup
docker exec oracle-monitor-db \
  expdp monitor/password@FREE directory=DATA_PUMP_DIR dumpfile=backup.dmp full=y

# Schema backup
docker exec oracle-monitor-db \
  expdp monitor/password@FREE directory=DATA_PUMP_DIR dumpfile=schema.dmp schemas=MONITOR
```

**Restore:**
```bash
docker exec oracle-monitor-db \
  impdp monitor/password@FREE directory=DATA_PUMP_DIR dumpfile=backup.dmp full=y
```

---

### Option 2: External Oracle Database

Remove the embedded `oracle` service from `docker-compose.yml`, then enroll each external
instance from the **Connections** page (DBA role) or via the `DATABASES_JSON` env var:

```yaml
# Remove oracle service
# Backend no longer needs ORACLE_DSN: databases carry their own connection settings
backend:
  environment:
    # Optional seed of immutable connections
    - DATABASES_JSON=[{"name":"EXTERNAL","host":"your-oracle-host","port":1521,"serviceName":"YOUR_SERVICE","username":"monitor","password":"secret","isDefault":true}]
```

**Requirements:**
- Oracle 19c+ (21c/23c recommended)
- Monitor user with grants (see `scripts/init-db.sql`)
- Network connectivity from backend container
- Each enrolled database is validated upfront (the UI tests the connection, then `POST /api/v1/databases`
  creates the Oracle pool immediately); DELETE closes the pool.

---

## Scaling

### Horizontal Scaling

**Backend:**
```yaml
# docker-compose.yml
backend:
  deploy:
    replicas: 3
  # Add load balancer (nginx/traefik) in front
```

**Celery Workers:**
```yaml
celery-worker:
  deploy:
    replicas: 4  # Increase for more concurrent tasks
```

**Frontend:**
```yaml
# Static files - scale via CDN or multiple nginx replicas
frontend:
  deploy:
    replicas: 2
```

### Vertical Scaling

Adjust resource limits in `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: '4G'
        reservations:
          cpus: '2'
          memory: '2G'

  oracle:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: '8G'
```

---

## Backup & Recovery

### Config Files to Preserve

Two JSON configs are written at runtime by the backend and must be included in backups:

| File | Purpose | Created when |
|------|---------|--------------|
| `config/databases.json` | Added database connections (multi-DB) | `POST /api/v1/databases` |
| `config/thresholds.json` | Threshold overrides saved via the UI | `PUT /api/v1/alerts/thresholds` |

Both are created lazily; if a container is replaced without carrying these files, runtime-added
databases and threshold overrides are lost (env defaults and the `DATABASES_JSON` env var remain
the fallback). In the default stack, the named volume `app_config` mounted on `/app/config` in the
`backend`, `celery-worker` (x2) and `celery-beat` services shares `config/databases.json` between
all of them and persists it across container recreation.

### Automated Backups

Add to `docker-compose.yml`:

```yaml
backup:
  image: postgres:15  # or oracle backup tool
  volumes:
    - oracle_data:/data
    - ./backups:/backups
  command: >
    sh -c "while true; do
      expdp monitor/password@FREE directory=DATA_PUMP_DIR dumpfile=backup_\$(date +%Y%m%d).dmp full=y;
      sleep 86400;
    done"
```

### Volume Backup

```bash
# Backup Docker volumes
docker run --rm \
  -v oracle-monitor-dashboard_oracle_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/oracle_data_\$(date +%Y%m%d).tar.gz -C /data .

# Restore
docker run --rm \
  -v oracle-monitor-dashboard_oracle_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/oracle_data_20240115.tar.gz -C /data
```

---

## Monitoring & Alerting

### Internal Metrics

Metrics are collected, stored and visualized entirely inside the application
(no external Prometheus/Grafana dependency):

- **DB metrics** (`collect_all_metrics` Celery task): `db_cpu_pct`,
  `db_sessions_total`, `db_sessions_active`, `db_storage_pct`, `db_io_read_mbps`,
  `db_io_write_mbps`
- **API metrics** (in-process buffer, flushed every `METRICS_FLUSH_INTERVAL`):
  `api_requests_total`, `api_latency_avg_ms`, `api_errors_total`
- **Host metrics** (psutil): `host_cpu_pct`, `host_ram_pct`, `host_ram_used_mb`,
  `host_disk_pct`

All series live in Redis for 7 days by default (`METRICS_RETENTION_HOURS`) and are
available through the UI in the **Monitoring** page.

### Threshold Alerts

Threshold-based alerting is evaluated by the `check_all_thresholds` Celery task.
Triggered alerts are persisted to Redis (`alerts:history`) and displayed both in
the **Alerts** page (active checks) and the **Monitoring** page (history).

---

## Troubleshooting Deployment

### Common Issues

| Issue | Solution |
|-------|----------|
| Oracle container fails to start | Check `docker logs oracle-monitor-db`, ensure 8GB+ RAM |
| Backend can't connect to Oracle | Verify the database is enrolled (Connections page/`GET /api/v1/databases`), check host/service/credentials, Oracle health check passes |
| Frontend shows "Network Error" | Check `VITE_API_URL`, verify backend accessible |
| Celery tasks not running | Check Redis connectivity, `docker logs celery-worker` |
| Metrics not in Prometheus | Verify `/metrics` endpoint, check Prometheus targets |
| Grafana "No data" | Check datasource provisioning, Prometheus connectivity |

### Debug Commands

```bash
# Oracle
docker exec -it oracle-monitor-db sqlplus monitor/password@FREE

# Backend shell
docker exec -it oracle-monitor-backend bash

# Redis CLI
docker exec -it oracle-monitor-redis redis-cli

# Check network
docker network inspect oracle-monitor-network

# Resource usage
docker stats
```

---

## Rollback Procedure

```bash
# 1. Stop current deployment
docker-compose down

# 2. Restore database from backup
docker run --rm -v oracle_data:/data -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/oracle_data_20240115.tar.gz -C /data

# 3. Deploy previous image tag
docker-compose pull oracle-monitor-backend:v1.0.0
docker-compose up -d

# 4. Verify
make ps && make logs
```

---

## Maintenance

### Regular Tasks

| Task | Frequency | Command |
|------|-----------|---------|
| Update images | Weekly | `docker-compose pull && make prod` |
| Clean Docker | Monthly | `docker system prune -a` |
| Check disk space | Weekly | `df -h /var/lib/docker` |
| Review alerts | Daily | Grafana/Alertmanager |
| Rotate logs | Monthly | Configure logrotate |

### Log Rotation

Add to `/etc/logrotate.d/oracle-monitor`:

```
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```