> **Language:** English · [Version française](fr/0007-thresholds-env-file-merge.md)

# ADR-0007 — Alert thresholds: `environment` + `config/thresholds.json` merge

**Status:** Accepted

## Context

Alert thresholds (tablespace, sessions, CPU, wait) need to be configurable.
Two sources: a fixed `.env` file (`THRESHOLD_*`) and **runtime** changes
from the UI (Settings → Alerts). A clear precedence semantics and durable
persistence across re-deployments were required.

## Decision

- **8 UI thresholds** (camelCase): `tablespaceWarn/Crit`, `sessionsWarn/Crit`,
  `cpuWarn/Crit`, `waitTimeMsWarn/Crit`.
- **Merge** (`AlertService.effective_thresholds()`): defaults come from the
  environment (`THRESHOLD_*`), then runtime overrides from
  **`config/thresholds.json`** are applied (the file **wins**).
- **API**: `GET /alerts/thresholds` (merged contract), `PUT /alerts/thresholds`
  (accepts a partial camelCase payload, casts to int, rejects booleans,
  `mk_parents + write_text` to disk); re-read at startup via
  `load_persisted_thresholds()`.
- `/alerts/check` evaluates live (tablespaces → `StorageService`, sessions →
  session count vs `v$parameter.sessions`, CPU → `get_cpu_ratio`).

## Consequences

- **Positive**: runtime tuning without rebuild, durable persistence, clear
  fallback chain (env → file), readers consistent with the API.
- **Negative / risks**: `thresholds.json` is a runtime file that must be
  backed up (see `docs/DEPLOYMENT.md` and troubleshooting in
  `docs/TROUBLESHOOTING.md`); validation is limited (integers only); per-base
  threshold overrides are not yet supported.