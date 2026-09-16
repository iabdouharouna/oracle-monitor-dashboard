> **Langue :** français · [English version](../0006-camelcase-json-contract.md)

# ADR-0006 — Contrat JSON camelCase via `CamelModel`

**Status:** Accepted

## Context

Les requêtes Oracle renvoient des alias snake_case (`shared_pool_free_mb`,
`snap_id_end`…) mais le frontend TypeScript (et les conventions REST du projet)
utilisent du camelCase (`sharedPoolFreeMB`, `snapIdEnd`…). Sans mécanisme
unique, chaque service devrait traduire manuellement — source de bugs et de
divergences de nommage entre le backend et le frontend.

## Decision

- **`CamelModel`** dans `app/core/models.py` : la plupart des modèles Pydantic
  hée du modèle ; l'alias camelCase est appliqué à la sérialisation
  (`serialization_alias`) — conversion automatique
  `snake_case` (DB) → `camelCase` (JSON).
- Le **frontend** déclare les interfaces dans `src/types/api.ts` en camelCase,
  alignées sur les réponses Pydantic (ex. `AWRSnapshot { snapId, dbid,
  instanceNumber, beginTime, endTime, durationMin, startupTime }`).
- Exception assumée : `useDatabases.ts` définit sa **propre** interface
  `DatabaseInfo` (métadonnées de connexion), distincte de celle de
  `types/api.ts` (info d'instance).

## Consequences

- **Positifs** : contrat unique et documenté ; zero mapping manuel ; types TS
  dérivés mentalement de Pydantic ; les changements de colonnes DB n'impactent
  qu'un endroit.
- **Négatifs / risques** : toute nouvelle réponse (endpoint ou colonne) doit
  être reflétée dans `types/api.ts` (sinon types non exhaustifs) ; noms en
  camelCase côté frontend à ne pas confondre avec les alias DB dans les
  rapports/export CSV ; les exceptions (interface spécifique) augmentent la
  surface de dérive — à borner.