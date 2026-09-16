> **Language:** English · [Version française](fr/TROUBLESHOOTING.md)

# Troubleshooting Guide

## Overview

This guide covers common issues, their causes, and solutions for the Oracle Monitor Dashboard.

---

## Quick Diagnostics

### Health Check Endpoints

```bash
# Overall health
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "version": "1.0.0"
}

# Metrics
curl http://localhost:8000/metrics
```

### Service Status

```bash
# Check all containers
make ps

# Or directly:
docker-compose ps

# Check specific service logs
make backend-logs
make frontend-logs
make db-logs
```

---

## Oracle Database Issues

### Oracle Container Won't Start

**Symptoms:**
- Container exits immediately
- Health check fails
- ORA-01034: ORACLE not available

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Insufficient memory | Ensure 8GB+ RAM allocated to Docker. Oracle 23c needs ~4GB minimum. |
| Port 1521 in use | Check `lsof -i :1521` and stop conflicting process |
| Corrupted volume | `docker volume rm oracle-monitor-dashboard_oracle_data` then restart |
| Invalid password | Check `ORACLE_PASSWORD` in `.env` matches Oracle requirements |

**Debug:**
```bash
# Check Oracle logs
docker logs oracle-monitor-db

# Manual health check
docker exec oracle-monitor-db sqlplus -L sys/password@//localhost:1521/FREE as sysdba @/opt/oracle/scripts/startup/healthcheck.sql
```

### Cannot Connect to Oracle

**Symptoms:**
- Backend logs: `DPI-1047: Cannot locate Oracle Client library`
- Connection timeout
- ORA-12541: TNS:no listener

**Solutions:**

```bash
# Verify Oracle is healthy
docker exec oracle-monitor-db sqlplus -L sys/password@//localhost:1521/FREE as sysdba

# Check DSN format
# Correct: host:port/service_name
# Example: oracle:1521/FREE

# Verify network connectivity
docker exec oracle-monitor-backend nslookup oracle
docker exec oracle-monitor-backend nc -zv oracle 1521

# Check Oracle listener
docker exec oracle-monitor-db lsnrctl status
```

### Oracle Query Errors

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| ORA-00942: table or view does not exist | Missing grants | Run `scripts/init-db.sql` grants |
| ORA-01031: insufficient privileges | Missing SELECT_CATALOG_ROLE | Grant SELECT_CATALOG_ROLE to monitor |
| ORA-01435: user does not exist | Monitor user not created | Run `scripts/init-db.sql` |
| ORA-12514: TNS:listener does not currently know of service | Wrong service name | Use `FREE` for Oracle Free, or check `lsnrctl status` |

**Debug Query Access:**
```bash
# Test monitor user
docker exec -it oracle-monitor-db sqlplus monitor/password@FREE

# Test specific views
SELECT * FROM v$instance;
SELECT * FROM v$session WHERE rownum < 5;
SELECT * FROM v$active_session_history WHERE rownum < 5;
```

---

## Backend Issues

### Backend Won't Start

**Symptoms:**
- Container exits with code 1
- `ModuleNotFoundError`
- `pydantic.SettingsError`

**Solutions:**

```bash
# Check logs
make backend-logs

# Common issues:
# 1. Missing .env file
cp .env.example .env
# Edit .env with required values

# 2. Invalid SECRET_KEY (must be 32+ chars)
# Generate: openssl rand -base64 32

# 3. Python path issues
# Ensure PYTHONPATH includes /app

# 4. Dependency conflicts
# Rebuild: make dev-build
```

### Database Connection Pool Exhausted

**Symptoms:**
- `Pool exhausted` errors
- Slow query responses
- `ORA-00018: maximum number of sessions exceeded`

**Solutions:**

```bash
# Check pool stats
curl http://localhost:8000/health  # Includes pool stats in logs

# Increase pool size in .env
ORACLE_POOL_MAX=50
ORACLE_POOL_MIN=5

# Check for connection leaks
# Ensure all queries use oracle_pool.acquire() context manager

# Monitor Oracle sessions
docker exec oracle-monitor-db sqlplus -s monitor/password@FREE <<EOF
SELECT COUNT(*) FROM v$session WHERE username = 'MONITOR';
EOF
```

### Redis Connection Failed

**Symptoms:**
- `Redis connection refused`
- Cache misses
- Celery tasks stuck

**Solutions:**

```bash
# Check Redis
docker exec oracle-monitor-redis redis-cli ping

# Check Redis memory
docker exec oracle-monitor-redis redis-cli INFO memory

# Restart Redis
docker-compose restart redis

# Check Celery
docker logs oracle-monitor-celery-worker
```

### Celery Tasks Not Running

**Symptoms:**
- Metrics not updating
- Threshold checks not running
- AWR snapshots not created

**Solutions:**

```bash
# Check Celery worker
docker logs oracle-monitor-celery-worker

# Check Celery beat
docker logs oracle-monitor-celery-beat

# Check Redis queues
docker exec oracle-monitor-redis redis-cli KEYS "celery*"

# Restart Celery
docker-compose restart celery-worker celery-beat

# Purge stuck tasks
docker exec oracle-monitor-redis redis-cli FLUSHALL
```

### Authentication Issues

**Symptoms:**
- 401 Unauthorized on valid credentials
- Token refresh fails
- CORS errors

**Solutions:**

```bash
# Check SECRET_KEY consistency
# Must be same across all backend instances

# Check token expiration
# Access: 30 min, Refresh: 7 days

# Clear browser storage
# localStorage.removeItem('oracle_monitor_auth')

# Check CORS origins in .env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## Frontend Issues

### Frontend Won't Load

**Symptoms:**
- Blank page
- "Network Error" in console
- Vite dev server not responding

**Solutions:**

```bash
# Check frontend logs
make frontend-logs

# Common issues:
# 1. API URL mismatch
# Check VITE_API_URL in .env matches backend URL

# 2. Port conflicts
# Frontend dev: 5173, Production nginx: 80

# 3. Build cache
docker exec oracle-monitor-frontend rm -rf node_modules/.vite

# 4. Dependencies
docker exec oracle-monitor-frontend npm ci
```

### API Calls Failing

**Symptoms:**
- 401/403 errors in Network tab
- CORS errors
- WebSocket connection failed

**Solutions:**

```bash
# Check browser Network tab
# Look for failed requests

# Common issues:
# 1. Token expired
# Auto-refresh should handle this

# 2. CORS
# Backend CORS_ORIGINS must include frontend origin

# 3. WebSocket
# Check VITE_WS_URL in .env
# Must be ws:// or wss:// protocol

# 4. Proxy (dev)
# Vite proxy in vite.config.ts must match backend port
```

### Charts Not Rendering

**Symptoms:**
- Empty chart containers
- "No data available" messages
- Recharts errors in console

**Solutions:**

```bash
# Check data format
# Open browser DevTools → Network → XHR
# Verify API response matches expected TypeScript types

# Common issues:
# 1. Empty data array
# Components show "No data available" placeholder

# 2. Wrong data types
# Ensure numbers are numbers, not strings

# 3. Missing Recharts peer dependencies
# npm install recharts

# 4. Container size
# ResponsiveContainer needs parent with defined height
```

### WebSocket Disconnections

**Symptoms:**
- Real-time updates stop
- "WebSocket disconnected" in console
- Frequent reconnects

**Solutions:**

```bash
# Check WebSocket endpoint
# Backend: ws://localhost:8000/ws/{channel}

# Common issues:
# 1. Proxy not forwarding WebSocket
# Nginx needs proxy_http_version 1.1 and upgrade headers

# 2. Firewall/proxy timeout
# Increase proxy_read_timeout

# 3. Heartbeat
# Client sends ping every 30s
# Server responds with pong
```

### Settings don't persist / dark mode resets on reload

**Symptom:** theme or auto-refresh choices reset every reload.

**Cause:** user settings live only in the browser (`localStorage` key `oracle-monitor-settings`).
Clearing site data, private mode, or a storage-quota error makes the app fall back to defaults
(`theme: 'light'`, `refreshInterval: 30`, `autoRefresh: true`). There is no server-side copy.

**Verify:**
```js
// Browser console
localStorage.getItem('oracle-monitor-settings')  // → '{"theme":"dark",...}' or null
```

**Fix:** re-select settings on the Settings page (they are written on every change). A
render-blocking theme flash at first paint (light → dark) is expected while storage loads.

---

## Performance Issues

### Slow Dashboard Loading

**Symptoms:**
- Dashboard takes >10s to load
- Timeouts on API calls
- High backend CPU

**Solutions:**

```bash
# Check query performance
# Enable slow query logging in Oracle

# Check backend metrics
curl http://localhost:8000/metrics | grep http_request_duration

# Optimize queries
# 1. Add indexes on filtered columns
# 2. Reduce data fetched (SELECT specific columns)
# 3. Increase cache TTL for stable data

# Scale backend
# docker-compose up -d --scale backend=3
```

### High Memory Usage

**Symptoms:**
- Container OOM kills
- Slow response times
- Swap usage high

**Solutions:**

```bash
# Check memory usage
docker stats

# Backend limits (docker-compose.yml)
deploy:
  resources:
    limits:
      memory: 2G
    reservations:
      memory: 1G

# Oracle limits
# Oracle Free has internal limits
# Consider Oracle SE2/EE for production

# Redis memory
# maxmemory 256mb in redis.conf
```

### Slow Oracle Queries

**Diagnosis:**
```sql
-- Find slow queries
SELECT sql_text, elapsed_time/1e6 as secs, executions
FROM v$sqlstats
WHERE elapsed_time/1e6 > 5
ORDER BY elapsed_time DESC;

-- Check execution plans
EXPLAIN PLAN FOR <query>;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
```

**Optimization:**
- Add indexes on `v$` view filter columns (limited)
- Increase `CACHE_TTL_*` for stable data
- Use materialized views for complex aggregations
- Consider Oracle Result Cache

---

## Data Issues

### Incorrect Metrics

**Symptoms:**
- Wrong values in dashboard
- Negative percentages
- Missing data points

**Causes & Solutions:**

| Issue | Cause | Solution |
|-------|-------|----------|
| Negative % used | Temp tablespace calculation | Use `v$temp_space_header` for temp |
| Zero sessions | Wrong filter | Check `type = 'USER'` filter |
| Missing ASH data | No activity | ASH only samples active sessions |
| Wrong wait times | Microseconds vs seconds | Divide `time_waited_micro` by 1,000,000 |
| Missing AWR data | Diagnostics Pack | Set `HAS_DIAGNOSTICS_PACK=false` |

### Missing Historical Data

**Symptoms:**
- No data in Performance Hub historical views
- AWR reports empty
- Capacity planning empty

**Solutions:**

```bash
# Check Diagnostics Pack
# In .env: HAS_DIAGNOSTICS_PACK=true

# Verify AWR snapshots
docker exec oracle-monitor-db sqlplus -s monitor/password@FREE <<EOF
SELECT COUNT(*) FROM dba_hist_snapshot;
EOF

# Check AWR retention
docker exec oracle-monitor-db sqlplus -s monitor/password@FREE <<EOF
SELECT * FROM dba_hist_wr_control;
EOF

# Force snapshot
docker exec oracle-monitor-db sqlplus -s monitor/password@FREE <<EOF
EXEC DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT;
EOF
```

### AWR report fails with "crosses an instance restart"

**Symptom:** generating an AWR report (Reports page) returns an error banner:
*"The selected snapshot range X-Y crosses an instance restart. Pick a range within a single startup window."*

**Cause:** the selected `snap_id_start`/`snap_id_end` bracket a database restart; Oracle raises
`ORA-20019` ("database instance re-started during specified snapshot interval") and cannot render
AWR data across the gap.

**Solution:** pick a start/end snapshot pair within a single startup window. Snapshots list each
snapshot's `startupTime` — choose a range where both snapshots share the same `startupTime`. This
is a known constraint of `DBMS_WORKLOAD_REPOSITORY`, not a bug in the dashboard.

**Backend note:** the endpoint maps `ORA-20019` (matched on `"20019"` or
`"re-started during specified snapshot interval"`) to HTTP 400; other generation failures return 500.

---

## Deployment Issues

### Docker Build Failures

**Common Errors:**

| Error | Solution |
|-------|----------|
| `no space left on device` | `docker system prune -a` |
| `failed to solve` | Check Dockerfile syntax, network connectivity |
| `permission denied` | Check file permissions, user in Dockerfile |
| `package not found` | Check package name, registry access |

### Container Restart Loops

**Diagnosis:**
```bash
# Check restart count
docker ps -a

# View logs before crash
docker logs --tail 100 <container_name>

# Common causes:
# 1. Health check failing
# 2. OOM kill
# 3. Configuration error
# 4. Dependency not ready (depends_on)
```

### Volume Permission Issues

**Symptoms:**
- Oracle can't write to data files
- Redis can't write AOF

**Solutions:**
```bash
# Fix ownership
sudo chown -R 1000:1000 ./data/oracle
sudo chown -R 999:999 ./data/redis

# Or run containers as root (not recommended)
# user: root in docker-compose.yml
```

---

## Monitoring & Alerting Issues

### Metrics Not Appearing in Monitoring Page

**Solutions:**
```bash
# Check Redis has data
docker exec oracle-monitor-redis redis-cli --no-auth-warning KEYS 'metrics:*'

# Check Celery logs for collection errors
docker logs oracle-monitor-celery-worker-1 --tail 50

# Manually trigger collection
docker exec oracle-monitor-celery-beat celery -A app.celery_app call app.tasks.collect_metrics.collect_all_metrics
```

### Host Metrics (psutil) Disabled

**Symptoms:** `host_*` metrics are absent from the Monitoring page.

**Cause:** psutil is not installed in the backend container.

**Solution:** Rebuild the backend image after adding `psutil>=5.9.0` to `pyproject.toml`.

### Threshold changes "don't stick" / revert after restart

**Symptom:** threshold values saved in Settings → Alerts are lost after a deploy or show
env defaults again.

**Cause:** overrides are persisted by the backend to `config/thresholds.json`. If the container is
recreated without preserving the `config/` directory (or the file is not in the image),
`GET /alerts/thresholds` falls back to env defaults.

**Verify:**
```bash
docker exec oracle-monitor-backend cat /app/config/thresholds.json
# → must contain {"tablespaceWarn": 85, ...}; empty/missing = defaults active
```

**Fix:** include `config/thresholds.json` in your image or volume (see
`docs/DEPLOYMENT.md` → "Config Files to Preserve"). To restore defaults, delete the file or call
`PUT /alerts/thresholds` with an empty partial payload.

---

## Debugging Checklist

### When Something Breaks

1. **Check health endpoints**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Check logs**
   ```bash
   make logs | grep -i error
   ```

3. **Verify connectivity**
   ```bash
   # Backend → Oracle
   docker exec oracle-monitor-backend nc -zv oracle 1521
   
   # Backend → Redis
   docker exec oracle-monitor-backend nc -zv redis 6379
   ```

4. **Check resource usage**
   ```bash
   docker stats --no-stream
   df -h
   ```

5. **Restart services in order**
   ```bash
   docker-compose restart redis
   docker-compose restart backend
   docker-compose restart frontend
   ```

6. **Full reset if needed**
   ```bash
   make reset
   ```

---

## Getting Help

### Log Collection for Support

```bash
# Collect all logs
mkdir -p debug_logs
make backend-logs > debug_logs/backend.log 2>&1
make frontend-logs > debug_logs/frontend.log 2>&1
make db-logs > debug_logs/oracle.log 2>&1
docker-compose ps > debug_logs/status.txt
docker stats --no-stream > debug_logs/resources.txt

# Package
tar czf debug_logs.tar.gz debug_logs/
```

### Useful Information to Include

- Docker version: `docker --version`
- Docker Compose version: `docker-compose --version`
- OS: `uname -a`
- `.env` file (redacted)
- Error messages (full stack traces)
- Steps to reproduce
- Expected vs actual behavior

---

## FAQ

### General

**Q: Can I use this with Oracle Standard Edition?**
A: Yes, but some features require Diagnostics Pack (Enterprise Edition only).

**Q: What Oracle versions are supported?**
A: 19c, 21c, 23c. Tested primarily on 23c Free.

**Q: Can I monitor multiple databases?**
A: Yes. Multi-database support is implemented: one `oracledb` pool per base, active base routed via `X-Database` header. Configure extra bases through the `DATABASES_JSON` env var (see `docs/FEATURES.md`) or the "Add database..." dialog in the header (persisted in `config/databases.json`). PRIMARY is always the `ORACLE_*` connection.

**Q: Is this production-ready?**
A: MVP status. Review security, scaling, and HA before production use.

### Licensing

**Q: Does this require Oracle Diagnostics Pack?**
A: No for real-time features. Yes for AWR historical reports, capacity planning, and memory advisors.

**Q: What about Oracle licensing?**
A: Oracle Free 23c is free for development/test. Production requires appropriate Oracle licenses.

### Security

**Q: How do I enable HTTPS?**
A: Use reverse proxy (Nginx/Traefik) with SSL termination. See DEPLOYMENT.md.

**Q: How do I rotate secrets?**
A: Update `.env`, restart backend. Use Docker secrets or external secret manager for production.

**Q: Is there audit logging?**
A: Session kill actions are logged. Add audit middleware for API calls if needed.