> **Langue :** français · [English version](../DEPLOYMENT.md)

# Guide de déploiement

## Vue d'ensemble

Ce guide couvre le déploiement de l'Oracle Monitor Dashboard dans les environnements de développement et de production en utilisant Docker Compose.

## Prérequis

### Configuration système

| Composant | Minimum | Recommandé |
|-----------|---------|------------|
| CPU | 2 cœurs | 4+ cœurs |
| RAM | 8 Go | 16+ Go |
| Disque | 20 Go | 50+ Go |
| OS | Linux/macOS/Windows | Linux |

### Configuration logicielle

- Docker Engine 24.0+
- Docker Compose 2.20+
- Git (pour le clonage)

---

## Démarrage rapide

### 1. Cloner le dépôt

```bash
git clone <repository-url>
cd oracle-monitor-dashboard
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
# Modifier .env avec vos paramètres
```

**Variables obligatoires :**
```bash
ORACLE_PASSWORD=secure_password_here
SECRET_KEY=your-32-character-secret-key-minimum
GRAFANA_PASSWORD=admin_secure_password
```

### 3. Démarrer l'environnement de développement

```bash
# Construire et démarrer tous les services
make dev

# Ou manuellement :
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```

### 4. Vérifier le déploiement

```bash
# Vérifier l'état des services
make ps

# Consulter les journaux
make dev-logs

# Points d'accès :
# Frontend : http://localhost:3000
# API Backend : http://localhost:8000
# Docs API : http://localhost:8000/docs
# Grafana : http://localhost:3001 (admin/admin)
# Prometheus : http://localhost:9090
```

---

## Architecture Docker Compose

### Stack de production (`docker-compose.yml`)

```yaml
services:
  oracle:          # Oracle Database 23c Free
    image: gvenzl/oracle-free:23-slim
    ports: [1521, 5500]
    volumes: [oracle_data]
    healthcheck: SQL*Plus connectivity

  redis:           # Redis 7 Alpine
    ports: [6379]
    volumes: [redis_data]
    config: maxmemory 256mb, LRU eviction

  backend:         # FastAPI (2 workers)
    build: ./backend (production target)
    ports: [8000]
    depends_on: [oracle, redis]
    env: ORACLE_DSN=oracle:1521/FREE

  celery-worker:   # Tâches arrière-plan (2 réplicas)
    command: celery worker --concurrency=4
    depends_on: [backend, redis]

  celery-beat:     # Planificateur
    command: celery beat --scheduler PersistentScheduler
    volumes: [celery_beat_data]

  frontend:        # Nginx + build React
    build: ./frontend (production target)
    ports: [3000:80]
    depends_on: [backend]

  prometheus:      # Collecte de métriques
    ports: [9090]
    volumes: [prometheus_data]

  grafana:         # Tableaux de bord
    ports: [3001]
    volumes: [grafana_data]
    provisioning: dashboards, datasources
```

### Remplacement de développement (`docker-compose.override.yml`)

- Montages de volumes pour le rechargement à chaud
- Journalisation de débogage activée
- Frontend sur le port 5173 (serveur de dev Vite)
- Backend avec le flag `--reload`

---

## Détails des services

### Oracle Database

**Image :** `gvenzl/oracle-free:23-slim`

**Configuration :**
- Base de données : `FREE` (CDB)
- PDB : `FREEPDB1`
- Utilisateurs par défaut : `SYS`, `SYSTEM`, `MONITOR`
- EM Express : Port 5500

**Initialisation :** Exécute `scripts/init-db.sql` au premier démarrage pour créer l'utilisateur monitor et les grants.

**Vérification d'état :**
```bash
sqlplus -L sys/password@//localhost:1521/FREE as sysdba @healthcheck.sql
```

**Persistance des données :** Volume `oracle_data` dans `/opt/oracle/oradata`

---

### Redis

**Image :** `redis:7-alpine`

**Configuration :**
- Persistance append-only
- Mémoire max : 256 Mo
- Politique d'éviction : allkeys-lru
- Bases de données : 0 (cache), 1 (broker Celery), 2 (résultats Celery)

---

### Backend (FastAPI)

**Build :** Dockerfile multi-étapes
- Base : `python:3.11-slim`
- Dépendances : `uv` pour des installations rapides
- Production : Utilisateur non-root, bytecode compilé

**Variables d'environnement :**
```bash
ORACLE_USER=monitor
ORACLE_PASSWORD=${ORACLE_PASSWORD}
ORACLE_DSN=oracle:1521/FREE
ORACLE_POOL_MIN=2
ORACLE_POOL_MAX=20
REDIS_URL=redis://redis:6379/0
SECRET_KEY=${SECRET_KEY}
HAS_DIAGNOSTICS_PACK=true
DEBUG=false
LOG_LEVEL=INFO
```

**Workers Gunicorn :** 2 (configurables via `WEB_CONCURRENCY`)

**Vérification d'état :** `GET /health` - vérifie la connectivité Oracle + Redis

---

### Workers Celery

**Worker :** 2 réplicas, 4 concurrences chacun
```bash
celery -A app.celery_app worker -l INFO --concurrency=4
```

**Planificateur Beat :** Planificateur persistant
```bash
celery -A app.celery_app beat -l INFO --scheduler celery.beat.PersistentScheduler
```

**Tâches planifiées :**
| Tâche | Planification | Description |
|-------|---------------|-------------|
| collect_metrics | Toutes les 30s | Collecter les métriques Oracle |
| check_thresholds | Toutes les 60s | Évaluer les seuils d'alerte |
| generate_awr_snapshot | Quotidiennement 02:00 | Créer un snapshot AWR |
| cleanup_old_data | Quotidiennement 03:00 | Purger les anciennes métriques/alertes |

---

### Frontend (Nginx + React)

**Build :** Multi-étapes
1. `node:20-alpine` → `npm ci` → `npm run build`
2. `nginx:alpine` → Copier `dist/` → Configuration nginx personnalisée

**Configuration Nginx :**
- Sert les fichiers statiques depuis `/usr/share/nginx/html`
- Proxy `/api` → `backend:8000`
- Proxy `/ws` → `backend:8000` (upgrade WebSocket)
- Compression Gzip activée
- Endpoint de vérification d'état `/health`

---

### Stack de monitoring

**Prometheus :**
- Scrape le backend `/metrics` toutes les 15s
- Rétention : 15 jours (configurable)
- Stockage : Volume `prometheus_data`

**Grafana :**
- Source de données Prometheus pré-provisionnée
- Provisionnement des tableaux de bord depuis `monitoring/grafana/dashboards/`
- Utilisateur admin issu de la variable d'env `GRAFANA_PASSWORD`

---

## Déploiement en production

### 1. Préparer l'environnement de production

```bash
# Sur le serveur de production
mkdir -p /opt/oracle-monitor
cd /opt/oracle-monitor

# Cloner le dépôt
git clone <repo-url> .

# Générer des secrets sécurisés
openssl rand -base64 32  # Pour SECRET_KEY
openssl rand -base64 32  # Pour GRAFANA_PASSWORD
openssl rand -base64 32  # Pour ORACLE_PASSWORD
```

### 2. Configurer le fichier `.env` de production

```bash
cat > .env << EOF
# Oracle Database
ORACLE_USER=monitor
ORACLE_PASSWORD=your_secure_oracle_password
ORACLE_DSN=oracle:1521/FREE

# Sécurité
SECRET_KEY=your_32_char_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis
REDIS_URL=redis://redis:6379/0

# Fonctionnalités
HAS_DIAGNOSTICS_PACK=true
DEBUG=false
LOG_LEVEL=INFO

# Grafana
GRAFANA_PASSWORD=your_grafana_password

# Frontend (au moment du build)
VITE_API_URL=https://your-domain.com
VITE_WS_URL=wss://your-domain.com
VITE_APP_TITLE=Oracle Monitor Dashboard
EOF
```

### 3. Configuration SSL/TLS (recommandé)

**Option A : Proxy inverse (Nginx/Traefik)**
```nginx
server {
    listen 443 ssl http2;
    server_name monitor.your-domain.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Option B : Load balancer cloud (AWS ALB, GCP LB, Azure Front Door)**
- Terminer le SSL au niveau du load balancer
- Acheminer le HTTP vers le frontend/backend
- Configurer le support WebSocket

### 4. Déployer la stack de production

```bash
# Construire et démarrer la production
make prod

# Ou manuellement :
docker-compose up -d --build

# Vérifier
make ps
make logs
```

### 5. Vérification post-déploiement

```bash
# Vérifier que tous les services sont sains
docker-compose ps

# Tester l'API
curl https://your-domain.com/health

# Tester le frontend
curl -I https://your-domain.com

# Vérifier les métriques
curl https://your-domain.com/metrics
```

---

## Configuration de la base de données

### Option 1 : Oracle embarqué (par défaut)

Docker Compose inclut Oracle 23c Free. Les données persistent dans le volume `oracle_data`.

**Sauvegarde :**
```bash
# Sauvegarde complète
docker exec oracle-monitor-db \
  expdp monitor/password@FREE directory=DATA_PUMP_DIR dumpfile=backup.dmp full=y

# Sauvegarde de schéma
docker exec oracle-monitor-db \
  expdp monitor/password@FREE directory=DATA_PUMP_DIR dumpfile=schema.dmp schemas=MONITOR
```

**Restauration :**
```bash
docker exec oracle-monitor-db \
  impdp monitor/password@FREE directory=DATA_PUMP_DIR dumpfile=backup.dmp full=y
```

---

### Option 2 : Base Oracle externe

Modifier `docker-compose.yml` :

```yaml
# Supprimer le service oracle
# Mettre à jour l'environnement du backend :
backend:
  environment:
    - ORACLE_DSN=your-oracle-host:1521/YOUR_SERVICE
    # ... autres variables
```

**Prérequis :**
- Oracle 19c+ (21c/23c recommandé)
- Utilisateur monitor avec les grants nécessaires (voir `scripts/init-db.sql`)
- Connectivité réseau depuis le conteneur backend

---

## Mise à l'échelle

### Mise à l'échelle horizontale

**Backend :**
```yaml
# docker-compose.yml
backend:
  deploy:
    replicas: 3
  # Ajouter un équilibreur de charge (nginx/traefik) devant
```

**Workers Celery :**
```yaml
celery-worker:
  deploy:
    replicas: 4  # Augmenter pour plus de tâches concurrentes
```

**Frontend :**
```yaml
# Fichiers statiques - mettre à l'échelle via CDN ou plusieurs réplicas nginx
frontend:
  deploy:
    replicas: 2
```

### Mise à l'échelle verticale

Ajuster les limites de ressources dans `docker-compose.yml` :

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: '4G'
        reservations:
          cpus: '2'
          memory: '2G'

  oracle:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: '8G'
```

---

## Sauvegarde et restauration

### Fichiers de configuration à préserver

Deux fichiers JSON sont écrits à l'exécution par le backend et doivent être inclus dans les sauvegardes :

| Fichier | Utilité | Créé quand |
|---------|---------|------------|
| `config/databases.json` | Connexions de bases de données ajoutées (multi-DB) | `POST /api/v1/databases` |
| `config/thresholds.json` | Remplacements de seuils sauvegardés via l'interface | `PUT /api/v1/alerts/thresholds` |

Les deux sont créés paresseusement ; si un conteneur est remplacé sans emporter ces fichiers, les bases de données
ajoutées à l'exécution et les remplacements de seuils sont perdus (les defaults env et la variable d'env `DATABASES_JSON` restent
le filet de sécurité).

### Sauvegardes automatisées

Ajouter à `docker-compose.yml` :

```yaml
backup:
  image: postgres:15  # ou outil de sauvegarde Oracle
  volumes:
    - oracle_data:/data
    - ./backups:/backups
  command: >
    sh -c "while true; do
      expdp monitor/password@FREE directory=DATA_PUMP_DIR dumpfile=backup_\$(date +%Y%m%d).dmp full=y;
      sleep 86400;
    done"
```

### Sauvegarde de volume

```bash
# Sauvegarder les volumes Docker
docker run --rm \
  -v oracle-monitor-dashboard_oracle_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/oracle_data_\$(date +%Y%m%d).tar.gz -C /data .

# Restaurer
docker run --rm \
  -v oracle-monitor-dashboard_oracle_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/oracle_data_20240115.tar.gz -C /data
```

---

## Monitoring et alertes

### Règles Prometheus

Créer `monitoring/prometheus/rules/oracle-monitor.yml` :

```yaml
groups:
  - name: oracle-monitor
    rules:
      - alert: OracleDown
        expr: up{job="oracle-monitor-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Oracle Monitor backend is down"

      - alert: HighTablespaceUsage
        expr: oracle_monitor_tablespace_usage_percent > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Tablespace {{ $labels.tablespace }} > 90%"

      - alert: HighCPUUsage
        expr: oracle_monitor_cpu_usage_percent > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database CPU > 90%"

      - alert: HighSessionUsage
        expr: oracle_monitor_sessions_pct_used > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Session usage > 85%"
```

### Alertes Grafana

Configurer les canaux de notification dans Grafana :
- Email
- Slack
- PagerDuty
- Webhook

---

## Dépannage du déploiement

### Problèmes courants

| Problème | Solution |
|----------|----------|
| Le conteneur Oracle ne démarre pas | Vérifier `docker logs oracle-monitor-db`, s'assurer de 8Go+ RAM |
| Le backend ne peut pas se connecter à Oracle | Vérifier `ORACLE_DSN`, vérifier que le health check Oracle passe |
| Le frontend affiche « Network Error » | Vérifier `VITE_API_URL`, vérifier l'accessibilité du backend |
| Les tâches Celery ne s'exécutent pas | Vérifier la connectivité Redis, `docker logs celery-worker` |
| Les métriques n'apparaissent pas dans Prometheus | Vérifier l'endpoint `/metrics`, vérifier les cibles Prometheus |
| Grafana « No data » | Vérifier le provisioning de la source de données, la connectivité Prometheus |

### Commandes de débogage

```bash
# Oracle
docker exec -it oracle-monitor-db sqlplus monitor/password@FREE

# Shell backend
docker exec -it oracle-monitor-backend bash

# CLI Redis
docker exec -it oracle-monitor-redis redis-cli

# Vérifier le réseau
docker network inspect oracle-monitor-network

# Utilisation des ressources
docker stats
```

---

## Procédure de retour arrière

```bash
# 1. Arrêter le déploiement courant
docker-compose down

# 2. Restaurer la base de données depuis la sauvegarde
docker run --rm -v oracle_data:/data -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/oracle_data_20240115.tar.gz -C /data

# 3. Déployer l'image de la version précédente
docker-compose pull oracle-monitor-backend:v1.0.0
docker-compose up -d

# 4. Vérifier
make ps && make logs
```

---

## Maintenance

### Tâches régulières

| Tâche | Fréquence | Commande |
|-------|-----------|----------|
| Mettre à jour les images | Hebdomadaire | `docker-compose pull && make prod` |
| Nettoyer Docker | Mensuel | `docker system prune -a` |
| Vérifier l'espace disque | Hebdomadaire | `df -h /var/lib/docker` |
| Revoir les alertes | Quotidien | Grafana/Alertmanager |
| Rotation des journaux | Mensuel | Configurer logrotate |

### Rotation des journaux

Ajouter à `/etc/logrotate.d/oracle-monitor` :

```
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```
