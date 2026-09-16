> **Langue :** français · [English version](../0007-thresholds-env-file-merge.md)

# ADR-0007 — seuils d'alerte : fusion `environment` + `config/thresholds.json`

**Status:** Accepted

## Context

Les seuils d'alerte (tablespace, sessions, CPU, wait) doivent être
configurables. Deux sources possibles : le fichier `.env`
(`THRESHOLD_*`) en configuration fixe, et une modification **runtime** depuis
l'UI (Settings → Alerts). Il faut une sémantique de priorité claire et une
persistance durable entre les redéploiements.

## Decision

- **8 seuils** UI (camelCase): `tablespaceWarn/Crit`, `sessionsWarn/Crit`,
  `cpuWarn/Crit`, `waitTimeMsWarn/Crit`.
- **Fusion** (`AlertService.effective_thresholds()`) : les valeurs par défaut
  viennent de l'environnement (`THRESHOLD_*`), puis les overrides runtime du
  fichier **`config/thresholds.json`** sont appliqués (le fichier **gagne**).
- **API** : `GET /alerts/thresholds` (contrat merged), `PUT /alerts/thresholds`
  (accepte un payload partiel camelCase, cast en entier, refus des booléens,
  `mk_parents + write_text` sur le fichier) ; relecture au démarrage via
  `load_persisted_thresholds()`.
- `/alerts/check` évalue en live (tablespaces → `StorageService`, sessions →
  count des sessions vs `v$parameter.sessions`, CPU → `get_cpu_ratio`).

## Consequences

- **Positifs** : réglage runtime sans rebuild, persistance durable, cascade
  locale clairement documentée (env → fichier), lecteurs cohérents avec l'API.
- **Négatifs / risques** : `thresholds.json` est un fichier runtime à préserver
  (voir `docs/DEPLOYMENT.md` et le dépannage dans `docs/TROUBLESHOOTING.md`) ;
  validation de valeurs restreinte (int) ; pas encore de multi-seuil par base
  sélectionnée.