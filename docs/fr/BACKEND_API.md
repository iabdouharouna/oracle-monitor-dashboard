> **Langue :** français · [English version](../BACKEND_API.md)

# Documentation de l'API Backend

## Vue d'ensemble

Le backend de l'Oracle Monitor Dashboard expose une API RESTful construite avec FastAPI. Tous les endpoints sont préfixés par `/api/v1` et suivent la spécification OpenAPI 3.0.

## URL de base

```
Développement : http://localhost:8000/api/v1
Production :    https://your-domain.com/api/v1
```

## Authentification

Les endpoints utilisent des jetons OAuth2 Bearer (JWT, HS256). Les endpoints protégés sont :

- `GET /auth/me` — `get_current_user`
- `POST /sessions/{sid}/{serial}/kill` — `get_current_dba` (nécessite le rôle `DBA`, sinon 403)
- `POST /databases` — `get_current_dba`
- `DELETE /databases/{database_name}` — `get_current_dba`

Toutes les autres routes ne sont pas protégées au niveau de la route.

```
Authorization: Bearer <access_token>
```

### Types de jetons

| Jeton | Durée de vie | Utilisation |
|-------|-------------|-------------|
| Access Token | 30 minutes | Requêtes API |
| Refresh Token | 7 jours | Renouvellement de jeton |

### Réponses d'erreur

```json
// 401 Unauthorized
{
  "detail": "Could not validate credentials",
  "code": "AUTHENTICATION_ERROR"
}

// 403 Forbidden
{
  "detail": "DBA role required",
  "code": "AUTHORIZATION_ERROR"
}

// 404 Not Found
{
  "detail": "Tablespace not found",
  "code": "NOT_FOUND"
}

// 422 Validation Error
{
  "detail": "Invalid threshold value",
  "code": "VALIDATION_ERROR"
}

// 503 Service Unavailable
// Levé par les endpoints de monitoring quand aucune base n'est enrolée/disponible
{
  "detail": "No database configured: enroll a database first",
  "code": "DATABASE_CONNECTION_ERROR"
}

// 500 Internal Error
{
  "detail": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

---

## Référence des endpoints

### Authentification

#### POST `/auth/login`
Connexion avec identifiant/mot de passe.

**Requête :**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Réponse (200) :**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "DBA",
    "is_active": true
  }
}
```

#### POST `/auth/refresh`
Rafraîchir le jeton d'accès à l'aide du refresh token.

**En-têtes :**
```
Authorization: Bearer <refresh_token>
```

**Réponse (200) :**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### GET `/auth/me`
Obtenir les informations de l'utilisateur courant.

**Réponse (200) :**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "role": "DBA",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### POST `/auth/logout`
Déconnexion (suppression du jeton côté client).

---

### Vue d'ensemble

#### GET `/overview`
Données agrégées du tableau de bord.

**Réponse (200) :**
```json
{
  "database": {
    "name": "ORCL",
    "version": "23.0.0.0.0",
    "host": "prod-db",
    "platform": "Linux x86_64",
    "status": "OPEN",
    "role": "PRIMARY",
    "startup_time": "2024-01-10 08:00:00",
    "uptime_seconds": 432000
  },
  "alerts": {
    "critical": 2,
    "warning": 5,
    "info": 0,
    "last_checked": "2024-01-15T10:30:00Z"
  },
  "storage": {
    "total_gb": 500.5,
    "used_gb": 380.2,
    "free_gb": 120.3,
    "pct_used": 75.9,
    "tablespace_count": 12,
    "critical_tablespaces": 1
  },
  "sessions": {
    "total": 145,
    "active": 23,
    "inactive": 120,
    "blocked": 2,
    "pct_active": 15.8
  },
  "io": {
    "read_mbps": 45.2,
    "write_mbps": 12.8,
    "read_iops": 1250,
    "write_iops": 480,
    "avg_read_latency_ms": 3.2,
    "avg_write_latency_ms": 1.8
  },
  "waits": {
    "top_wait_classes": [
      {"wait_class": "User I/O", "waits_per_sec": 1250, "time_waited_ms": 45000, "pct_db_time": 45.2},
      {"wait_class": "System I/O", "waits_per_sec": 320, "time_waited_ms": 8500, "pct_db_time": 12.1}
    ],
    "total_waits_per_sec": 1850,
    "db_time_per_sec": 2.5
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### GET `/overview/timeseries`
Métriques historiques pour les sparklines.

**Paramètres de requête :**
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| hours | integer | 24 | Heures d'historique |

**Réponse (200) :**
```json
{
  "timestamps": ["2024-01-14T10:00:00Z", "2024-01-14T11:00:00Z", ...],
  "series": {
    "cpu_usage": [45.2, 48.1, ...],
    "sessions_active": [23, 28, ...],
    "physical_reads_mbps": [45.2, 52.3, ...]
  }
}
```

---

### Visualiseur d'instance

#### GET `/instance/info`
Informations sur l'instance de la base de données.

#### GET `/instance/clients`
Sessions regroupées par machine/programme/module.

#### GET `/instance/processes`
Métriques des processus (nombre, taux, curseurs).

#### GET `/instance/memory`
Décomposition SGA/PGA et ratios de hit du cache.

#### GET `/instance/storage`
 tablespaces, journaux de redolog, taux d'archivage.

#### GET `/instance/cpu-ratio`
Utilisation CPU BD vs CPU OS.

#### GET `/instance/top-sql`
Requêtes SQL les plus gourmandes par CPU/temps écoulé/gets buffer.

**Paramètres de requête :**
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| limit | integer | 10 | Nombre de requêtes SQL |

#### GET `/instance/all`
Données complètes du visualiseur d'instance (tous les panneaux).

---

### Performance Hub (ASH Analytics)

#### GET `/performance/ash/aas`
Série temporelle des sessions actives moyennes.

**Paramètres de requête :**
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| hours | float | 1 | Heures d'historique (0.083-24) |
| dimension | string | wait_class | Grouper par dimension |

**Dimensions :** `wait_class`, `event`, `sql_id`, `username`, `machine`, `module`, `action`

#### GET `/performance/ash/top-sql`
Top SQL par échantillons ASH.

#### GET `/performance/ash/wait-classes`
Décomposition des classes d'attente avec pourcentages.

#### GET `/performance/ash/drilldown`
Données de drill-down pour les tableaux secondaires.

**Paramètres de requête :**
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| dimension | string | wait_class | Dimension principale |
| filter_dimension | string | sql_id | Dimension de filtre |
| hours | float | 1 | Heures d'historique |

#### GET `/performance/awr/snapshots`
Liste des snapshots AWR (nécessite le Diagnostics Pack). Renvoie les 30 derniers jours de snapshots pour la
base de données courante (`dbid` résolu depuis `v$database`).

**Réponse (200) :**
```json
[
  {
    "snapId": 84,
    "dbid": 1509902213,
    "instanceNumber": 1,
    "beginTime": "2026-09-14 10:00:00",
    "endTime": "2026-09-14 10:30:00",
    "durationMin": 30.0,
    "startupTime": "2026-09-01 08:00:00"
  }
]
```
- `durationMin` est calculé comme `(CAST(end_interval_time AS DATE) - CAST(begin_interval_time AS DATE)) * 24 * 60`
  (les colonnes brutes sont de type `TIMESTAMP` — leur soustraction produit un intervalle et `ROUND(...)` dessus échoue
  avec `ORA-00932`).
- `startupTime` permet à l'interface de détecter les fenêtres de démarrage de l'instance.

#### GET `/performance/awr/report`
Générer un rapport AWR pour une plage de snapshots.

**Paramètres de requête :**
| Paramètre | Type | Description |
|-----------|------|-------------|
| snap_id_start | integer | ID du snapshot de début (obligatoire) |
| snap_id_end | integer | ID de fin du snapshot (obligatoire, doit être > début) |
| report_type | string | `html` (par défaut) ou `text` |

**Réponse (200) :** le rapport généré (HTML ou texte brut), plus les métadonnées :
```json
{
  "html": "<!DOCTYPE html><html>...AWR Report...</html>",
  "dbid": 1509902213,
  "instanceNumber": 1,
  "snapIdStart": 84,
  "snapIdEnd": 85,
  "generatedAt": "2026-09-16T10:30:00Z",
  "reportType": "html"
}
```

**Erreur : redémarrage d'instance dans la plage (400) :**
`DBMS_WORKLOAD_REPOSITORY` lève une **ORA-20019** lorsque la plage de snapshots sélectionnée traverse un
redémarrage d'instance. Le backend la convertit en un HTTP 400 convivial :

```json
{
  "detail": "The selected snapshot range 89-91 crosses an instance restart. Pick a range within a single startup window."
}
```

La détection identifie le texte d'erreur `"20019"` ou `"re-started during specified snapshot interval"`.
Tout autre échec renvoie un HTTP 500 avec `"AWR report generation failed: ..."`.

> L'implémentation utilise `TABLE(dbms_workload_repository.awr_report_html(...))` /
> `awr_report_text(...)`. Le package renvoie le rapport sous forme de CLOB réparti sur plusieurs lignes ; le backend
> concatène la colonne `output` de chaque ligne en une seule chaîne.

---

### SQL Monitor

#### GET `/sql-monitor/active`
Exécutions SQL monitorées en temps réel.

**Réponse (200) :**
```json
[
  {
    "sql_id": "abc123def456",
    "sql_exec_id": 1678901234,
    "status": "EXECUTING",
    "duration_sec": 45.2,
    "cpu_time_sec": 38.5,
    "io_time_sec": 6.7,
    "sql_text": "SELECT * FROM large_table WHERE ...",
    "username": "APP_USER",
    "module": "batch_process",
    "px_servers": 8,
    "start_time": "2024-01-15T10:25:00",
    "last_refresh_time": "2024-01-15T10:30:15"
  }
]
```

#### GET `/sql-monitor/detail`
Entrée détaillée du SQL monitor avec plan d'exécution.

**Paramètres de requête :**
| Paramètre | Type | Description |
|-----------|------|-------------|
| sql_id | string | Identifiant SQL |
| sql_exec_id | integer | Identifiant d'exécution |

#### GET `/sql-monitor/plan`
Plan d'exécution (format tabulaire).

#### GET `/sql-monitor/history`
SQL monitor historique (nécessite le Diagnostics Pack).

---

### Sessions

#### GET `/sessions`
Sessions actives avec filtrage.

**Paramètres de requête :**
| Paramètre | Type | Description |
|-----------|------|-------------|
| status | string | `ACTIVE`, `INACTIVE`, `KILLED` |
| username | string | Filtrer par nom d'utilisateur |
| machine | string | Filtrer par machine (LIKE) |
| min_duration | integer | last_call_et minimum (secondes) |

**Réponse (200) :**
```json
[
  {
    "sid": 123,
    "serial": 45678,
    "username": "APP_USER",
    "machine": "app-server-01",
    "program": "JDBC Thin Client",
    "module": "order_processing",
    "logon_time": "2024-01-15T08:00:00",
    "last_call_et": 120,
    "status": "ACTIVE",
    "state": "WAITING",
    "wait_class": "User I/O",
    "event": "db file sequential read",
    "seconds_in_wait": 5,
    "blocking_session": null,
    "sql_id": "abc123def456",
    "pga_allocated_mb": 25.4,
    "pga_used_mb": 18.2
  }
]
```

#### GET `/sessions/blocking`
Chaînes de sessions bloquantes.

#### GET `/sessions/long-ops`
Opérations de longue durée (V$SESSION_LONGOPS).

#### POST `/sessions/{sid}/{serial}/kill`
Tuer une session (nécessite le rôle DBA — 403 pour le rôle `VIEWER`).

Exécute `ALTER SYSTEM KILL SESSION '{sid},{serial}' IMMEDIATE`.

**Réponse (200) :**
```json
{
  "message": "Session killed successfully"
}
```

Sur le frontend, la page Sessions expose un bouton **"Kill Selected (n)"** (uniquement pour les utilisateurs dont le
rôle est `DBA`) : l'utilisateur sélectionne des lignes de session dans le `DataTable` (les identifiants de sélection sont `sid,serial`),
et le client boucle sur la mutation de kill pour chaque paire sélectionnée, puis efface la sélection.

---

### Bases de données

Endpoints d'enrôlement des bases de données. Nécessitent le rôle DBA (`get_current_dba`, 403 pour `VIEWER`).
Au démarrage, aucune base n'est configurée ; enroler les instances depuis la page Connections de l'IHM (route `/connections`)
ou les initialiser via la variable d'env `DATABASES_JSON`.

#### GET `/databases`
Liste le catalogue effectif : connexions depuis `DATABASES_JSON` fusionnées avec le fichier persisté
`config/databases.json` (`connections.get_catalog()`). Sans rien configurer, la liste est vide.

**Réponse (200) :**
```json
[
  {
    "name": "FREE",
    "host": "oracle",
    "port": 1521,
    "service": "FREE",
    "username": "monitor",
    "is_default": true,
    "is_active": true
  }
]
```

#### POST `/databases`
Envôle une nouvelle base Oracle supervisée. La connectivité est testée d'abord ; en cas de succès, le pool Oracle dédié
est créé immédiatement (`oracle_pool.create_pool`, dans `routes/databases.py`) et la connexion est persistée
dans `config/databases.json`. La première base enrolée devient automatiquement la base par défaut.

**Requête :**
```json
{
  "name": "FREE2",
  "host": "oradb-free",
  "port": 1521,
  "service": "freepdb1",
  "username": "monitor",
  "password": "secret",
  "is_default": false
}
```

**Réponse (200) :** la connexion créée (mot de passe omis).

#### DELETE `/databases/{database_name}`
Retire une base enrolée : le pool est fermé (`oracle_pool.drop_pool`) et la connexion est supprimée.

- **400** si la base a été initialisée via `DATABASES_JSON` (connexions initialisées = immuables — non supprimables depuis l'IHM).
- Supprimer la dernière base ramène l'application à l'état « aucune base » (onboarding).

---

### Stockage

#### GET `/storage/tablespaces`
Tous les tablespaces avec leur utilisation.

**Réponse (200) :**
```json
[
  {
    "name": "USERS",
    "type": "PERMANENT",
    "status": "ONLINE",
    "size_mb": 10240,
    "used_mb": 8192,
    "free_mb": 2048,
    "pct_used": 80.0,
    "autoextensible": true,
    "max_size_mb": 20480
  }
]
```

#### GET `/storage/tablespaces/{name}`
Tablespace détaillé avec datafiles, segments, tendance de croissance.

#### GET `/storage/capacity`
Projections de planification de capacité.

---

### Mémoire

#### GET `/memory/sga-advice`
Recommandations du SGA Target Advisor.

#### GET `/memory/pga-advice`
Recommandations du PGA Target Advisor.

#### GET `/memory/memory-target-advice`
Memory Target Advisor (AMM).

#### GET `/memory/all`
Tous les conseillers mémoire combinés.

---

### Événements d'attente

#### GET `/waits/system`
Événements d'attente système (V$SYSTEM_EVENT, non-idle).

#### GET `/waits/session`
Attentes de session courantes (V$SESSION_WAIT).

#### GET `/waits/io-metrics`
Métriques I/O depuis V$SYSMETRIC.

#### GET `/waits/history`
Métriques historiques depuis V$SYSMETRIC_HISTORY.

**Paramètres de requête :**
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| hours | float | 24 | Heures d'historique |

---

### Alertes

#### GET `/alerts/log`
Entrées du journal d'alertes.

**Paramètres de requête :**
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| hours | float | 24 | Heures d'historique |
| limit | integer | 100 | Nombre max d'entrées |

#### GET `/alerts/thresholds`
Configuration des seuils courants (effectif : defaults env fusionnés avec `config/thresholds.json`).

```json
{
  "tablespaceWarn": 80,
  "tablespaceCrit": 90,
  "sessionsWarn": 70,
  "sessionsCrit": 85,
  "cpuWarn": 80,
  "cpuCrit": 90,
  "waitTimeMsWarn": 100,
  "waitTimeMsCrit": 500
}
```

#### PUT `/alerts/thresholds`
Mettre à jour la configuration des seuils. Accepte des payloads partiels ; chaque clé valide est fusionnée dans le
fichier `config/thresholds.json` persisté (créé au premier appel) et la configuration effective complète est renvoyée.

**Requête :**
```json
{
  "cpuWarn": 82,
  "cpuCrit": 93
}
```

**Réponse (200) :** la configuration fusionnée complète (même structure que `GET`, montrant les valeurs
nouvellement enregistrées). La réponse est consommée par la page Alertes, qui affiche également un Snackbar succès/erreur.

> Détails de la persistance : les clés sont validées contre un ensemble fixe, seules les valeurs numériques non booléennes sont
> acceptées, le fichier est écrit avec `mkdir(parents=True, exist_ok=True)` et un
> message log `"THRESHOLDS_FILE: saved"` est émis. Les valeurs non entières sont ignorées à la lecture.

#### GET `/alerts/check`
Vérifier les seuils courants par rapport aux métriques en temps réel.

---

### Exports

#### GET `/exports/sessions/csv`
Exporter les sessions en CSV.

#### GET `/exports/tablespaces/csv`
Exporter les tablespaces en CSV.

#### GET `/exports/sql-monitor/csv`
Exporter le SQL monitor en CSV.

---

### WebSocket

#### WS `/ws/{channel}`
Mises à jour en temps réel via WebSocket.

**Canaux :**
- `overview` - KPIs du tableau de bord, alertes
- `sql_monitor` - Changements du SQL monitor
- `sessions` - Connexion/déconnexion/blocage de sessions
- `performance` - Points de données AAS (throttled 5s)

**Format de message :**
```json
{
  "type": "overview_update",
  "payload": { ... },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Heartbeat du client :**
```json
// Le client envoie
{"type": "ping", "data": "heartbeat"}

// Le serveur répond
{"type": "pong", "data": "heartbeat"}
```

---

## Pagination

Les endpoints de liste supportent la pagination :

**Paramètres de requête :**
| Paramètre | Type | Défaut | Max |
|-----------|------|--------|-----|
| page | integer | 1 | - |
| size | integer | 50 | 500 |

**Réponse :**
```json
{
  "items": [...],
  "total": 1250,
  "page": 1,
  "size": 50,
  "pages": 25
}
```

---

## Limitation de débit (prévu)

| Catégorie d'endpoint | Limite |
|----------------------|--------|
| Auth | 5 req/min |
| API de lecture | 100 req/min |
| API d'écriture | 20 req/min |
| WebSocket | 1 conn/user |

---

## Documentation OpenAPI

La documentation interactive de l'API est disponible à :
- **Swagger UI** : `/docs`
- **ReDoc** : `/redoc`
- **OpenAPI JSON** : `/api/v1/openapi.json`

---

## Référence des événements WebSocket

### Canal Overview
```json
// Serveur -> Client
{
  "type": "overview_update",
  "payload": {
    "sessions": {"active": 25, "total": 150},
    "cpu": {"db_cpu_pct": 45.2},
    "alerts": {"critical": 1}
  }
}
```

### Canal SQL Monitor
```json
{
  "type": "sql_monitor_update",
  "payload": {
    "action": "added|updated|removed",
    "sql_id": "abc123def456",
    "sql_exec_id": 12345,
    "status": "EXECUTING",
    "duration_sec": 10.5
  }
}
```

### Canal Sessions
```json
{
  "type": "sessions_update",
  "payload": {
    "action": "connected|disconnected|blocked|unblocked",
    "session": { "sid": 123, "serial": 456, ... }
  }
}
```

### Canal Performance
```json
{
  "type": "performance_update",
  "payload": {
    "aas_data": [
      {"timestamp": "2024-01-15T10:30:00", "wait_class": "User I/O", "aas": 12.5}
    ]
  }
}
```
