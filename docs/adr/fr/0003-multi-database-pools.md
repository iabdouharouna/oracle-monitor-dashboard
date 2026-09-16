> **Langue :** français · [English version](../0003-multi-database-pools.md)

# ADR-0003 — Support multi-base : un pool par base, routage par `X-Database`

**Status:** Accepted

## Context

Le dashboard doit pouvoir surveiller plusieurs bases Oracle (une base PRIMAIR
= `ORACLE_*`, et des bases secondaires déclarées par l'utilisateur), tout en
gardant une API et un frontend uniques. Deux options : une session unique
ouvertes vers la base active (connexions lourdes, mélange de bases), ou un
pool par base avec routage des requêtes.

## Decision

- **Un pool `oracledb` par base** (`app/core/database.py`, classe `OraclePool`)
  : la base « PRIMARY » utilise les variables `ORACLE_*` ; les bases
  secondaires sont définies via `DATABASES_JSON` (env) et le CRUD
  `/api/v1/databases` (persisté dans `config/databases.json`).
- **Routage de la base active** par header **`X-Database`**, capturé par un
  middleware dans `main.py` dans un `contextvar` ; `resolve_active_name()`
  transforme le nom demandé en pool sélectionné. Sans header → PRIMARY.
- Côté frontend, `api/dbSelection.ts` stocke la base active
  (`localStorage: selectedDatabase`) et l'intercepteur Axios ajoute
  `X-Database` à chaque requête ; le sélecteur vit dans `DatabaseSelector.tsx`
  (en-tête).

## Consequences

- **Positifs** : isolement des connexions (un pool par base), routage
  explicite, base par défaut claire, extension UI légère.
- **Négatifs / risques** : un pool naît par base déclarée (ressources côté
  backend) ; `databases.json` est un fichier runtime à préserver en backup
  (voir `docs/DEPLOYMENT.md`) ; les UDR qui ne passent pas par le V client
  (curl, scripts) doivent fournir le header explicitement.