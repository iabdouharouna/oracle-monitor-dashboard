> **Langue :** français · [English version](../TECHNICAL_REFERENCE.md)

# Référence Technique du Code

Documentation technique de référence sur l'implémentation du code
(Oracle Monitor Dashboard — FastAPI + React 18 + TypeScript + Oracle 23c).

> **Complément code-level.** Pour les vues/concepts métier et flux haut niveau, voir
> `ARCHITECTURE.md`, `BACKEND_API.md`, `ORACLE_QUERIES.md`, `FRONTEND_COMPONENTS.md`.

---

## 1. Arborescence du code

```
oracle-monitor-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py                    # Factory FastAPI, middleware, routes, /health /metrics
│   │   ├── config.py                  # Settings Pydantic (env + .env) — THRESHOLDS_FILE
│   │   ├── api/
│   │   │   ├── deps.py                # get_oracle_pool / get_redis / get_current_user / get_current_dba
│   │   │   ├── routes/                # 12 modules REST + websocket.py
│   │   │   └── websocket.py           # WS /ws/{channel} + ConnectionManager
│   │   ├── core/
│   │   │   ├── oracle_queries.py      # 40 constantes SQL + get_drilldown_query()
│   │   │   ├── models.py              # Modèles Pydantic (CamelModel, ~60 modèles)
│   │   │   ├── security.py            # JWT HS256, bcrypt, OAuth2
│   │   │   └── database.py            # OraclePool multi-base (X-Database / contextvar)
│   │   ├── services/                  # Couche métier (9 services)
│   │   ├── tasks/                     # Celery (collect_metrics, check_thresholds, generate_awr…)
│   │   └── utils/
│   └── tests/
└── frontend/
    └── src/
        ├── main.tsx                   # Providers : QueryClient ≥ Settings ≥ Theme ≥ Auth ≥ Connection
        ├── App.tsx                    # Routing (ProtectedRoute / PublicRoute)
        ├── api/
        │   ├── client.ts              # Axios (baseURL, interceptor auth + refresh single-flight)
        │   ├── queryClient.ts         # Config TanStack (staleTime 30s, gcTime 5m, retry 1)
        │   ├── dbSelection.ts         # Sélection de base active (localStorage selectedDatabase)
        │   ├── websocket.ts           # useWebSocket (backoff, non consommé actuellement)
        │   └── hooks/                 # useOverview, useInstance, usePerformance… (9 modules)
        ├── context/                   # AuthContext, ConnectionContext, SettingsContext
        ├── hooks/                     # useAutoRefresh, useDebounce, useLocalStorage…
        ├── components/                # common/ charts/ layout/
        ├── theme/theme.ts             # sqlDeveloperPalette, theme, darkTheme, createAppTheme
        ├── types/api.ts               # Interfaces TS alignées sur les modèles Pydantic
        └── utils/                     # helpers, formatters, validators, date
```

---

## 2. Backend

### 2.1 Config (`app/config.py`)

- Pydantic `Settings`, lecture `.env` (utf-8), `case_sensitive=True`, `extra="ignore"`.
- Éléments clés :
  - `API_PREFIX = "/api/v1"`
  - `SECRET_KEY` (min 32 chars), `ALGORITHM="HS256"`, access 30 min, refresh 7 j
  - `HAS_DIAGNOSTICS_PACK`, `ENABLE_KILL_SESSION`, `ENABLE_AWR_REPORTS`
  - 8 variables `THRESHOLD_*` (warn/crit pour tablespace, sessions, cpu, wait-time)
  - **`THRESHOLDS_FILE = "config/thresholds.json"`** — fichier d'override runtime
  - `DATABASES_JSON` — liste JSON de bases secondaires

### 2.2 Authentification (`app/core/security.py` + `app/api/deps.py`)

- OAuth2 Bearer JWT HS256. `pwd_context` bcrypt (12 rounds).
- `create_access_token` / `create_refresh_token` → claim `type: "access"|"refresh"`, `sub=username`.
- `get_current_user` : décode le token, exige `type=="access"`, renvoie `TokenData(username, role)`.
- `get_current_dba` : chaîne sur `get_current_user`, lève 403 si `role != DBA`.
- **Endpoints protégés (uniquement 4) :**
  - `GET /api/v1/auth/me` (`get_current_user`)
  - `POST /api/v1/sessions/{sid}/{serial}/kill` (`get_current_dba`)
  - `POST /api/v1/databases` (`get_current_dba`)
  - `DELETE /api/v1/databases/{name}` (`get_current_dba`)

### 2.3 Connecteur Oracle multi-base (`app/core/database.py`)

- Pool `oracledb` par base (`OraclePool`), résolution de la base active via :
  1. header `X-Database` capturé dans un `contextvar` (middleware `active_database_middleware` dans `main.py`),
  2. sinon la base PRIMARY (`ORACLE_*`).
- `resolve_active_name()` : nom explicite demandé → nom de pool routé.
- `execute_query(sql, params)` / `execute_scalar(...)` : méthodes async utilisées par tous les services.

### 2.4 Requêtes SQL (`app/core/oracle_queries.py`)

- **40 constantes** + `get_drilldown_query(dimension, filter_dimension)` (valide contre une
  allow-list et formate le template `ASH_DRILLDOWN`).
- Conventions : alias snake_case, `:param` (bind), `FETCH FIRST n ROWS ONLY`, V$ filter `type='USER'`.
- `MEMORY_METRICS` alimente `shared_pool_free_mb` (pool `shared pool`, nom `free memory`, bytes → MB).
- `AWR_SNAPSHOTS` / `AWR_TOP_SQL` sont définis mais **non référencés** (le service AWR embarque
  son propre SQL). Ne pas supprimer sans vérifier les usages.

### 2.5 Services & routes

Chaque route délègue à un service (pattern service-vide → `HTTPException`).

| Service | Fichier | Responsabilités principales |
|---------|---------|------------------------------|
| `InstanceService` | `services/instance_service.py` | info/clients/processes/memory/storage/cpu/top-sql (`/instance/*`) |
| `ASHService` | `services/ash_service.py` | AAS, top SQL, drilldown, wait-class breakdown (`/performance/ash/*`) |
| `AWRService` | `services/awr_service.py` | snapshots + rapport AWR (`/performance/awr/*`) |
| `SQLMonitorService` | `services/sql_monitor_service.py` | actif/détail/plan (+ calcul `depth` du plan) |
| `SessionService` | `services/session_service.py` | sessions (filtres), blocking chains, long ops, kill |
| `StorageService` | `services/storage_service.py` | tablespaces, détail (datafiles/segments/growth), projection capacité |
| `MemoryService` | `services/memory_service.py` | SGA/PGA/Memory Target advice |
| `WaitService` | `services/wait_service.py` | waits système/session, IO, historique, live |
| `AlertService` | `services/alert_service.py` | alert log, thresholds (env + fichier), check |

#### 2.5.1 AWR (`services/awr_service.py`) — points d'attention

- `SNAPSHOTS_QUERY` interroge `dba_hist_snapshot` filtré par `:dbid` (résolu via
  `SELECT dbid FROM v$database`), ordonné `DESC`. Colonnes : `snapId, dbid, instanceNumber,
  beginTime, endTime, durationMin, startupTime`.
- **`durationMin`** : `ROUND((CAST(end_interval_time AS DATE) - CAST(begin_interval_time AS DATE)) * 24 * 60, 1)`.
  ❗ Ne pas remplacer par `end_interval_time - begin_interval_time` : les colonnes sont des
  `TIMESTAMP` → différence = `INTERVAL`, et `ROUND()` lève `ORA-00932`.
- `REPORT_QUERY` : `SELECT output FROM TABLE(dbms_workload_repository.{func_name}(:dbid, :instance_number, :snap_start, :snap_end, :options))`.
  - `func_name` = `awr_report_html` ou `awr_report_text`, injecté au formatage de la requête.
  - Le package renvoie le rapport en CLOB **découpé sur plusieurs lignes** → concaténer la colonne
    `output` de chaque ligne.
- `generate_report(snap_id_start, snap_id_end, dbid=None, instance_number=1, report_type="html")` :
  valide `snap_id_end > snap_id_start` (`ValueError`), résout `dbid` si absent, exécute, joint les
  fragments, renvoie `{html, dbid, instanceNumber, snapIdStart, snapIdEnd, generatedAt, reportType}`.
- **ORA-20019 (instance restartée dans l'intervalle)** : géré dans la **route**
  (`routes/performance.py`, ~l.75-92) — si le message contient `"20019"` ou
  `"re-started during specified snapshot interval"` → HTTP 400 avec
  *"The selected snapshot range {start}-{end} crosses an instance restart. Pick a range within a single startup window."*.
  Sinon HTTP 500 `"AWR report generation failed: {e}"`.

#### 2.5.2 Thresholds (`services/alert_service.py`)

- `get_threshold_config()` : lit les 8 `THRESHOLD_*` du settings → dict camelCase
  (`tablespaceWarn`, `tablespaceCrit`, `sessionsWarn`, `sessionsCrit`, `cpuWarn`, `cpuCrit`,
  `waitTimeMsWarn`, `waitTimeMsCrit`).
- `load_persisted_thresholds()` : lit `config/thresholds.json` ; `{}` sur erreur ; ne garde que les
  clés à valeur entière.
- `effective_thresholds()` : **merged** (env default, puis overrides du fichier — le fichier gagne).
- `update_thresholds(thresholds)` : garde les clés valides à valeur numérique non-booléenne
  (cast int), `mkdir(parents=True, exist_ok=True)` + `write_text`, log `"THRESHOLDS_FILE: saved"`,
  renvoie le merged.
- `check_thresholds()` : évalue tablespaces (`StorageService`), sessions (count vs
  `v$parameter.sessions`) et CPU (`InstanceService.get_cpu_ratio`) ; produit des dicts
  `{metric, value, threshold, severity, message}`.

### 2.6 WebSocket (`app/api/websocket.py`)

- Monté **sans** préfixe : `ws://<host>:8000/ws/{channel}`.
- Canaux valides : `overview`, `sql_monitor`, `sessions`, `performance` — sinon close code `4004`.
- Bouchon ping/pong : le serveur répond `{"type":"pong","data":...}` à chaque message client.
- Helpers `push_*_update` broadcast `{"type":"<channel>_update","payload":...}`. Aucun appelant
  actuellement dans le code (destiné à la voie Celery).

---

## 3. Frontend

### 3.1 Bootstrap (`main.tsx`)

Ordre des providers (du plus externe au plus interne) :
`QueryClientProvider` → `SettingsProvider` → `ThemedApp` (qui re-crée `createAppTheme(settings.theme)`
et contient `ThemeProvider` + `CssBaseline` + `BrowserRouter` + `AuthProvider` + `ConnectionProvider` + `App` + `Toaster` + devtools).

### 3.2 Client API (`src/api/client.ts`)

- `baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'` ; timeout 30 s.
- **Intercepteur requête** : ajoute `Authorization: Bearer <accessToken>` (tokens en localStorage
  `oracle_monitor_tokens`, via `utils/helpers.ts`) et `X-Database: <activeDatabase>`
  (`api/dbSelection.ts`, localStorage `selectedDatabase`).
- **Intercepteur réponse** : sur 401 → refresh **single-flight** (`POST /auth/refresh` avec
  `refresh_token` en query), file d'attente `failedQueue` pour les 401 concurrentes ; rejeu de la
  requête initiale ; échec → purge tokens + redirection `/login`.

### 3.3 TanStack Query (`src/api/queryClient.ts`)

- `staleTime: 30s`, `gcTime: 5m`, `retry: 1`, pas de refetch au focus, refetch au reconnect,
  mutations `retry: 0`.

### 3.4 Hooks API (`src/api/hooks/*.ts`)

| Hook | Méthode + endpoint | Polling |
|------|--------------------|---------|
| `useOverview` | `GET /overview` | 30s |
| `useAWRSnapshots` | `GET /performance/awr/snapshots` | staleTime 5min |
| `useGenerateAWRReport` | **mutation** `GET /performance/awr/report?snap_id_start=&snap_id_end=&report_type=` | — |
| `useUpdateThresholds` | **mutation** `PUT /alerts/thresholds` (invalide `['alerts','thresholds']`) | — |
| `useCheckThresholds` | `GET /alerts/check` | 60s |
| `useKillSession` | **mutation** `POST /sessions/{sid}/{serial}/kill` (invalide sessions + blocking) | — |
| `useLiveWaits(1500)` | `GET /waits/live` | 1.5s (background) |

Tous les autres hooks suivent `GET /<module>/<ressource>` avec un `refetchInterval` donné.

### 3.5 Contextes

- **`AuthContext`** : `{user, login, logout, isLoading, isAuthenticated}`. Login poste en
  `application/x-www-form-urlencoded` (`URLSearchParams`) → stocke les tokens → `GET /auth/me`.
  `user.role` = `'DBA' | 'VIEWER'`.
- **`ConnectionContext`** : `{connection, setConnection, isConnected}` ; persisté localStorage
  `oracle_monitor_connection`.
- **`SettingsContext`** : `{settings, updateSettings, resetSettings}` ; `AppSettings`
  (`theme, autoRefresh, refreshInterval, notifications, soundAlerts, compactMode, timezone, language`) ;
  localStorage `oracle-monitor-settings` ; merge deep sur defaults au chargement ; écriture à
  chaque changement. `useSettings()` doit être sous `SettingsProvider`.

### 3.6 Auto-refresh de l'UI (`src/hooks/useAutoRefresh.ts`)

- Options : `{ defaultInterval=30, enabled=true, onRefresh }`.
- **Pattern de ref stable** : `onRefreshRef.current = onRefresh` à chaque render — le timer n'est
  pas réinitialisé quand le callback inline change.
- `useEffect`: si `enabled && interval>0`, `setInterval` → `triggerRefresh()` tous les
  `interval*1000` ms ; `triggerRefresh()` incrémente un compteur, timbre `lastRefresh` et appelle
  le ref.
- `RefreshControl` le consomme avec `useSettings()` pour l'état initial
  (`effectiveInterval = defaultInterval ?? settings.refreshInterval`, `enabled: settings.autoRefresh`).

### 3.7 Pages & montage des routes (`src/App.tsx`)

Routes protégées par `ProtectedRoute` ; `/login` sous `PublicRoute` ; `*` → `/` :

| Route | Page | Hooks majeurs |
|-------|------|---------------|
| `/` | Dashboard | `useOverview`, `useASHAAS`, `useASHWaitClasses`, `useCPURatio`, `useTopSQL`, `useTablespaces` + refresh-all `queryClient.refetchQueries({type:'active'})` |
| `/instance` | InstanceViewer | `useAllInstanceData` |
| `/performance` | PerformanceHub | `useASHAAS`, `useASHWaitClasses`, `useASHDDrilldown`, `useASHTopSQL` |
| `/sql-monitor` | SQLMonitor | `useActiveSQL`, `useSQLMonitorDetail`, `useExecutionPlan(sqlId, planHashValue)` |
| `/sessions` | Sessions | `useSessions`, `useBlockingChains`, `useLongOperations`, `useKillSession` ; `canKill = role==='DBA'` |
| `/storage` | Storage | `useTablespaces`, `useTablespaceDetail`, `useCapacityPlanning` |
| `/memory` | Memory | `useSGAAdvice`, `usePGAAdvice`, `useMemoryTargetAdvice`, `useMemory` ; `sharedPoolFreePct` |
| `/waits` | WaitEvents | `useSystemWaits`, `useSessionWaits`, `useIOMetrics`, `useMetricsHistory` |
| `/live` | LiveMonitor | `useLiveWaits(1500)` (buffer 200 échantillons) |
| `/alerts` | Alerts | `useAlertLog`, `useThresholds`, `useCheckThresholds`, `useUpdateThresholds` |
| `/reports` | Reports | `useAWRSnapshots`, `useGenerateAWRReport` (preview iframe `<pre>`, export Blob) |
| `/settings` | Settings | `useAuth` (profil), `useSettings` |

### 3.8 Composants clés

- **`GaugeChart`** : demi-donut MUI/Recharts, couleurs `#00A651`/`#FF8C00`/`#D13438` selon
  `thresholds`. Props ajoutées : `onClick`, `sx` (curseur pointer + clic → détail tablespace).
- **`DataTable`** : wrapper `@mui/x-data-grid` avec pagination, chargement, erreur, rowClick et
  **sélection checkbox** (`onSelectionChange` reçoit des ids — pour Sessions, ids `"sid,serial"`).
- **`RefreshControl`** : `{defaultInterval?, onManualRefresh?}`, branché sur Settings.
- **`AddDatabaseDialog`** : après un `mutateAsync` réussi → `setTested(true)` (bandeau
  "Connection tested successfully.") puis fermeture différée ~1.2 s.
- **Header** : badge notifications piloté par `useCheckThresholds()` (`activeAlerts.length`),
  menu déroulant listant `alert.message/severity/threshold` ; items Profile/Settings pointent vers
  `/settings`.

---

## 4. Types & contrat de sérialisation

### 4.1 Côté backend — `CamelModel`

`app/core/models.py` : `CamelModel` génère l'alias camelCase pour **toutes** les réponses
(snake_case en DB → camelCase au JSON). Exemple :
`shared_pool_free_mb` ↔ `sharedPoolFreeMB` (via `serialization_alias`).

### 4.2 Côté frontend — `src/types/api.ts`

Interfaces majeures alignées sur les modèles Pydantic. Cas notables :

```ts
interface SGAMetrics { totalMB; bufferCacheMB; sharedPoolMB; sharedPoolFreeMB?: number; /* … */ }
interface AWRSnapshot { snapId; dbid; instanceNumber; beginTime; endTime; durationMin; startupTime }
interface AWRReport  { html; dbid; instanceNumber; snapIdStart; snapIdEnd; generatedAt; reportType }
interface ThresholdConfig { tablespaceWarn; /* … */ waitTimeMsCrit }  // 8 champs number
interface TriggeredAlert { id; metric; value; threshold; severity: 'WARNING'|'CRITICAL'; message; timestamp; acknowledged }
```

⚠️ `useDatabases.ts` définit sa **propre** interface `DatabaseInfo` (métadonnées de connexion),
distincte du `DatabaseInfo` de `types/api.ts` (info d'instance) — bien les distinguer.

---

## 5. Pièges & conventions à respecter

1. **AWR duration** — toujours `CAST(... AS DATE)` avant arithmétique ; ne jamais calculer la durée
   avec les `TIMESTAMP` bruts (ORA-00932).
2. **AWR report** — le CLOB arrive en plusieurs lignes (colonne `output`) ; concaténer.
3. **AWR restart** — un intervalle traversant un restart lève ORA-20019 → mappé 400 par la route,
   pas par le service.
4. **Thresholds** — ne jamais hardcoder la limite de sessions (`1000`) : `check_thresholds` lit
   `v$parameter.sessions`. Toujours passer par `effective_thresholds()` pour lire une valeur.
5. **Routage multi-base** — passer la base active via le header `X-Database` (contextvar) ;
   `VITE_API_URL` du client pointe sur `/api/v1` (le proxy Vite de dev redirige `/api` et `/ws`).
6. **Refresh Control** — se câbler sur `onManualRefresh` pour que le refresh du haut de page
   rafraîchisse vos requêtes ; privilégier `refetchQueries({type:'active'})` ou `invalidateQueries`.
7. **Mutations** — `retry: 0` ; invalider les queryKeys concernées dans `onSuccess`
8. **Rôle** — le kill et l'ajout/suppression de bases exigent `DBA` côté serveur ; côté UI
   `canKill = user?.role === 'DBA'`.
9. **localStorage** — clés réservées : `oracle_monitor_tokens`, `oracle_monitor_connection`,
   `selectedDatabase`, `oracle-monitor-settings`.
10. **Types** — toute nouvelle réponse backend doit être ajoutée dans `types/api.ts` (alias camelCase).

---

## 6. Ajouter une fonctionnalité — checklist

1. **SQL** : constante dans `oracle_queries.py` (binding `:`, alias snake_case).
2. **Modèle** : modèle Pydantic (hériter de `CamelModel` si exposé via API).
3. **Service** : méthode statique dans le service du domaine (utiliser `oracle_pool.execute_query`).
4. **Route** : endpoint REST dans `routes/<domaine>.py` (préfixe `/api/v1`, valider les params,
   mapper les erreurs connues → 400/404/500 ; `get_current_dba` si sensible).
5. **Hook** : `use<Feature>` dans `src/api/hooks/` (query pat `refetchInterval` OU mutation avec
   invalidation).
6. **Type TS** : interface dans `types/api.ts`, refetch/refInvalide alignés.
7. **UI** : page/component + route dans `App.tsx` + entrée Sidebar.
8. **Doc** : mettre à jour `BACKEND_API.md`, `FEATURES.md` et éventuellement `ORACLE_QUERIES.md`.