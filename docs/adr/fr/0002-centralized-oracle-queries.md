> **Langue :** français · [English version](../0002-centralized-oracle-queries.md)

# ADR-0002 — Centralisation des requêtes Oracle dans `oracle_queries.py`

**Status:** Accepted

## Context

Le backend repose sur ~40 requêtes SQL vers le catalogue `V$`/`DBA_HIST`.
Sans centralisation, chaque service écrirait son SQL inline : duplication,
dérive des conventions de nommage, risque d'injection par concaténation,
et revue de sécurité difficile.

## Decision

- Toutes les requêtes résident dans **`app/core/oracle_queries.py`** en
  **40 constantes** (ex. `INSTANCE_INFO`, `SESSIONS`, `MEMORY_METRICS`,
  `AWR_TOP_SQL`) + le constructeur `get_drilldown_query(dimension, filter_dimension)`.
- Conventions :
  - **bind variables** (`:param`) systématiques — aucune concaténation côté Python ;
  - alias **snake_case** (transformés en camelCase par `CamelModel` à la sortie — voir ADR-0006) ;
  - `FETCH FIRST n ROWS ONLY` pour limiter les résultats ;
  - filtres `V$` `type = 'USER'` cohérents.
- Les services consomment via `OraclePool.execute_query(sql, params)` / `execute_scalar`.

## Consequences

- **Positifs** : SQL réutilisable, homogène et auditable en un seul fichier ;
  revue SQL (grants, plans) concentrée ; requêtes testables unitairement.
- **Négatifs / risques** : changements de schéma Oracle nécessitent de mettre à
  jour la constante ; certains SQL (AWR — voir ADR-0008) vivent hors du fichier
  car ils sont dynamiques (nom de fonction injecté) ; il faut vérifier les
  usages réels d'une constante avant de la modifier (ex. `AWR_SNAPSHOTS` n'est
  pas référencée par le service AWR).