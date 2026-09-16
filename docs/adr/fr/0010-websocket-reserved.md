> **Langue :** français · [English version](../0010-websocket-reserved.md)

# ADR-0010 — WebSocket : canal réservé, non consommé par l'UI actuellement

**Status:** Accepted

## Context

Le backend expose un endpoint WebSocket (`/ws/{channel}`) en plus du REST :
`ConnectionManager`, canaux valides (`overview`, `sql_monitor`, `sessions`,
`performance`), bouchon ping/pong, helpers `push_*_update` (diffusion).
Côté frontend, `src/api/websocket.ts` fournit une hook `useWebSocket`
(reconnexion backoff, 5 essais max, `VITE_WS_URL`).

## Decision

- Le système de diffusion **temps réel réservé** et l'UI utilise exclusivement
  le **polling TanStack Query** (voir ADR-0004).
- Les deux briques (backend `/ws`, frontend `useWebSocket`) sont **conservées
  en réserve** : aucun composant ne consomme aujourd'hui `useWebSocket`.
- Conventions documentées : canaux validés sur liste blanche (close code 4004
  sinon), heartbeat ping/pong côté client (30 s).

## Consequences

- **Positifs** : préparation pour un vrai push (alerts, refresh-broadcast Celery↔backend)
  sans impact sur l'UI actuelle ; code honore le contrat (import `from app.api
  import websocket` in `main.py`).
- **Négatifs / risques** : « code mort » côté UI (à faire vivre ou à retirer pour
  éviter la confusion) ; le bump/pong backend est un répondeur passif — une
  vraie diffusion demandera un pont Celery→WS (`app/tasks` → `push_*_update`) ;
  coût de maintenance d'une surface non testée.