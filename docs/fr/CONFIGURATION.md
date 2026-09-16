> **Langue :** français · [English version](../CONFIGURATION.md)

# Guide de configuration

## Présentation

Le Oracle Monitor Dashboard utilise une approche de configuration en couches :
1. **Variables d'environnement** (fichier `.env`) - Configuration principale
2. **Paramètres YAML** (`config/settings.yaml`) - Feature flags, seuils
3. **Valeurs par défaut dans le code** (`app/config.py`) - Valeurs de repli avec validation
4. **Surcharges runtime persistées** (`config/thresholds.json`) - Valeurs de seuils sauvegardées au runtime via l'API (priorité la plus élevée pour les seuils)

## Variables d'environnement (`.env`)

### Variables requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `ORACLE_USER` | Nom d'utilisateur Oracle de supervision | `monitor` |
| `ORACLE_PASSWORD` | Mot de passe Oracle | `secure_password_2024` |
| `ORACLE_DSN` | Chaîne de connexion (host:port/service) | `localhost:1521/FREE` |
| `SECRET_KEY` | Clé de signature JWT (min 32 caractères) | `your-32-char-secret-key` |

### Sécurité

| Variable | Défaut | Description |
|----------|--------|-------------|
| `ALGORITHM` | `HS256` | Algorithme JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Durée de vie du jeton d'accès |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Durée de vie du jeton de rafraîchissement |
| `BCRYPT_ROUNDS` | `12` | Coût de hachage du mot de passe |

### Pool de connexions Oracle

| Variable | Défaut | Plage | Description |
|----------|--------|-------|-------------|
| `ORACLE_POOL_MIN` | `2` | 1-10 | Connexions minimales |
| `ORACLE_POOL_MAX` | `20` | 2-100 | Connexions maximales |
| `ORACLE_POOL_INCREMENT` | `2` | 1-10 | Incrément de croissance du pool |
| `ORACLE_TIMEOUT` | `30` | 5-300 | Timeout de connexion (secondes) |
| `ORACLE_ENCODING` | `UTF-8` | - | Encodage des caractères |
| `ORACLE_NCHAR_ENCODING` | `UTF-8` | - | Encodage NCHAR |

### Redis

| Variable | Défaut | Description |
|----------|--------|-------------|
| `REDIS_URL` | `redis://redis:6379/0` | URL de connexion Redis |
| `REDIS_MAX_CONNECTIONS` | `50` | Connexions max du pool |
| `REDIS_SOCKET_TIMEOUT` | `5` | Timeout socket (secondes) |
| `REDIS_SOCKET_CONNECT_TIMEOUT` | `5` | Timeout de connexion (secondes) |

### TTL du cache (secondes)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `CACHE_TTL_DEFAULT` | `30` | TTL du cache par défaut |
| `CACHE_TTL_INSTANCE_INFO` | `300` | Cache des informations d'instance |
| `CACHE_TTL_TABLESPACES` | `60` | Cache des tablespaces |
| `CACHE_TTL_ASH` | `10` | Cache des données ASH |
| `CACHE_TTL_SQL_MONITOR` | `5` | Cache du SQL monitor |
| `CACHE_TTL_SESSIONS` | `15` | Cache des sessions |
| `CACHE_TTL_WAITS` | `15` | Cache des événements d'attente |
| `CACHE_TTL_MEMORY` | `60` | Cache mémoire |

### CORS

| Variable | Défaut | Description |
|----------|--------|-------------|
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Origines autorisées (séparées par des virgules) |
| `CORS_ALLOW_CREDENTIALS` | `true` | Autoriser les cookies / l'authentification |
| `CORS_ALLOW_METHODS` | `GET,POST,PUT,DELETE,OPTIONS` | Méthodes autorisées |
| `CORS_ALLOW_HEADERS` | `*` | En-têtes autorisés |

### Fonctionnalités

| Variable | Défaut | Description |
|----------|--------|-------------|
| `HAS_DIAGNOSTICS_PACK` | `true` | Active les requêtes AWR/DBA_HIST |
| `ENABLE_KILL_SESSION` | `false` | Autorise la terminaison de session (DBA uniquement) |
| `ENABLE_AWR_REPORTS` | `true` | Active la génération de rapports AWR |
| `ENABLE_AUTO_REFRESH` | `true` | Active le rafraîchissement automatique par défaut |
| `DEFAULT_REFRESH_INTERVAL` | `30` | Rafraîchissement par défaut (secondes) |

### Seuils

| Variable | Défaut | Plage | Description |
|----------|--------|-------|-------------|
| `THRESHOLD_TABLESPACE_WARN` | `80` | 50-95 | Avertissement tablespace % |
| `THRESHOLD_TABLESPACE_CRIT` | `90` | 60-99 | Critique tablespace % |
| `THRESHOLD_SESSIONS_WARN` | `70` | 50-90 | Avertissement sessions % |
| `THRESHOLD_SESSIONS_CRIT` | `85` | 60-95 | Critique sessions % |
| `THRESHOLD_CPU_WARN` | `80` | 50-95 | Avertissement CPU % |
| `THRESHOLD_CPU_CRIT` | `90` | 60-99 | Critique CPU % |
| `THRESHOLD_WAIT_TIME_MS_WARN` | `100` | 10-1000 | Avertissement temps d'attente (ms) |
| `THRESHOLD_WAIT_TIME_MS_CRIT` | `500` | 50-5000 | Critique temps d'attente (ms) |
| `THRESHOLDS_FILE` | `config/thresholds.json` | - | Chemin vers les surcharges de seuils persistées |

> **Précédence :** les valeurs des seuils sont résolues par `AlertService.effective_thresholds()`
> (défauts depuis l'env → fusionnés avec `config/thresholds.json`). Surcharges runtime
> envoyées via `PUT /api/v1/alerts/thresholds` **priment** ; fichier créé à la
> demande dès le premier `PUT /api/v1/alerts/thresholds` (exemple :

```json
{
  "tablespaceWarn": 85,
  "tablespaceCrit": 92,
  "sessionsWarn": 75,
  "sessionsCrit": 90,
  "cpuWarn": 80,
  "cpuCrit": 90,
  "waitTimeMsWarn": 150,
  "waitTimeMsCrit": 600
}
```

Seules les clés avec des valeurs entières sont relues ; les entrées non numériques sont ignorées.
`GET /api/v1/alerts/thresholds` renvoie toujours la configuration effective (fusionnée).

### Persistance des seuils au runtime

Pour modifier un seuil au runtime (sans redémarrage, sans changement d'environnement) :

```bash
curl -X PUT http://localhost:8000/api/v1/alerts/thresholds \
  -H "Content-Type: application/json" \
  -d '{"cpuWarn": 82, "cpuCrit": 93}'
```

La réponse est la configuration fusionnée complète. Les surcharges sont persistées dans
`config/thresholds.json` (sauvegardées aux côtés de `config/databases.json`).

### Celery

| Variable | Défaut | Description |
|----------|--------|-------------|
| `CELERY_BROKER_URL` | `redis://redis:6379/1` | Broker Celery |
| `CELERY_RESULT_BACKEND` | `redis://redis:6379/2` | Résultats Celery |
| `CELERY_TASK_TRACK_STARTED` | `true` | Suivre le démarrage des tâches |
| `CELERY_TASK_TIME_LIMIT` | `300` | Timeout des tâches (secondes) |
| `CELERY_WORKER_PREFETCH_MULTIPLIER` | `4` | Multiplicateur de prefetch |

### Supervision

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PROMETHEUS_METRICS_ENABLED` | `true` | Active les métriques Prometheus |
| `METRICS_PORT` | `9090` | Port des métriques (interne) |

### Pagination

| Variable | Défaut | Plage | Description |
|----------|--------|-------|-------------|
| `DEFAULT_PAGE_SIZE` | `50` | 1-500 | Taille de page par défaut |
| `MAX_PAGE_SIZE` | `500` | 1-5000 | Taille de page maximale |

### Export

| Variable | Défaut | Description |
|----------|--------|-------------|
| `EXPORT_MAX_ROWS` | `10000` | Nombre maximal de lignes pour l'export CSV |
| `REPORT_TEMPLATE_DIR` | `app/templates/reports` | Chemin des modèles de rapports |

### Frontend (au moment du build)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | URL de l'API backend |
| `VITE_WS_URL` | `ws://localhost:8000` | URL WebSocket |
| `VITE_APP_TITLE` | `Oracle Monitor Dashboard` | Titre de l'application |

---

## Paramètres YAML (`config/settings.yaml`)

Configuration alternative via YAML (fusionnée avec les variables d'environnement, l'env prédomine).

```yaml
# config/settings.yaml
database:
  user: "${ORACLE_USER}"
  password: "${ORACLE_PASSWORD}"
  dsn: "${ORACLE_DSN}"
  pool_min: 2
  pool_max: 20
  pool_increment: 2
  timeout: 30

dashboard:
  title: "Oracle Monitor Dashboard"
  theme: "sql_developer"     # light/dark/sql_developer
  default_refresh_sec: 30
  refresh_options: [5, 15, 30, 60, 0]  # 0 = OFF
  timezone: "UTC"

thresholds:
  tablespace_pct_warn: 80
  tablespace_pct_crit: 90
  session_pct_warn: 70
  session_pct_crit: 85
  cpu_pct_warn: 80
  cpu_pct_crit: 90
  wait_time_ms_warn: 100

features:
  enable_sql_monitor: true
  enable_ash_analytics: true
  enable_kill_session: false
  enable_awr_history: true
  max_sql_text_length: 2000

cache:
  instance_info_ttl: 300
  tablespace_ttl: 60
  ash_ttl: 10
  sql_monitor_ttl: 5
```

---

## Paramètres Pydantic (`app/config.py`)

Tous les paramètres sont définis dans `app/config.py` avec Pydantic Settings :

- **Validation des types** - Conversion et validation automatiques des types
- **Contraintes de champs** - Vérifications de plage (ge, le), min_length
- **Chargement de l'environnement** - Depuis le fichier `.env` avec encodage `utf-8`
- **Sensibilité à la casse** - Les variables d'environnement sont sensibles à la casse
- **Extra ignoré** - Les variables d'environnement inconnues sont ignorées

### Structure de la classe Settings

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    
    # Application
    APP_NAME: str = "Oracle Monitor Dashboard"
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # Base de données Oracle
    ORACLE_USER: str
    ORACLE_PASSWORD: SecretStr
    ORACLE_DSN: str
    # ... paramètres du pool
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    # ... paramètres de connexion
    
    # TTL du cache
    CACHE_TTL_DEFAULT: int = 30
    # ... TTL par endpoint
    
    # Authentification
    SECRET_KEY: SecretStr
    # ... paramètres JWT
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    # ... paramètres CORS
    
    # Fonctionnalités
    HAS_DIAGNOSTICS_PACK: bool = True
    # ... feature flags
    
    # Seuils
    THRESHOLD_TABLESPACE_WARN: int = 80
    # ... tous les seuils avec validation
    
    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/1"
    # ... paramètres Celery
    
    # Supervision
    PROMETHEUS_METRICS_ENABLED: bool = True
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 500
    
    # Export
    EXPORT_MAX_ROWS: int = 10000
    REPORT_TEMPLATE_DIR: Path = Path("app/templates/reports")
```

### Validateurs personnalisés

```python
@field_validator("CORS_ORIGINS", mode="before")
@classmethod
def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
    if isinstance(v, str):
        return [origin.strip() for origin in v.split(",")]
    return v
```

### Accès aux paramètres

```python
from app.config import settings

# Instance globale (en cache)
settings = get_settings()

# Utilisation
pool_size = settings.ORACLE_POOL_MAX
threshold = settings.THRESHOLD_TABLESPACE_WARN
secret = settings.SECRET_KEY.get_secret_value()
```

---

## Configuration du frontend

### Configuration Vite (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/x-data-grid', ...],
          charts: ['recharts', 'd3', 'react-force-graph-2d'],
          query: ['@tanstack/react-query'],
          utils: ['date-fns', 'lodash-es', 'clsx'],
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
```

### Variables d'environnement (`.env`)

```bash
# Développement
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_APP_TITLE=Oracle Monitor Dashboard

# Production (définies au moment du build)
# VITE_API_URL=https://api.your-domain.com
# VITE_WS_URL=wss://api.your-domain.com
```

### Accès dans le code

```typescript
// Accès typé
const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;
const APP_TITLE = import.meta.env.VITE_APP_TITLE;

// Interface ViteEnv (vite-env.d.ts)
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_APP_TITLE: string;
}
```

---

## Feature Flags

### Fonctionnalités backend (`app/config.py`)

| Indicateur | Défaut | Description |
|------------|--------|-------------|
| `HAS_DIAGNOSTICS_PACK` | `true` | Active les requêtes DBA_HIST_* |
| `ENABLE_KILL_SESSION` | `false` | Autorise la terminaison de session (DBA) |
| `ENABLE_AWR_REPORTS` | `true` | Génération de rapports AWR |
| `ENABLE_AUTO_REFRESH` | `true` | Rafraîchissement automatique par défaut |

### Feature Flags du frontend

Configurés via `src/context/ConnectionContext.tsx` ou des hooks spécifiques aux fonctionnalités :

```typescript
// Exemple : rendu conditionnel basé sur la fonctionnalité
const { hasDiagnosticsPack } = useConnection();

{hasDiagnosticsPack && (
  <Tab label="AWR Reports" />
)}
```

---

## Configuration du thème

### Thème MUI (`src/theme/theme.ts`)

```typescript
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0066CC', light: '#4D94DB', dark: '#004499' },
    secondary: { main: '#FF8C00', light: '#FFB340', dark: '#CC7000' },
    success: { main: '#00A651' },
    warning: { main: '#FF8C00' },
    error: { main: '#D13438' },
    info: { main: '#0078D4' },
    background: { default: '#F5F7FA', paper: '#FFFFFF' },
    // ...
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    // ... h1-h6, body1, body2, button, caption, overline
  },
  components: {
    // Surcharges des composants MUI
    MuiButton: { styleOverrides: { root: { textTransform: 'none' } } },
    MuiDataGrid: { styleOverrides: { root: { border: '1px solid #E1E4E8' } } },
    // ...
  },
});
```

### Mode sombre (`src/theme/theme.ts` + `src/context/SettingsContext.tsx`)

Le mode sombre est **implémenté** et sélectionnable par l'utilisateur depuis **Réglages → Apparence**.
Le fichier de thème exporte un thème clair, un thème sombre et une factory qui sélectionne entre eux :

```typescript
// src/theme/theme.ts
export const theme;                       // thème clair (palette SQL Developer)
export const darkTheme;                   // thème sombre (fond #1E2430, papier #262E3D)
export function createAppTheme(mode: 'light' | 'dark'): Theme;
```

Le choix est fourni par `SettingsContext` (`settings.theme`) et appliqué à la racine dans
`main.tsx` :

```typescript
// src/main.tsx
const ThemedApp = () => {
  const { settings } = useSettings();
  const theme = createAppTheme(settings.theme);
  return <ThemeProvider theme={theme}>...</ThemeProvider>;
};
```

Le mode sélectionné est persisté dans `localStorage` sous la clé `oracle-monitor-settings`
(`{ "theme": "light" | "dark", ... }`) afin de survivre à un rechargement. Le basculer
re-rend toute l'application avec la palette sombre immédiatement.

---

## Configuration de la journalisation

### Structlog (`app/lifespan.py`)

```python
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer() if not settings.DEBUG 
        else structlog.dev.ConsoleRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)
```

### Niveaux de log

| Niveau | Utilisation |
|--------|-------------|
| `DEBUG` | Informations de diagnostic détaillées |
| `INFO` | Informations opérationnelles générales |
| `WARNING` | Inattendu mais géré |
| `ERROR` | Opérations en échec |
| `CRITICAL` | Système inutilisable |

### Sortie des logs

**Développement :** Sortie console mise en forme avec couleurs
**Production :** Lignes JSON pour l'agrégation des logs (ELK, Datadog, etc.)

---

## Configuration des migrations de base de données (`alembic.ini`)

```ini
[alembic]
script_location = alembic
version_locations = %(script_location)s/versions
sqlalchemy.url = driver://user:pass@host/db

[post_write_hooks]
hooks = format
format.type = console_scripts
format.entrypoint = ruff format
format.options = %(script_filename)s
```

### Environnement de migration (`alembic/env.py`)

```python
# Utilise un moteur async pour Oracle
from sqlalchemy.ext.asyncio import async_engine_from_config

def run_migrations_online():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
```

---

## Configuration CI/CD (Exemple GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      oracle:
        image: gvenzl/oracle-free:23-slim
        env:
          ORACLE_PASSWORD: oracle
        ports: [1521:1521]
      redis:
        image: redis:7-alpine
        ports: [6379:6379]
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: cd backend && uv sync --all-extras
      - run: cd backend && uv run pytest -v

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test:run
      - run: cd frontend && npm run lint

  docker-build:
    needs: [backend-test, frontend-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker-compose build
```

---

## Validation de la configuration

### Validation au démarrage

L'application valide la configuration au démarrage :

```python
# Dans le lifespan de app/main.py
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Valide la connexion Oracle
    await oracle_pool.execute_scalar("SELECT 1 FROM DUAL")
    
    # Valide la connexion Redis
    await redis_client.health_check()
    
    # Journalise le résumé de la configuration
    logger.info("Configuration loaded", 
        pool_max=settings.ORACLE_POOL_MAX,
        cache_ttl=settings.CACHE_TTL_DEFAULT,
        diagnostics_pack=settings.HAS_DIAGNOSTICS_PACK,
    )
```

### Contrôle de santé de la configuration

```bash
# Vérifie la configuration via l'API
curl http://localhost:8000/health

# La réponse inclut l'état de la configuration
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "version": "1.0.0"
}
```

---

## Configurations par environnement

### Développement (`.env` + `docker-compose.override.yml`)

```bash
DEBUG=true
LOG_LEVEL=DEBUG
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Staging

```bash
DEBUG=false
LOG_LEVEL=INFO
ORACLE_DSN=staging-db:1521/FREE
CORS_ORIGINS=https://staging.your-domain.com
VITE_API_URL=https://api-staging.your-domain.com
```

### Production

```bash
DEBUG=false
LOG_LEVEL=INFO
ORACLE_DSN=prod-db:1521/FREE
CORS_ORIGINS=https://your-domain.com
VITE_API_URL=https://api.your-domain.com
SECRET_KEY=<from-secret-manager>
ORACLE_PASSWORD=<from-secret-manager>
```

### Gestion des secrets

**Docker Secrets :**
```yaml
# docker-compose.yml
secrets:
  oracle_password:
    file: ./secrets/oracle_password.txt
  secret_key:
    file: ./secrets/secret_key.txt

services:
  backend:
    secrets:
      - oracle_password
      - secret_key
    environment:
      - ORACLE_PASSWORD_FILE=/run/secrets/oracle_password
      - SECRET_KEY_FILE=/run/secrets/secret_key
```

**Stores de secrets externes :**
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Secret Manager

Utilisez des conteneurs init ou des sidecars pour injecter les secrets au runtime.