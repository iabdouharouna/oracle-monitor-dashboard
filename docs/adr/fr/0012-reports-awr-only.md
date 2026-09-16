> **Langue :** français · [English version](../0012-reports-awr-only.md)

# ADR-0012 — Page Reports : rapport AWR seul (pas d'ASH/Compare)

**Status:** Accepted

## Context

La page « Reports » et divers docs annonçaient « AWR/ASH reports, compare
period, CSV exports ». L'état réel du code ne propose que la génération de
**rapport AWR** (HTML/texte) via le catalogue `DBMS_WORKLOAD_REPOSITORY`
(voir ADR-0008) ; il n'existe ni générateur ASH, ni « Compare Period » dans
l'API.

## Decision

- **Périmètre de la page Reports** : liste des snapshots AWR + génération d'un
  rapport AWR (HTML ou texte) prévisualisé et exportable en fichier (Blob).
- **Documents corrigés pour refléter la réalité** (pas de fonctionnalités
  fantômes) : `README.md` (table « Features »), `docs/FEATURES.md`
  (module Reports marqué AWR-only, ASH/Compare non supportés),
  `docs/BACKEND_API.md` (suppression d'endpoints imaginaires `run-ash-report`,
  `compare`), `docs/ORACLE_QUERIES.md` (table « Diagnostics Pack Dependency »
  sans « Compare Period »), `docs/ARCHITECTURE.md`.

## Consequences

- **Positifs** : docs honnêtes (évite de « promettre » des features inexistantes),
  périmètre de code clair, moins de confusion dans les tickets.
- **Négatifs / risques** : si « ASH report » ou « Compare Period » sont
  demandés un jour, il faudra un backend/schedule et des modèles dédiés
  (à traiter via un futur ADR) ; le manque de capacité à générer un rapport en
  tâche de fond reste une limite connue (voir ADR-0008).