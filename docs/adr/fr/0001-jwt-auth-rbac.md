> **Langue :** français · [English version](../0001-jwt-auth-rbac.md)

# ADR-0001 — Authentification JWT + contrôle d'accès par rôle

**Status:** Accepted

## Context

Le dashboard s'adresse à des DBA et à des utilisateurs en lecture seule
(VIEWER). Il fallait :
- une authentification sans état (stateless) pour permettre plusieurs réplicas backend ;
- un mécanisme de refresh long durée (le dashboard reste ouvert) ;
- distinguer les actions destructrices (kill de session, ajout/suppression
  de base) réservées au DBA.

Alternatives écartées : sessions Redis (état serveur + brokers à maintenir),
API-Key simple (pas de rôle), OAuth2 externe (pas d'IdP dans le scope).

## Decision

- **JWT HS256** via `app/core/security.py` (`SECRET_KEY ≥ 32 chars`).
  - access token : 30 min, claim `type: "access"`, `sub=username`.
  - refresh token : 7 jours, claim `type: "refresh"` ; `POST /auth/refresh`.
- **bcrypt** (12 rounds) pour les mots de passe (`pwd_context`).
- **Dépendances FastAPI** : `get_current_user` (tout utilisateur authentifié),
  `get_current_dba` (exige `role == 'DBA'`, 403 sinon).
- **Endpoints protégés** : `GET /auth/me`, `POST /sessions/{sid}/{serial}/kill`,
  `POST /databases`, `DELETE /databases/{name}`.
- Côté frontend, l'intercepteur Axios (`src/api/client.ts`) applique le bearer
  et fait le refresh **single-flight** sur 401 (file d'attente `failedQueue`).

## Consequences

- **Positifs** : stateless, scalable horizontalement ; détection claire du rôle ;
  refresh transparent côté UI.
- **Négatifs / risques** : pas de révocation immédiate des tokens (expiration
  uniquement) ; le refresh token transite en `query string` sur `/auth/refresh` ;
  un secret faible ou volé compromet toute la plateforme → le garder hors du
  repository (`.env`).