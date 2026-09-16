> **Language:** English · [Version française](fr/0003-multi-database-pools.md)

# ADR-0003 — Multi-database support: one pool per base, `X-Database` header routing

**Status:** Accepted

## Context

The dashboard must monitor several Oracle databases (a PRIMARY base using the
`ORACLE_*` variables, plus secondary bases declared by the user) while keeping
a single API and frontend. Options: a single pooled connection opened toward
the active base (heavy connections, mixing bases), or one pool per base with
query routing.

## Decision

- **One `oracledb` pool per base** (`app/core/database.py`, `OraclePool`):
  the PRIMARY base uses the `ORACLE_*` variables; secondary bases are defined
  via `DATABASES_JSON` (env) and the `/api/v1/databases` CRUD (persisted in
  `config/databases.json`).
- **Active-base routing** via the **`X-Database`** header, captured by a
  middleware in `main.py` into a `contextvar`; `resolve_active_name()`
  translates the requested name into the selected pool. Without the header →
  PRIMARY.
- On the frontend, `api/dbSelection.ts` stores the active base
  (`localStorage: selectedDatabase`) and the Axios interceptor adds
  `X-Database` to every request; the selector lives in `DatabaseSelector.tsx`
  (header).

## Consequences

- **Positive**: connection isolation (one pool per base), explicit routing,
  clear default base, lightweight UI extension.
- **Negative / risks**: a pool is created per declared base (backend
  resources); `databases.json` is a runtime file that must be included in
  backups (see `docs/DEPLOYMENT.md`); callers that bypass the client (curl,
  scripts) must provide the header explicitly.