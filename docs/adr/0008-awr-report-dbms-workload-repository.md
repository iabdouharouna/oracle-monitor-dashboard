> **Language:** English · [Version française](fr/0008-awr-report-dbms-workload-repository.md)

# ADR-0008 — AWR report generation via `DBMS_WORKLOAD_REPOSITORY`

**Status:** Accepted

## Context

The Reports page (AWR history) must let the user select a snapshot pair and
generate the report (HTML or text). Three options: (a) scan `dba_hist_*`
tables and build a custom report; (b) call the official Oracle package
`DBMS_WORKLOAD_REPOSITORY`; (c) offload the work to a Celery background task.

## Decision

- **Synchronous, via the official package** (`app/services/awr_service.py`):
  - snapshots: `SNAPSHOTS_QUERY` over `dba_hist_snapshot` (filtered by `:dbid`
    resolved from `v$database`, descending), with duration computed in
    **`CAST(... AS DATE)`** (`ROUND(… * 24 * 60, 1)`) because the columns are
    `TIMESTAMP` (otherwise Oracle raises `ORA-00932`); `startupTime` is
    included in the payload.
  - report: `SELECT output FROM TABLE(dbms_workload_repository.{awr_report_html|awr_report_text}(:dbid, :instance_number, :snap_start, :snap_end, :options))`
    ; the CLOB output is **concatenated** row by row.
  - known errors: `ValueError` (invalid range) → 400; `ORA-20019` (range
    crosses an instance restart) → 400 with an explicit message ("crosses an
    instance restart…") in the route `routes/performance.py`.
- The **frontend** (Reports) lists snapshots (`useAWRSnapshots`), generates
  (`useGenerateAWRReport`), previews in an iframe/pre tag, and exports to a
  Blob file.

## Consequences

- **Positive**: Oracle-conformant report, low dev cost, no home-grown logic;
  clear, deterministic restart-range error.
- **Negative / risks**: synchronous execution — a large report may exceed the
  HTTP timeout (no Celery task); depends on the Diagnostics Pack
  (`HAS_DIAGNOSTICS_PACK`); the AWR SQL lives inside the service rather than
  `oracle_queries.py` (documented exception — see ADR-0002).