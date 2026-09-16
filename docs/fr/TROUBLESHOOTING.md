> **Langue :** français · [English version](../TROUBLESHOOTING.md)

# Guide de Dépannage

## Vue d'ensemble

Ce guide couvre les problèmes courants, leurs causes et les solutions pour l'Oracle Monitor Dashboard.

---

## Diagnostics Rapides

### Endpoints de vérification de santé

```bash
# Overall health
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "version": "1.0.0"
}

# Metrics
curl http://localhost:8000/metrics
```

### État des services

```bash
# Check all containers
make ps

# Or directly:
docker-compose ps

# Check specific service logs
make backend-logs
make frontend-logs
make db-logs
```

---

## Problèmes Oracle Database

### Le conteneur Oracle ne démarre pas

**Symptômes :**
- Le conteneur s'arrête immédiatement
- La vérification de santé échoue
- ORA-01034: ORACLE not available

**Causes et solutions :**

| Cause | Solution |
|-------|----------|
| Mémoire insuffisante | Assurez-vous que 8 Go+ de RAM sont alloués à Docker. Oracle 23c nécessite ~4 Go minimum. |
| Port 1521 déjà utilisé | Vérifiez `lsof -i :1521` et arrêtez le processus en conflit |
| Volume corrompu | `docker volume rm oracle-monitor-dashboard_oracle_data` puis redémarrez |
| Mot de passe invalide | Vérifiez que `ORACLE_PASSWORD` dans `.env` respecte les exigences Oracle |

**Débogage :**
```bash
# Check Oracle logs
docker logs oracle-monitor-db

# Manual health check
docker exec oracle-monitor-db sqlplus -L sys/password@//localhost:1521/FREE as sysdba @/opt/oracle/scripts/startup/healthcheck.sql
```

### Impossible de se connecter à Oracle

**Symptômes :**
- Logs du backend : `DPI-1047: Cannot locate Oracle Client library`
- Timeout de connexion
- ORA-12541: TNS:no listener

**Solutions :**

```bash
# Verify Oracle is healthy
docker exec oracle-monitor-db sqlplus -L sys/password@//localhost:1521/FREE as sysdba

# Check DSN format
# Correct: host:port/service_name
# Example: oracle:1521/FREE

# Verify network connectivity
docker exec oracle-monitor-backend nslookup oracle
docker exec oracle-monitor-backend nc -zv oracle 1521

# Check Oracle listener
docker exec oracle-monitor-db lsnrctl status
```

### Erreurs de requêtes Oracle

**Erreurs courantes :**

| Erreur | Cause | Solution |
|--------|-------|----------|
| ORA-00942: table or view does not exist | Grants manquants | Exécutez les grants de `scripts/init-db.sql` |
| ORA-01031: insufficient privileges | SELECT_CATALOG_ROLE manquant | Accordez SELECT_CATALOG_ROLE à monitor |
| ORA-01435: user does not exist | Utilisateur monitor non créé | Exécutez `scripts/init-db.sql` |
| ORA-12514: TNS:listener does not currently know of service | Nom de service incorrect | Utilisez `FREE` pour Oracle Free, ou vérifiez `lsnrctl status` |

**Débogage de l'accès aux requêtes :**
```bash
# Test monitor user
docker exec -it oracle-monitor-db sqlplus monitor/password@FREE

# Test specific views
SELECT * FROM v$instance;
SELECT * FROM v$session WHERE rownum < 5;
SELECT * FROM v$active_session_history WHERE rownum < 5;
```

---

## Problèmes Backend

### Le backend ne démarre pas

**Symptômes :**
- Le conteneur s'arrête avec le code 1
- `ModuleNotFoundError`
- `pydantic.SettingsError`

**Solutions :**

```bash
# Check logs
make backend-logs

# Common issues:
# 1. Missing .env file
cp .env.example .env
# Edit .env with required values

# 2. Invalid SECRET_KEY (must be 32+ chars)
# Generate: openssl rand -base64 32

# 3. Python path issues
# Ensure PYTHONPATH includes /app

# 4. Dependency conflicts
# Rebuild: make dev-build
```

### Pool de connexions à la base épuisé

**Symptômes :**
- Erreurs `Pool exhausted`
- Réponses de requêtes lentes
- `ORA-00018: maximum number of sessions exceeded`

**Solutions :**

```bash
# Check pool stats
curl http://localhost:8000/health  # Includes pool stats in logs

# Increase pool size in .env
ORACLE_POOL_MAX=50
ORACLE_POOL_MIN=5

# Check for connection leaks
# Ensure all queries use oracle_pool.acquire() context manager

# Monitor Oracle sessions
docker exec oracle-monitor-db sqlplus -s monitor/password@FREE <<EOF
SELECT COUNT(*) FROM v$session WHERE username = 'MONITOR';
EOF
```

### Échec de connexion Redis

**Symptômes :**
- `Redis connection refused`
- Défaillances de cache
- Tâches Celery bloquées

**Solutions :**

```bash
# Check Redis
docker exec oracle-monitor-redis redis-cli ping

# Check Redis memory
docker exec oracle-monitor-redis redis-cli INFO memory

# Restart Redis
docker-compose restart redis

# Check Celery
docker logs oracle-monitor-celery-worker
```

### Les tâches Celery ne s'exécutent pas

**Symptômes :**
- Les métriques ne se mettent pas à jour
- Les vérifications de seuils ne s'exécutent pas
- Les snapshots AWR ne sont pas créés

**Solutions :**

```bash
# Check Celery worker
docker logs oracle-monitor-celery-worker

# Check Celery beat
docker logs oracle-monitor-celery-beat

# Check Redis queues
docker exec oracle-monitor-redis redis-cli KEYS "celery*"

# Restart Celery
docker-compose restart celery-worker celery-beat

# Purge stuck tasks
docker exec oracle-monitor-redis redis-cli FLUSHALL
```

### Problèmes d'authentification

**Symptômes :**
- 401 Unauthorized sur des identifiants valides
- Échec du rafraîchissement de jeton
- Erreurs CORS

**Solutions :**

```bash
# Check SECRET_KEY consistency
# Must be same across all backend instances

# Check token expiration
# Access: 30 min, Refresh: 7 days

# Clear browser storage
# localStorage.removeItem('oracle_monitor_auth')

# Check CORS origins in .env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## Problèmes Frontend

### Le frontend ne se charge pas

**Symptômes :**
- Page blanche
- « Network Error » dans la console
- Serveur de dev Vite ne répond pas

**Solutions :**

```bash
# Check frontend logs
make frontend-logs

# Common issues:
# 1. API URL mismatch
# Check VITE_API_URL in .env matches backend URL

# 2. Port conflicts
# Frontend dev: 5173, Production nginx: 80

# 3. Build cache
docker exec oracle-monitor-frontend rm -rf node_modules/.vite

# 4. Dependencies
docker exec oracle-monitor-frontend npm ci
```

### Les appels API échouent

**Symptômes :**
- Erreurs 401/403 dans l'onglet Network
- Erreurs CORS
- Échec de connexion WebSocket

**Solutions :**

```bash
# Check browser Network tab
# Look for failed requests

# Common issues:
# 1. Token expired
# Auto-refresh should handle this

# 2. CORS
# Backend CORS_ORIGINS must include frontend origin

# 3. WebSocket
# Check VITE_WS_URL in .env
# Must be ws:// or wss:// protocol

# 4. Proxy (dev)
# Vite proxy in vite.config.ts must match backend port
```

### Les graphiques ne s'affichent pas

**Symptômes :**
- Conteneurs de graphiques vides
- Messages « No data available »
- Erreurs Recharts dans la console

**Solutions :**

```bash
# Check data format
# Open browser DevTools → Network → XHR
# Verify API response matches expected TypeScript types

# Common issues:
# 1. Empty data array
# Components show "No data available" placeholder

# 2. Wrong data types
# Ensure numbers are numbers, not strings

# 3. Missing Recharts peer dependencies
# npm install recharts

# 4. Container size
# ResponsiveContainer needs parent with defined height
```

### Déconnexions WebSocket

**Symptômes :**
- Les mises à jour en temps réel s'arrêtent
- « WebSocket disconnected » dans la console
- Reconnexions fréquentes

**Solutions :**

```bash
# Check WebSocket endpoint
# Backend: ws://localhost:8000/ws/{channel}

# Common issues:
# 1. Proxy not forwarding WebSocket
# Nginx needs proxy_http_version 1.1 and upgrade headers

# 2. Firewall/proxy timeout
# Increase proxy_read_timeout

# 3. Heartbeat
# Client sends ping every 30s
# Server responds with pong
```

### Les paramètres ne persistent pas / le mode sombre réinitialise au rechargement

**Symptôme :** les choix de thème ou de rafraîchissement automatique réinitialisent à chaque rechargement.

**Cause :** les paramètres utilisateur existent uniquement dans le navigateur (clé `localStorage` `oracle-monitor-settings`).
L'effacement des données du site, le mode privé ou une erreur de quota de stockage fait revenir l'application aux valeurs par défaut
(`theme: 'light'`, `refreshInterval: 30`, `autoRefresh: true`). Il n'y a pas de copie côté serveur.

**Vérification :**
```js
// Browser console
localStorage.getItem('oracle-monitor-settings')  // → '{"theme":"dark",...}' or null
```

**Solution :** re-sélectionnez les paramètres dans la page Settings (ils sont écrits à chaque changement). Un
flash de thème bloquant le rendu lors du premier affichage (clair → sombre) est normal pendant le chargement du stockage.

---

## Problèmes de Performance

### Chargement lent du dashboard

**Symptômes :**
- Le dashboard prend >10s pour se charger
- Timeouts sur les appels API
- CPU backend élevé

**Solutions :**

```bash
# Check query performance
# Enable slow query logging in Oracle

# Check backend metrics
curl http://localhost:8000/metrics | grep http_request_duration

# Optimize queries
# 1. Add indexes on filtered columns
# 2. Reduce data fetched (SELECT specific columns)
# 3. Increase cache TTL for stable data

# Scale backend
# docker-compose up -d --scale backend=3
```

### Utilisation mémoire élevée

**Symptômes :**
- Kills OOM des conteneurs
- Temps de réponse lents
- Swap utilisé intensivement

**Solutions :**

```bash
# Check memory usage
docker stats

# Backend limits (docker-compose.yml)
deploy:
  resources:
    limits:
      memory: 2G
    reservations:
      memory: 1G

# Oracle limits
# Oracle Free has internal limits
# Consider Oracle SE2/EE for production

# Redis memory
# maxmemory 256mb in redis.conf
```

### Requêtes Oracle lentes

**Diagnostic :**
```sql
-- Find slow queries
SELECT sql_text, elapsed_time/1e6 as secs, executions
FROM v$sqlstats
WHERE elapsed_time/1e6 > 5
ORDER BY elapsed_time DESC;

-- Check execution plans
EXPLAIN PLAN FOR <query>;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
```

**Optimisation :**
- Ajouter des index sur les colonnes de filtrage des vues `v$` (limité)
- Augmenter `CACHE_TTL_*` pour les données stables
- Utiliser des vues matérialisées pour les agrégations complexes
- Considérer Oracle Result Cache

---

## Problèmes de Données

### Métriques incorrectes

**Symptômes :**
- Valeurs erronées dans le dashboard
- Pourcentages négatifs
- Points de données manquants

**Causes et solutions :**

| Problème | Cause | Solution |
|----------|-------|----------|
| % utilisé négatif | Calcul du tablespace temporaire | Utilisez `v$temp_space_header` pour le temp |
| Zéro sessions | Filtre incorrect | Vérifiez le filtre `type = 'USER'` |
| Données ASH manquantes | Pas d'activité | ASH n'échantillonne que les sessions actives |
| Temps d'attente erronés | Microsecondes vs secondes | Divisez `time_waited_micro` par 1 000 000 |
| Données AWR manquantes | Diagnostics Pack | Définissez `HAS_DIAGNOSTICS_PACK=false` |

### Données historiques manquantes

**Symptômes :**
- Pas de données dans les vues historiques du Performance Hub
- Rapports AWR vides
- Planification de capacité vide

**Solutions :**

```bash
# Check Diagnostics Pack
# In .env: HAS_DIAGNOSTICS_PACK=true

# Verify AWR snapshots
docker exec oracle-monitor-db sqlplus -s monitor/password@FREE <<EOF
SELECT COUNT(*) FROM dba_hist_snapshot;
EOF

# Check AWR retention
docker exec oracle-monitor-db sqlplus -s monitor/password@FREE <<EOF
SELECT * FROM dba_hist_wr_control;
EOF

# Force snapshot
docker exec oracle-monitor-db sqlplus -s monitor/password@FREE <<EOF
EXEC DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT;
EOF
```

### Le rapport AWR échoue avec « crosses an instance restart »

**Symptôme :** la génération d'un rapport AWR (page Reports) retourne une bannière d'erreur :
*« The selected snapshot range X-Y crosses an instance restart. Pick a range within a single startup window. »*

**Cause :** les `snap_id_start`/`snap_id_end` sélectionnés encadrent un redémarrage de la base ; Oracle déclenche
`ORA-20019` (`database instance re-started during specified snapshot interval`) et ne peut pas afficher
les données AWR au-delà de la coupure.

**Solution :** choisissez une paire début/fin de snapshots dans une même fenêtre de démarrage. La liste des snapshots indique
le `startupTime` de chaque snapshot — sélectionnez une plage où les deux snapshots partagent le même `startupTime`. C'est une
contrainte connue de `DBMS_WORKLOAD_REPOSITORY`, pas un bug du dashboard.

**Note backend :** l'endpoint convertit `ORA-20019` (détecté via `"20019"` ou
`"re-started during specified snapshot interval"`) en HTTP 400 ; les autres échecs de génération retournent 500.

---

## Problèmes de Déploiement

### Échecs de build Docker

**Erreurs courantes :**

| Erreur | Solution |
|--------|----------|
| `no space left on device` | `docker system prune -a` |
| `failed to solve` | Vérifiez la syntaxe du Dockerfile, la connectivité réseau |
| `permission denied` | Vérifiez les permissions de fichiers, l'utilisateur dans le Dockerfile |
| `package not found` | Vérifiez le nom du paquet, l'accès au registry |

### Boucles de redémarrage de conteneur

**Diagnostic :**
```bash
# Check restart count
docker ps -a

# View logs before crash
docker logs --tail 100 <container_name>

# Common causes:
# 1. Health check failing
# 2. OOM kill
# 3. Configuration error
# 4. Dependency not ready (depends_on)
```

### Problèmes de permissions de volume

**Symptômes :**
- Oracle ne peut pas écrire dans les fichiers de données
- Redis ne peut pas écrire l'AOF
- Grafana ne peut pas écrire les dashboards

**Solutions :**
```bash
# Fix ownership
sudo chown -R 1000:1000 ./data/oracle
sudo chown -R 999:999 ./data/redis
sudo chown -R 472:472 ./data/grafana

# Or run containers as root (not recommended)
# user: root in docker-compose.yml
```

---

## Problèmes de Supervision et d'Alertes

### Prometheus ne scrape pas

**Solutions :**
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check backend /metrics
curl http://localhost:8000/metrics

# Check Prometheus config
cat monitoring/prometheus.yml
```

### Grafana « No Data »

**Solutions :**
```bash
# Check datasource
# Grafana → Connections → Data sources → Prometheus → Test

# Check dashboard queries
# Grafana → Dashboards → Oracle Monitor → Edit panel → Query inspector

# Check Prometheus retention
# prometheus.yml: retention.time: 15d
```

### Les modifications de seuils « ne restent pas » / réinitialisent après redémarrage

**Symptôme :** les valeurs de seuils enregistrées dans Settings → Alerts sont perdues après un déploiement ou affichent
à nouveau les valeurs par défaut de l'environnement.

**Cause :** les remplacements sont persistés par le backend dans `config/thresholds.json`. Si le conteneur est
recréé sans préserver le répertoire `config/` (ou si le fichier n'est pas dans l'image),
`GET /alerts/thresholds` revient aux valeurs par défaut de l'environnement.

**Vérification :**
```bash
docker exec oracle-monitor-backend cat /app/config/thresholds.json
# → must contain {"tablespaceWarn": 85, ...}; empty/missing = defaults active
```

**Solution :** incluez `config/thresholds.json` dans votre image ou volume (voir
`docs/DEPLOYMENT.md` → « Config Files to Preserve »). Pour restaurer les valeurs par défaut, supprimez le fichier ou appelez
`PUT /alerts/thresholds` avec un payload partiel vide.

---

## Checklist de Débogage

### Quand quelque chose casse

1. **Vérifier les endpoints de santé**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Vérifier les logs**
   ```bash
   make logs | grep -i error
   ```

3. **Vérifier la connectivité**
   ```bash
   # Backend → Oracle
   docker exec oracle-monitor-backend nc -zv oracle 1521
   
   # Backend → Redis
   docker exec oracle-monitor-backend nc -zv redis 6379
   ```

4. **Vérifier l'utilisation des ressources**
   ```bash
   docker stats --no-stream
   df -h
   ```

5. **Redémarrer les services dans l'ordre**
   ```bash
   docker-compose restart redis
   docker-compose restart backend
   docker-compose restart frontend
   ```

6. **Réinitialisation complète si nécessaire**
   ```bash
   make reset
   ```

---

## Obtenir de l'aide

### Collecte de logs pour le support

```bash
# Collect all logs
mkdir -p debug_logs
make backend-logs > debug_logs/backend.log 2>&1
make frontend-logs > debug_logs/frontend.log 2>&1
make db-logs > debug_logs/oracle.log 2>&1
docker-compose ps > debug_logs/status.txt
docker stats --no-stream > debug_logs/resources.txt

# Package
tar czf debug_logs.tar.gz debug_logs/
```

### Informations utiles à inclure

- Version Docker : `docker --version`
- Version Docker Compose : `docker-compose --version`
- OS : `uname -a`
- Fichier `.env` (masqué)
- Messages d'erreur (traces complètes)
- Étapes pour reproduire
- Comportement attendu vs réel

---

## FAQ

### Général

**Q : Puis-je utiliser cela avec Oracle Standard Edition ?**
R : Oui, mais certaines fonctionnalités nécessitent le Diagnostics Pack (uniquement Enterprise Edition).

**Q : Quelles versions d'Oracle sont supportées ?**
R : 19c, 21c, 23c. Testé principalement sur 23c Free.

**Q : Puis-je superviser plusieurs bases de données ?**
R : Oui. Le support multi-base de données est implémenté : un pool `oracledb` par base, la base active est routée via l'en-tête `X-Database`. Configurez des bases supplémentaires via la variable d'environnement `DATABASES_JSON` (voir `docs/FEATURES.md`) ou le dialogue « Ajouter une base de données... » dans l'en-tête (persisté dans `config/databases.json`). PRIMARY est toujours la connexion `ORACLE_*`.

**Q : Est-ce prêt pour la production ?**
R : Statut MVP. Revoyez la sécurité, la montée en charge et la haute disponibilité avant une utilisation en production.

### Licences

**Q : Est-ce que cela nécessite le Diagnostics Pack Oracle ?**
R : Non pour les fonctionnalités en temps réel. Oui pour les rapports historiques AWR, la planification de capacité et les conseillers mémoire.

**Q : Qu'en est-il de la licence Oracle ?**
R : Oracle Free 23c est gratuit pour le développement/test. La production nécessite les licences Oracle appropriées.

### Sécurité

**Q : Comment activer HTTPS ?**
R : Utilisez un reverse proxy (Nginx/Traefik) avec terminaison SSL. Voir DEPLOYMENT.md.

**Q : Comment faire tourner les secrets ?**
R : Mettez à jour `.env`, redémarrez le backend. Utilisez Docker secrets ou un gestionnaire de secrets externe pour la production.

**Q : Y a-t-il un audit logging ?**
R : Les actions de kill de session sont journalisées. Ajoutez un middleware d'audit pour les appels API si nécessaire.
