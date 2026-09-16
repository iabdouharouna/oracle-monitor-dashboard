> **Language:** English · [Version française](fr/0001-jwt-auth-rbac.md)

# ADR-0001 — JWT authentication + role-based access control

**Status:** Accepted

## Context

The dashboard targets DBAs and read-only users (VIEWER). We needed:
- stateless authentication to allow multiple backend replicas;
- a long-lived refresh mechanism (the dashboard stays open for long periods);
- a way to distinguish destructive actions (kill session, add/remove databases)
  reserved for DBAs.

Rejected alternatives: Redis sessions (server-side state + broker to maintain),
simple API keys (no role), external OAuth2 (no IdP in scope).

## Decision

- **JWT HS256** via `app/core/security.py` (`SECRET_KEY ≥ 32 chars`).
  - access token: 30 min, claim `type: "access"`, `sub=username`.
  - refresh token: 7 days, claim `type: "refresh"`; `POST /auth/refresh`.
- **bcrypt** (12 rounds) for password hashing (`pwd_context`).
- **FastAPI dependencies**: `get_current_user` (any authenticated user),
  `get_current_dba` (requires `role == 'DBA'`, otherwise 403).
- **Protected endpoints**: `GET /auth/me`,
  `POST /sessions/{sid}/{serial}/kill`, `POST /databases`, `DELETE /databases/{name}`.
- On the frontend, the Axios interceptor (`src/api/client.ts`) attaches the
  bearer token and performs a **single-flight** refresh on 401 (pending queue
  `failedQueue`).

## Consequences

- **Positive**: stateless, horizontally scalable; clear role detection;
  transparent refresh in the UI.
- **Negative / risks**: no immediate token revocation (expiration only); the
  refresh token is passed as a `query string` on `/auth/refresh`; a weak or
  leaked secret compromises the whole platform → keep it out of the repository
  (`.env`).