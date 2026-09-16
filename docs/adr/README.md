> **Language:** English · [Version française](fr/README.md)

# Architecture Decision Records (ADR)

This folder gathers the **Architecture Decision Records (ADR)** of the
Oracle Monitor Dashboard project. Each ADR documents an important
architecture decision: the context, the decision that was made, and its
consequences.

An ADR follows the *Nygard* template (status / context / decision / consequences).

> **Languages :** this index has a [French version](fr/README.md). When adding
> an ADR, create it in both languages (`docs/adr/NNNN-slug.md` and
> `docs/adr/fr/NNNN-slug.md`).

## ADR template

Each document follows this shape:

- **Title** — the decision name.
- **Status** — `Accepted`, `Superseded by ADR-NNNN`, or `Proposed`.
- **Context** — the problem, constraints, and considered alternatives.
- **Decision** — the chosen solution (with file/code references where relevant).
- **Consequences** — positive impact, negative impact, and risks.

## ADR index

| Number | Title | Status |
|--------|-------|--------|
| [ADR-0001](0001-jwt-auth-rbac.md) | JWT authentication + role-based access control (DBA/VIEWER) | Accepted |
| [ADR-0002](0002-centralized-oracle-queries.md) | Centralized Oracle queries in `oracle_queries.py` | Accepted |
| [ADR-0003](0003-multi-database-pools.md) | Multi-database support: one pool per base, `X-Database` header routing | Accepted |
| [ADR-0004](0004-frontend-server-state-tanstack-query.md) | Frontend server state via TanStack Query (polling, not WebSocket) | Accepted |
| [ADR-0005](0005-settings-localstorage.md) | Client-side user preferences (localStorage `oracle-monitor-settings`) | Accepted |
| [ADR-0006](0006-camelcase-json-contract.md) | camelCase JSON contract via `CamelModel` | Accepted |
| [ADR-0007](0007-thresholds-env-file-merge.md) | Alert thresholds: `environment` + `config/thresholds.json` merge | Accepted |
| [ADR-0008](0008-awr-report-dbms-workload-repository.md) | AWR report generation via `DBMS_WORKLOAD_REPOSITORY` (no Celery) | Accepted |
| [ADR-0009](0009-kill-session-dba-role.md) | Session kill restricted to the DBA role (server-side) | Accepted |
| [ADR-0010](0010-websocket-reserved.md) | WebSocket: reserved broadcast channel, not consumed by the UI yet | Accepted |
| [ADR-0011](0011-dark-mode-theme.md) | Light/dark theme centralized via `createAppTheme(mode)` + SettingsContext | Accepted |
| [ADR-0012](0012-reports-awr-only.md) | Reports page: AWR report only (no ASH / Compare) | Accepted |

## Adding a new ADR

Create a new ADR following the `NNNN-slug.md` convention and add a row in
this index (`README.md`).

## When to write an ADR

An ADR is relevant when:
1. the decision is **structural** (framework choices, data flow, contracts);
2. an **alternative** was rejected and could resurface later;
3. the decision is **expensive to reverse** (breaking change, migration, API contract).