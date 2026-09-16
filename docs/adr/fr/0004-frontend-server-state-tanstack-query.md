> **Langue :** français · [English version](../0004-frontend-server-state-tanstack-query.md)

# ADR-0004 — État serveur frontend via TanStack Query (polling, pas de WebSocket)

**Status:** Accepted

## Context

Le dashboard affiche des métriques temps réel/reçu relativement "lent"
(overview, sessions, ASH…). Deux approches : un **push temps réel** via
WebSocket (le backend expose déjà `/ws/{channel}`) ou un **pull** régulier via
requêtes HTTP classiques.

## Decision

- **TanStack Query** (`src/api/queryClient.ts`, hooks `use*` dans
  `src/api/hooks/`) pour tout état serveur :
  - `staleTime: 30 s`, `gcTime: 5 min`, `retry: 1`, pas de refetch au focus,
    refetch au reconnect ;
  - **polling** par `refetchInterval` par ressource (5 s SQL Monitor, 10 s ASH,
    15 s sessions, 30 s overview, 60 s alerts/check…), taux piloté par les
    réglages utilisateur (voir ADR-0005).
  - mutations `retry: 0` avec `invalidateQueries` en `onSuccess`.
- Le **WebSocket** (`src/api/websocket.ts`, `useWebSocket`) est **réservé** :
  présence conservée pour diffusion push future, non consommé par les pages
  actuellement (voir ADR-0010).

## Consequences

- **Positifs** : politique de cache/uniforme, invalidation déclarative,
  DSU, rollback optimistes simples, moins de complexité que du push (reconnexion,
  backpressure, absence des données au premier rendu).
- **Négatifs / risques** : latence au polling (jusqu'à l'intervalle) ; charge
  réseau augmentée par rapport à du push ; pas de notification push ; le code
  WS (valid_channels, push helpers) est du « code mort » tant qu'une page ne le
  consomme pas.