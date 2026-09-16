> **Language:** English · [Version française](fr/0010-websocket-reserved.md)

# ADR-0010 — WebSocket: reserved broadcast channel, not consumed by the UI yet

**Status:** Accepted

## Context

The backend exposes a WebSocket endpoint (`/ws/{channel}`) alongside REST:
`ConnectionManager`, valid channels (`overview`, `sql_monitor`, `sessions`,
`performance`), ping/pong handler, and `push_*_update` broadcast helpers. On
the frontend, `src/api/websocket.ts` provides a `useWebSocket` hook (exponential
backoff reconnection, max 5 attempts, reads `VITE_WS_URL`).

## Decision

- **Real-time broadcast is reserved**; the UI exclusively uses **TanStack
  Query polling** (see ADR-0004).
- Both pieces (backend `/ws`, frontend `useWebSocket`) are **kept in reserve**:
  no component currently consumes `useWebSocket`.
- Documented conventions: channels validated against a whitelist (close code
  4004 otherwise), client-side heartbeat every 30 s.

## Consequences

- **Positive**: ready for a true push channel (alerts, Celery ↔ backend
  broadcast) without affecting the current UI; the code honours its contract
  (`import websocket` in `main.py`).
- **Negative / risks**: "dead code" on the frontend (to be used or removed to
  avoid confusion); the server ping/pong is a passive responder — real
  broadcasting will require a Celery-to-WS bridge (`app/tasks` →
  `push_*_update`); maintenance cost of an untested surface.