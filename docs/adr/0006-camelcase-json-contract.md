> **Language:** English · [Version française](fr/0006-camelcase-json-contract.md)

# ADR-0006 — camelCase JSON contract via `CamelModel`

**Status:** Accepted

## Context

Oracle queries return snake_case aliases (`shared_pool_free_mb`,
`snap_id_end`…), while the TypeScript frontend (and the project's REST
conventions) use camelCase (`sharedPoolFreeMB`, `snapIdEnd`…). Without a
single mechanism, each service would translate manually — a source of bugs and
naming drift between backend and frontend.

## Decision

- **`CamelModel`** in `app/core/models.py`: most Pydantic models inherit from
  it; the camelCase alias is applied at serialization time
  (`serialization_alias`) — automatic mapping `snake_case` (DB) → `camelCase`
  (JSON).
- **Frontend** declarations live in `src/types/api.ts` in camelCase, aligned
  with the Pydantic responses (e.g. `AWRSnapshot { snapId, dbid,
  instanceNumber, beginTime, endTime, durationMin, startupTime }`).
- Acknowledged exception: `useDatabases.ts` defines its **own** `DatabaseInfo`
  interface (connection metadata), distinct from the one in `types/api.ts`
  (instance info).

## Consequences

- **Positive**: single documented contract; zero manual mapping; TS types
  derived from Pydantic; DB column changes impact only one place.
- **Negative / risks**: every new response (endpoint or column) must be
  mirrored in `types/api.ts` (otherwise non-exhaustive types); camelCase
  names on the frontend must not be confused with the DB aliases in
  reports/CSV exports; the exceptions (dedicated interfaces) widen the surface
  for drift — keep them bounded.