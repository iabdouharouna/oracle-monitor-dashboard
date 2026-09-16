> **Langue :** français · [English version](../0009-kill-session-dba-role.md)

# ADR-0009 — Kill de session restreint au rôle DBA (serveur)

**Status:** Accepted

## Context

Les sessions bloquantes nécessitent une option « kill ». Il faut éviter qu'un
utilisateur « VIEWER » (lecture seule) ne puisse tuer une session en production.

## Decision

- **Enforcement côté serveur** : l'endpoint `POST /api/v1/sessions/{sid}/{serial}/kill`
  utilise la dépendance **`get_current_dba`** — renvoie 403 si le rôle
  n'est pas `DBA`. C'est la seule vraie porte d'accès (le frontend n'est jamais
  tenu de cacher l'action).
- **Config** : `ENABLE_KILL_SESSION` (`app/config.py`, défaut `false`) est un
  flag **documenté** mais **non renforcé par la route** (documenté dans
  `docs/BACKEND_API.md` et `docs/TECHNICAL_REFERENCE.md`).
- **Frontend** : la grille Sessions sélectionne en checkbox (ids `"sid,serial"`),
  `canKill = user?.role === 'DBA'` ; le bouton « Kill Selected (n) » exécute
  `useKillSession` en série via `mutateAsync` (le résultat détermine l'état des
  rangées) puis invalide sessions/blocking (voir ADR-0004).

## Consequences

- **Positifs** : sécurité réelle côté serveur (la règle ne dépend pas du client),
  UX claire (bouton visible selon rôle).
- **Négatifs / risques** : si `ENABLE_KILL_SESSION=false` n'est pas
  effectivement appliqué (gap documenté), un mauvais réglage laisse le kill
  actif — à corriger ou documenter explicitement dans une release future ;
  kill en boucle `mutateAsync` peut être lent sur un grand nombre de
  sessions.