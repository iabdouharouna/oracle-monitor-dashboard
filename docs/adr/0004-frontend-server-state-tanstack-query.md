> **Language:** English · [Version française](fr/0004-frontend-server-state-tanstack-query.md)

# ADR-0004 — Frontend server state via TanStack Query (polling, not WebSocket)

**Status:** Accepted

## Context

The dashboard displays near-real-time or "semi-real-time" metrics (overview,
sessions, ASH…). Two approaches: **real-time push** over WebSocket (the backend
already exposes `/ws/{channel}`) or a **pull** model over regular HTTP requests.

## Decision

- **TanStack Query** (`src/api/queryClient.ts`, `use*` hooks in
  `src/api/hooks/`) for all server state:
  - `staleTime: 30 s`, `gcTime: 5 min`, `retry: 1`, no refetch on window
    focus, refetch on reconnect;
  - **polling** via per-resource `refetchInterval` (5 s SQL Monitor, 10 s ASH,
    15 s sessions, 30 s overview, 60 s alerts/check…), tuned by the user
    settings (see ADR-0005);
  - mutations with `retry: 0` and `invalidateQueries` in `onSuccess`.
- The **WebSocket** (`src/api/websocket.ts`, `useWebSocket`) is **reserved**:
  kept for a future push channel, not consumed by any page today
  (see ADR-0010).

## Consequences

- **Positive**: uniform caching policy, declarative invalidation,
  offline/retry semantics, simple optimistic rollbacks, less complexity than
  push (reconnection, backpressure, missing first-paint data).
- **Negative / risks**: polling latency (up to the interval); more network
  traffic than push; no push notifications; the WS code (valid_channels,
  push helpers) is "dead code" until a page consumes it.