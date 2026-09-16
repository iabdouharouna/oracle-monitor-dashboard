> **Language:** English · [Version française](fr/0012-reports-awr-only.md)

# ADR-0012 — Reports page: AWR report only (no ASH / Compare)

**Status:** Accepted

## Context

The Reports page and several docs previously advertised "AWR/ASH reports,
compare period, CSV exports". The actual code only provides **AWR report**
generation (HTML/text) via `DBMS_WORKLOAD_REPOSITORY` (see ADR-0008); there is
no ASH report generator and no "Compare Period" API.

## Decision

- **Reports scope**: list AWR snapshots + generate an AWR report (HTML or text),
  preview it, and export to a file (Blob).
- **Documentation corrected to reflect reality** (no phantom features):
  `README.md` (Features table), `docs/FEATURES.md` (Reports module marked
  AWR-only, ASH/Compare unsupported), `docs/BACKEND_API.md` (non-existent
  `run-ash-report` / `compare` endpoints removed), `docs/ORACLE_QUERIES.md`
  (Diagnostics Pack Dependency table without "Compare Period"),
  `docs/ARCHITECTURE.md`.

## Consequences

- **Positive**: honest docs (no "promised" features that do not exist), clear
  scope, less confusion in tickets and onboarding.
- **Negative / risks**: if "ASH report" or "Compare Period" are requested later,
  a dedicated backend/schedule and new models will be required (to be handled
  via a future ADR); the lack of background report generation remains a known
  limitation (see ADR-0008).