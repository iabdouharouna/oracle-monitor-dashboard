> **Langue :** français · [English version](../0008-awr-report-dbms-workload-repository.md)

# ADR-0008 — Génération de rapport AWR via `DBMS_WORKLOAD_REPOSITORY`

**Status:** Accepted

## Context

La page Reports (historique AWR) doit permettre de sélectionner un couple de
snapshots et de générer le rapport (HTML ou texte). Trois options : (a)
parcourir `dba_hist_*` et reconstruire un rapport « maison » ; (b) appeler le
package Oracle `DBMS_WORKLOAD_REPOSITORY` ; (c) générer la demande en tâche
Celery asynchrone.

## Decision

- **Synchrone et via le package officiel** (`app/services/awr_service.py`) :
  - snapshots : `SNAPSHOTS_QUERY` sur `dba_hist_snapshot` (filtré par `:dbid`
    résolu depuis `v$database`, tri DESC), avec **durée calculée en
    `CAST(... AS DATE)`** (`ROUND(… * 24 * 60, 1)`) car les colonnes sont des
    TIMESTAMP (Oracle lève `ORA-00932` sinon), et `startupTime` exposé.
  - rapport : `SELECT output FROM TABLE(dbms_workload_repository.{awr_report_html|awr_report_text}(:dbid, :instance_number, :snap_start, :snap_end, :options))`
    ; la sortie CLOB est **concaténée** ligne à ligne.
  - erreurs connues : `ValueError` (rangée invalide) → 400 ; `ORA-20019`
    (intervalle traversant un restart) → 400 avec message explicite
    ("crosses an instance restart…") dans la route `routes/performance.py`.
- Le **frontend** (Reports) liste les snapshots (`useAWRSnapshots`), génère
  (`useGenerateAWRReport`), affiche en iframe/pre et exporte en Blob.

## Consequences

- **Positifs** : rapport conforme Oracle, coût de dev faible, pas de Décision
  métier maison ; erreur de restart clair et déterministe.
- **Négatifs / risques** : exécution synchrone — un gros rapport peut dépasser
  le timeout HTTP (pas de tâche Celery) ; dépend du Diagnostics Pack
  (`HAS_DIAGNOSTICS_PACK`) ; SQL embarqué dans le service plutôt que dans
  `oracle_queries.py` (exception documentée — voir ADR-0002).