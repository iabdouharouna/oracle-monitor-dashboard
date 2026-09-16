> **Language:** English · [Version française](fr/0002-centralized-oracle-queries.md)

# ADR-0002 — Centralized Oracle queries in `oracle_queries.py`

**Status:** Accepted

## Context

The backend relies on ~40 SQL queries against the `V$`/`DBA_HIST` catalog.
Without centralization every service would write its own inline SQL:
duplication, drift in naming conventions, injection risk from string
concatenation, and an unwieldy security review.

## Decision

- All queries live in **`app/core/oracle_queries.py`** as **40 constants**
  (e.g. `INSTANCE_INFO`, `SESSIONS`, `MEMORY_METRICS`, `AWR_TOP_SQL`) plus the
  `get_drilldown_query(dimension, filter_dimension)` builder.
- Conventions:
  - mandatory **bind variables** (`:param`) — no string concatenation in Python;
  - **snake_case** aliases (converted to camelCase by `CamelModel` on output —
    see ADR-0006);
  - `FETCH FIRST n ROWS ONLY` to cap result sets;
  - consistent `V$ type = 'USER'` filters.
- Services consume them through `OraclePool.execute_query(sql, params)` /
  `execute_scalar`.

## Consequences

- **Positive**: reusable, homogeneous, auditable SQL in a single file;
  concentrated SQL review (grants, plans); queries unit-testable.
- **Negative / risks**: an Oracle schema change requires updating the constant;
  some dynamically-shaped SQL (AWR — see ADR-0008) lives outside the file;
  check actual usages before modifying a constant (e.g. `AWR_SNAPSHOTS` is not
  referenced by the AWR service).