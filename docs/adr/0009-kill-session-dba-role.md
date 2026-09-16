> **Language:** English · [Version française](fr/0009-kill-session-dba-role.md)

# ADR-0009 — Session kill restricted to the DBA role (server-side)

**Status:** Accepted

## Context

Blocking sessions require a "kill" action. We must prevent a "VIEWER" user
(read-only) from killing a production session.

## Decision

- **Server-side enforcement**: endpoint
  `POST /api/v1/sessions/{sid}/{serial}/kill` uses the dependency
  **`get_current_dba`** — returns 403 when the role is not `DBA`. This is the
  only real access gate (the frontend should never be trusted to hide the
  action).
- **Config**: `ENABLE_KILL_SESSION` (`app/config.py`, default `false`) is a
  **documented** flag but is **not enforced by the route** (noted in
  `docs/BACKEND_API.md` and `docs/TECHNICAL_REFERENCE.md`).
- **Frontend**: the Sessions grid supports checkbox selection (ids `"sid,serial"`),
  `canKill = user?.role === 'DBA'`; the "Kill Selected (n)" button executes
  `useKillSession` in series via `mutateAsync` (the result determines the
  row state), then invalidates sessions/blocking (see ADR-0004).

## Consequences

- **Positive**: real security enforced on the server (the rule does not depend
  on the client), clear UX (button visibility driven by role).
- **Negative / risks**: if `ENABLE_KILL_SESSION=false` is not effectively
  applied (documented gap), a bad config leaves kill active — consider fixing
  or explicitly documenting this in a future release; serial `mutateAsync`
  calls may be slow for a large number of sessions.