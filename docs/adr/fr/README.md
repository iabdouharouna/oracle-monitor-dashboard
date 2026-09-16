> **Langue :** français · [English version](../README.md)

# Architecture Decision Records (ADR)

Ce dossier rassemble les **Architecture Decision Records** (ADR) du projet
Oracle Monitor Dashboard. Chaque ADR documente une décision d'architecture
importante : le contexte, la décision retenue, et les conséquences.

Un ADR suit le format *Nygard* (status / context / decision / consequences).

> **Langues :** cet index existe en [version anglaise](../README.md). Pour
> ajouter un ADR, le créer dans les deux langues (`docs/adr/NNNN-slug.md` et
> `docs/adr/fr/NNNN-slug.md`).

## Format d'un ADR

Chaque document suit ce gabarit :

- **Title** — le nom de la décision.
- **Status** — `Accepted` (accepté), `Superseded by ADR-NNNN` (remplacé), `Proposed`.
- **Context** — le problème, les contraintes, les alternatives considérées.
- **Decision** — la solution retenue (avec références fichier/message URL si pertinent).
- **Consequences** — les impacts positifs, négatifs, et les risques.

## Index des ADR

| Numéro | Titre | Statut |
|--------|-------|--------|
| [ADR-0001](0001-jwt-auth-rbac.md) | Authentification JWT + contrôle d'accès par rôle (DBA/VIEWER) | Accepted |
| [ADR-0002](0002-centralized-oracle-queries.md) | Centralisation des requêtes Oracle dans `oracle_queries.py` | Accepted |
| [ADR-0003](0003-multi-database-pools.md) | Support multi-base : un pool par base, routage par header `X-Database` | Accepted |
| [ADR-0004](0004-frontend-server-state-tanstack-query.md) | État serveur côté frontend via TanStack Query (polling, pas de WebSocket) | Accepted |
| [ADR-0005](0005-settings-localstorage.md) | Préférences utilisateur côté client (localStorage `oracle-monitor-settings`) | Accepted |
| [ADR-0006](0006-camelcase-json-contract.md) | Contrat JSON camelCase via `CamelModel` | Accepted |
| [ADR-0007](0007-thresholds-env-file-merge.md) | seuils d'alerte : fusion environment + `config/thresholds.json` | Accepted |
| [ADR-0008](0008-awr-report-dbms-workload-repository.md) | Génération de rapport AWR via `DBMS_WORKLOAD_REPOSITORY` (sans Celery) | Accepted |
| [ADR-0009](0009-kill-session-dba-role.md) | Kill de session restreint au rôle DBA (serveur) | Accepted |
| [ADR-0010](0010-websocket-reserved.md) | WebSocket : canal de diffusion réservé, non consommé par l'UI actuellement | Accepted |
| [ADR-0011](0011-dark-mode-theme.md) | Thème sombre/clair centralisé via `createAppTheme(mode)` + SettingsContext | Accepted |
| [ADR-0012](0012-reports-awr-only.md) | Page Reports : rapport AWR seul (pas de ASH/Compare) | Accepted |

## Nouveautés ADR

Nouveaux ADR ? suivre la convention `NNNN-slug.md` et ajouter une ligne dans
l'index `README.md` (ce fichier).

## Séquence "quand écrire un ADR"

Un ADR est pertinent quand :
1. la décision est **structurante** (choix de briques, flux de données, contrat) ;
2. une **alternative** a été écartée et pourrait resurgir ;
3. la décision **coûte cher à inverser** (breaking change, migration, contrat API).