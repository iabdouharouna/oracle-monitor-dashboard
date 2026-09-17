> **Langue :** français · [English version](../ARCHITECTURE.md)

# Architecture du système

> **Décisions d'architecture.** Chaque choix structurant est tracé dans les
> [Architecture Decision Records (ADR)](adr/README.md) — voir ADR-0001 à ADR-0012.

## Présentation

Le Oracle Monitor Dashboard est une application full-stack construite avec un **backend FastAPI** et un **frontend React + TypeScript**, conçue pour reproduire les capacités de supervision de SQL Developer pour Oracle Database.

## Architecture de haut niveau

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORACLE MONITOR DASHBOARD                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   FRONTEND   │◄───│    BACKEND   │◄───│   ORACLE DB  │                  │
│  │  (React)     │    │  (FastAPI)   │    │  (23c Free)  │                  │
│  │  Port: 3000  │    │  Port: 8000  │    │  Port: 1521  │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│         │                   │                   │                           │
│         │                   ▼                   │                           │
│         │          ┌──────────────┐             │                           │
│         │          │    REDIS     │             │                           │
│         │          │  Port: 6379  │             │                           │
│         │          └──────────────┘             │                           │
│         │                   │                   │                           │
│         │          ┌──────────────┐             │                           │
│         └──────────│  PROMETHEUS  │             │                           │
│                    │  Port: 9090  │             │                           │
│                    └──────────────┘             │                           │
│                          │                      │                           │
│                    ┌──────────────┐             │                           │
│                    │   GRAFANA    │             │                           │
│                    │  Port: 3001  │             │                           │
│                    └──────────────┘             │                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Pile technologique

### Backend
| Composant | Technologie | Version | Rôle |
|-----------|-------------|---------|------|
| Web Framework | FastAPI | 0.104+ | API REST asynchrone, docs OpenAPI |
| Database Driver | python-oracledb | 2.5+ | Connectivité Oracle (mode thin) |
| Caching | Redis | 7+ | Cache de requêtes, stockage de sessions, broker Celery |
| Task Queue | Celery | 5.3+ | Tâches en arrière-plan (métriques, alertes) |
| Validation | Pydantic | 2.5+ | Validation des données, paramètres |
| Auth | python-jose + passlib | 3.3+/1.7+ | JWT, bcrypt |
| Logging | structlog | 24.1+ | Journalisation structurée en JSON |
| Metrics | psutil | 5.9+ | CPU/RAM/disque hôte (historique par série dans Redis) |

### Frontend
| Composant | Technologie | Version | Rôle |
|-----------|-------------|---------|------|
| Framework | React | 18.2+ | Bibliothèque UI |
| Language | TypeScript | 5.4+ | Sécurité des types |
| Build Tool | Vite | 5.2+ | Dev/build rapide |
| UI Library | MUI (Material UI) | 5.15+ | Composants d'entreprise |
| Data Grid | MUI X DataGrid | 7.2+ | Tableaux avancés |
| State Management | TanStack Query | 5.28+ | État serveur, mise en cache |
| Charts | Recharts | 2.12+ | Graphiques composables |
| Graph | React Force Graph | 1.25+ | Visualisation de l'arbre de blocage |
| HTTP Client | Axios | 1.6+ | Communication API |
| Date | date-fns | 3.6+ | Formatage de dates |
| Notifications | react-hot-toast | 2.4+ | Messages toast |

### Infrastructure
| Composant | Technologie | Rôle |
|-----------|-------------|------|
| Containerization | Docker Compose | Orchestration multi-conteneurs |
| Oracle DB | gvenzl/oracle-free:23-slim | Oracle 23c gratuit |
| Reverse Proxy | Nginx | Fichiers statiques, proxy API |
| Monitoring | Interne (historique Redis + page Monitoring) | Collecte des métriques & visualisation |
| CI/CD | GitHub Actions (planifié) | Tests & déploiement automatisés |

## Architecture du backend

```
backend/
├── app/
│   ├── api/
│   │   ├── routes/          # 12 modules REST + WebSocket
│   │   │   ├── auth.py      # Points de terminaison d'authentification
│   │   │   ├── overview.py  # Agrégation du tableau de bord
│   │   │   ├── instance.py  # Instance Viewer (7 panneaux)
│   │   │   ├── performance.py # ASH + AWR (snapshots/report)
│   │   │   ├── sql_monitor.py # V$SQL_MONITOR
│   │   │   ├── sessions.py  # Sessions & blocages + kill
│   │   │   ├── storage.py   # Tablespaces, capacité
│   │   │   ├── memory.py    # Advisors SGA/PGA
│   │   │   ├── waits.py     # Événements d'attente, I/O
│   │   │   ├── alerts.py    # Journal d'alertes, seuils
│   │   │   ├── databases.py # Connexions multi-bases (CRUD)
│   │   │   └── exports.py   # Exports CSV
│   │   └── websocket.py     # Push en temps réel
│   ├── core/
│   │   ├── oracle_queries.py    # Toutes les requêtes SQL Oracle (40)
│   │   ├── models.py            # Modèles Pydantic
│   │   ├── security.py          # JWT, bcrypt, OAuth2
│   │   ├── exceptions.py        # Exceptions personnalisées
│   │   └── constants.py         # Classes d'attente, seuils
│   ├── services/                # Couche logique métier
│   │   ├── instance_service.py
│   │   ├── ash_service.py
│   │   ├── awr_service.py       # Snapshots AWR + génération de rapports
│   │   ├── sql_monitor_service.py
│   │   ├── session_service.py
│   │   ├── storage_service.py
│   │   ├── memory_service.py
│   │   ├── wait_service.py
│   │   └── alert_service.py     # Seuils (env + config/thresholds.json)
│   ├── tasks/                   # Tâches Celery en arrière-plan
│   │   ├── collect_metrics.py
│   │   ├── check_thresholds.py
│   │   ├── generate_awr.py
│   │   └── cleanup.py
│   ├── utils/                   # Helpers
│   └── main.py                  # Factory de l'application FastAPI
```

### Flux de requêtes

```
Requête client
      │
      ▼
┌─────────────────┐
│   Nginx (80)    │  ── Fichiers statiques / proxy vers le backend
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   FastAPI       │  ── CORS, middleware d'authentification
│   (Port 8000)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Injection de  │  ── Pool Oracle, Redis, Auth
│   Dépendances   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Route     │  ── Validation, gestion des erreurs
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Couche        │  ── Logique métier, composition des requêtes
│   Service       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Exécution     │  ── SQL paramétré depuis oracle_queries.py
│   des requêtes  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Oracle DB     │  ── Pool de connexions (async)
└─────────────────┘
```

### Enrôlement des bases de données et pools de connexion

Au démarrage, **aucune base n'est configurée** (les paramètres legacy `ORACLE_USER`/`ORACLE_PASSWORD`/
`ORACLE_DSN` sont vides et aucune PRIMARY n'est créée). Les bases proviennent de deux sources, fusionnées
dans `connections.get_catalog()` :

- `DATABASES_JSON` (env, optionnel) — connexions initialisées, traitées comme immuables (non supprimables depuis l'IHM).
- `config/databases.json` — connexions ajoutées à l'exécution via `POST /api/v1/databases` (enrollment IHM,
  rôle DBA), persistées sur le volume partagé `app_config`.

Les pools Oracle sont par base et créés **à la demande** : `POST /api/v1/databases` (`routes/databases.py`)
appelle `oracle_pool.create_pool` juste après le test de connexion, le `DELETE` appelle `drop_pool`, et un pool
pour une base persistée est créé paresseusement à la première requête s'il est absent. La première base enrolée
devient automatiquement la base par défaut ; supprimer la dernière ramène à l'état vide (onboarding).

Côté frontend, la page **Connections** (route `/connections`, accessible depuis la barre latérale) gère
l'enrôlement ; les pages de monitoring sont encapsulées dans un composant `DatabaseGate` qui redirige vers
`/connections` quand aucune base n'existe. L'en-tête conserve le sélecteur de base et un bouton
« Ajouter une base... » (l'ajout/suppression reste réservé au rôle DBA).

## Architecture du frontend

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts           # Instance Axios + intercepteurs
│   │   ├── queryClient.ts      # Config TanStack Query
│   │   ├── hooks/              # Hooks spécifiques aux fonctionnalités
│   │   │   ├── useOverview.ts
│   │   │   ├── useInstance.ts
│   │   │   ├── usePerformance.ts
│   │   │   ├── useSqlMonitor.ts
│   │   │   ├── useSessions.ts
│   │   │   ├── useStorage.ts
│   │   │   ├── useMemory.ts
│   │   │   ├── useWaits.ts
│   │   │   └── useAlerts.ts
│   │   └── websocket.ts        # Hook WebSocket
│   ├── components/
│   │   ├── common/             # Composants UI réutilisables
│   │   │   ├── KPICard.tsx
│   │   │   ├── GaugeChart.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── RefreshControl.tsx
│   │   │   ├── TimeRangeSelector.tsx
│   │   │   └── DatabaseSelector.tsx
│   │   ├── charts/             # Composants de graphiques (Recharts)
│   │   │   ├── AASChart.tsx
│   │   │   ├── WaitClassChart.tsx
│   │   │   ├── TopSQLChart.tsx
│   │   │   ├── MemoryBreakdown.tsx
│   │   │   ├── TablespaceGauges.tsx
│   │   │   ├── BlockingTree.tsx
│   │   │   ├── ExecutionPlan.tsx
│   │   │   ├── CPURatioChart.tsx
│   │   │   └── StorageTrendChart.tsx
│   │   └── layout/             # Mise en page des pages
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       └── PageLayout.tsx
│   ├── pages/                  # Composants de pages
│   │   ├── Connections.tsx     # Enrôlement des bases (onboarding quand aucune base)
│   │   ├── Dashboard.tsx
│   │   ├── InstanceViewer.tsx
│   │   ├── PerformanceHub.tsx
│   │   ├── SQLMonitor.tsx
│   │   ├── Sessions.tsx
│   │   ├── Storage.tsx
│   │   ├── Memory.tsx
│   │   ├── WaitEvents.tsx
│   │   ├── Alerts.tsx
│   │   ├── Settings.tsx
│   │   └── Reports.tsx
│   ├── context/
│   │   ├── AuthContext.tsx        # État d'authentification
│   │   ├── ConnectionContext.tsx  # Connexion DB active (en-tête X-Database)
│   │   └── SettingsContext.tsx    # Préférences utilisateur → localStorage
│   ├── theme/
│   │   └── theme.ts               # Thème MUI SQL Developer + thème sombre
│   ├── types/
│   │   └── api.ts                 # Interfaces TypeScript
│   └── App.tsx                 # Routing + providers
```

### Gestion d'état

```
┌─────────────────────────────────────────────────────────────┐
│                    TANSTACK QUERY CACHE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Clés de requête (Query Keys) :                             │
│  ├── ['overview']                           ── rafraîchi 30s│
│  ├── ['instance', 'all']                    ── rafraîchi 30s│
│  ├── ['instance', 'info']                 ── rafraîchi 5 min│
│  ├── ['instance', 'clients']                ── rafraîchi 60s│
│  ├── ['instance', 'memory']                 ── rafraîchi 60s│
│  ├── ['instance', 'storage']                ── rafraîchi 60s│
│  ├── ['performance', 'ash', 'aas']          ── rafraîchi 10s│
│  ├── ['sql-monitor', 'active']               ── rafraîchi 5s│
│  ├── ['sessions', {...filters}]             ── rafraîchi 15s│
│  ├── ['storage', 'tablespaces']             ── rafraîchi 60s│
│  ├── ['waits', 'system']                    ── rafraîchi 30s│
│  ├── ['waits', 'io-metrics']                ── rafraîchi 30s│
│  └── ['alerts', 'check']                    ── rafraîchi 60s│
│                                                             │
│  Fonctionnalités :                                          │
│  ✅ Re-fetch automatique au focus de la fenêtre (désactivé)  │
│  ✅ Re-fetch en arrière-plan à la reconnexion                │
│  ✅ Stale time : 30s, temps en cache : 5 min                 │
│  ✅ Retry : 1x en cas d'échec                                │
│  ✅ Mises à jour optimistes pour les mutations               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Modèles de flux de données

### 1. Supervision en temps réel (WebSocket)

```
Backend                          Frontend
   │                                 │
   ├─► /ws/overview ───────────────► │  Rafraîchissement auto de l'UI
   ├─► /ws/sql-monitor ───────────► │  Mises à jour SQL en direct
   ├─► /ws/sessions ──────────────► │  Changements de sessions
   └─► /ws/performance ───────────► │  Mises à jour du graphique AAS
```

### 2. Collecte des métriques en arrière-plan (Celery)

```
Celery Beat (Scheduler)
   │
   ├─► Toutes les 30s : collect_metrics.collect_all_metrics()
   │    └─► Interroge les vues V$ Oracle
   │    └─► Stocke dans Redis (basé sur TTL)
   │    └─► Envoie via WebSocket
   │
   ├─► Toutes les 60s : check_thresholds.check_all_thresholds()
   │    └─► Évalue les seuils
   │    └─► Crée les enregistrements alert_history
   │    └─► Envoie les notifications d'alerte
   │
   ├─► Chaque jour à 02:00 : generate_awr.create_awr_snapshot()
   │    └─► Exécute DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT
   │
   └─► Chaque jour à 03:00 : cleanup.cleanup_old_data()
        └─► Purge les anciennes métriques et l'historique des alertes
```

### 3. Stratégie de cache des requêtes

```
Couches du cache Redis :
┌─────────────────────────────────────────────────────────────┐
│    Modèle de clé : {prefix}:{fonction}:{hash(args)}         │
├─────────────────────────────────────────────────────────────┤
│  TTL :                                                      │
│  ├── instance:info          ── 300s (5 min)                 │
│  ├── instance:clients       ── 60s                          │
│  ├── instance:memory        ── 60s                          │
│  ├── instance:storage       ── 60s                          │
│  ├── ash:aas                ── 10s                          │
│  ├── sql:monitor:active     ── 5s                           │
│  ├── sessions:list          ── 15s                          │
│  ├── storage:tablespaces    ── 60s                          │
│  ├── waits:system           ── 30s                          │
│  └── waits:history          ── 60s                          │
│                                                             │
│  Invalidation :                                             │
│  ├── Manuelle : appels API à /alerts/check                  │
│  ├── Basée sur le temps : expiration des TTL                │
│  └── Par modèle : redis.delete_pattern("instance:*")        │
└─────────────────────────────────────────────────────────────┘
```

## Architecture de sécurité

### Flux d'authentification

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │     │   Backend    │     │   Database   │
│  (Browser)   │     │  (FastAPI)   │     │  (PostgreSQL)│
└──────┬───────┘     └──────┬───────┘     └──────────────┘
       │                    │
       │  POST /auth/login  │
       │  {username, pwd}   │
       ├───────────────────►│
       │                    │
       │  Vérifie bcrypt    │
       │  Crée la paire JWT │
       │  (access + refresh)│
       │◄───────────────────┤
       │                    │
       │  GET /api/...      │
       │  Authorization:    │
       │  Bearer <access>   │
       ├───────────────────►│
       │                    │
       │  Valide le JWT     │
       │  Vérifie le rôle/perm│
       │◄───────────────────┤
       │                    │
       │  401 si expiré     │
       │  POST /auth/refresh│
       │  Bearer <refresh>  │
       ├───────────────────►│
       │                    │
       │  Valide le refresh │
       │  Émet nouvelle paire│
       │◄───────────────────┤
```

### Contrôle d'accès basé sur les rôles

| Rôle | Permissions |
|------|-------------|
| **DBA** | Accès complet : terminer les sessions, modifier les seuils, consulter toutes les données, générer des rapports |
| **VIEWER** | Lecture seule : tableaux de bord, requêtes, exports (aucune action destructrice) |

### En-têtes de sécurité et middleware

```python
# Configuration CORS
CORS_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]
CORS_ALLOW_CREDENTIALS = True

# Configuration JWT
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
BCRYPT_ROUNDS = 12

# Limitation de débit (prévue)
# - Login : 5 tentatives/minute
# - API : 100 requêtes/minute par utilisateur
# - WebSocket : 1 connexion par utilisateur
```

## Considérations de scalabilité

### Mise à l'échelle horizontale

| Composant | Stratégie de mise à l'échelle |
|-----------|-------------------------------|
| **Backend** | Sans état - exécuter plusieurs réplicas derrière un load balancer |
| **Frontend** | Fichiers statiques - distribution via CDN |
| **Redis** | Mode cluster pour la HA ; Sentinel pour le basculement |
| **Celery Workers** | Ajouter des réplicas de workers ; partitionner les files d'attente |
| **Oracle** | Réplicas en lecture pour les requêtes de reporting ; RAC pour la HA |

### Optimisations des performances

| Domaine | Optimisation |
|---------|--------------|
| **Requêtes Oracle** | Paramétrées, colonnes indexées, colonnes minimales |
| **Pool de connexions** | Pool asynchrone (min=2, max=20), réutilisation des connexions |
| **Cache** | Redis avec TTL, granularité par endpoint |
| **Pagination** | Côté serveur, taille de page configurable (max 500) |
| **WebSocket** | Mises à jour limitées (5s min), abonnement par canal |
| **Frontend** | Code splitting, lazy loading, mémoïsation |

## Supervision et observabilité

### Métriques applicatives

Les métriques sont collectées en-processus (API) et via Celery (DB + hôte), stockées
dans des séries temporelles Redis (`metrics:series:<name>`) et exposées via :

| Point de terminaison | Description |
|----------------------|-------------|
| `GET /api/v1/metrics/history` | Données de séries temporelles (heures/pas configurables) |
| `GET /api/v1/metrics/available` | Liste des noms de métriques collectées |
| `GET /api/v1/metrics/middleware` | Middleware HTTP (nombre de requêtes, latence, erreurs) |

```
# Métriques DB
db_cpu_pct, db_sessions_total, db_sessions_active, db_storage_pct
db_io_read_mbps, db_io_write_mbps

# Métriques API
api_requests_total, api_latency_avg_ms, api_errors_total

# Métriques hôte
host_cpu_pct, host_ram_pct, host_ram_used_mb, host_disk_pct
```

### Contrôles de santé

| Point de terminaison | Vérifications |
|----------------------|---------------|
| `GET /health` | Connectivité Redis ; renvoie `"database":"not_configured"` (HTTP 200) quand aucune base n'est enrolée |
| `GET /api/v1/metrics/history` | Requête de séries temporelles |
| Docker HEALTHCHECK | Vérification de vie au niveau conteneur |

### Journalisation

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "logger": "app.services.instance_service",
  "message": "Instance info retrieved",
  "duration_ms": 45,
  "query": "INSTANCE_INFO"
}
```

## Modes de défaillance et résilience

| Défaillance | Détection | Atténuation |
|-------------|-----------|-------------|
| Base Oracle en panne | Contrôle de santé, timeout de requête | Disjoncteur, données en cache, alerte |
| Redis en panne | Erreur de connexion | Dégradation contrôlée (pas de cache) |
| Latence de requête élevée | Alerte seuil (Celery) | Optimisation des requêtes, revue des index |
| Fuite mémoire | Redémarrage du conteneur | Limites de ressources, profilage |
| Expiration du jeton d'authentification | Réponse 401 | Rafraîchissement automatique avec le jeton de rafraîchissement |

## Évolutions d'architecture futures

- ✅ **Support multi-bases de données** - Pool de connexions par cible (implémenté ; voir ci-dessous)
- [ ] **Système de plugins** - Collecteurs de métriques personnalisés
- [ ] **Streaming d'événements** - Kafka pour le streaming des journaux d'audit
- [ ] **Détection d'anomalies basée sur le ML** - Prévisions, lignes de base
- [ ] **API GraphQL** - Requêtes flexibles
- [ ] **PWA mobile** - Tableau de bord utilisable hors ligne