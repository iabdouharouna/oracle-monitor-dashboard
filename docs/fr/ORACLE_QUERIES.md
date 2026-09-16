> **Langue :** français · [English version](../ORACLE_QUERIES.md)

# Référence des Requêtes Oracle

## Vue d'ensemble

Ce document recense toutes les vues V$ Oracle et requêtes utilisées par l'Oracle Monitor Dashboard. Les requêtes sont organisées par module fonctionnel et incluent les sources de vues, les privilèges requis et les descriptions des paramètres.

> Le SQL de production se trouve dans `backend/app/core/oracle_queries.py` (40 constantes de requêtes +
> le builder `get_drilldown_query()`). L'AWR utilise du SQL autonome dans
> `app/services/awr_service.py`. Les extraits ci-dessous documentent les requêtes à titre de catalogue ;
> préférez toujours les définitions des constantes lors de modifications de comportement.

## Privilèges Requis

L'utilisateur de supervision (`monitor`) nécessite ces grants :

```sql
-- Core V$ views
GRANT SELECT ON v_$instance TO monitor;
GRANT SELECT ON v_$database TO monitor;
GRANT SELECT ON v_$version TO monitor;
GRANT SELECT ON v_$session TO monitor;
GRANT SELECT ON v_$session_wait TO monitor;
GRANT SELECT ON v_$system_event TO monitor;
GRANT SELECT ON v_$sysstat TO monitor;
GRANT SELECT ON v_$sys_time_model TO monitor;
GRANT SELECT ON v_$sql TO monitor;
GRANT SELECT ON v_$sqlstats TO monitor;
GRANT SELECT ON v_$sql_monitor TO monitor;
GRANT SELECT ON v_$sql_plan TO monitor;
GRANT SELECT ON v_$active_session_history TO monitor;
GRANT SELECT ON v_$sgastat TO monitor;
GRANT SELECT ON v_$sgainfo TO monitor;
GRANT SELECT ON v_$pgastat TO monitor;
GRANT SELECT ON v_$librarycache TO monitor;
GRANT SELECT ON v_$iostat_function TO monitor;
GRANT SELECT ON v_$sysmetric TO monitor;
GRANT SELECT ON v_$sysmetric_history TO monitor;
GRANT SELECT ON v_$osstat TO monitor;
GRANT SELECT ON v_$process TO monitor;
GRANT SELECT ON v_$log TO monitor;
GRANT SELECT ON v_$log_history TO monitor;
GRANT SELECT ON v_$archived_log TO monitor;
GRANT SELECT ON v_$tablespace TO monitor;
GRANT SELECT ON v_$temp_space_header TO monitor;
GRANT SELECT ON v_$parameter TO monitor;
GRANT SELECT ON v_$resource_limit TO monitor;
GRANT SELECT ON v_$pq_tqstat TO monitor;
GRANT SELECT ON v_$session_longops TO monitor;
GRANT SELECT ON v_$memory_target_advice TO monitor;
GRANT SELECT ON v_$sga_target_advice TO monitor;
GRANT SELECT ON v_$pga_target_advice TO monitor;

-- DBA views (require Diagnostics Pack)
GRANT SELECT ON dba_tablespaces TO monitor;
GRANT SELECT ON dba_data_files TO monitor;
GRANT SELECT ON dba_temp_files TO monitor;
GRANT SELECT ON dba_free_space TO monitor;
GRANT SELECT ON dba_segments TO monitor;
GRANT SELECT ON dba_objects TO monitor;
GRANT SELECT ON dba_hist_snapshot TO monitor;
GRANT SELECT ON dba_hist_sqlstat TO monitor;
GRANT SELECT ON dba_hist_sqltext TO monitor;
GRANT SELECT ON dba_hist_active_sess_history TO monitor;
GRANT SELECT ON dba_hist_system_event TO monitor;
GRANT SELECT ON dba_hist_tbspc_space_usage TO monitor;
GRANT SELECT ON dba_hist_sql_monitor TO monitor;

-- Alert log
GRANT SELECT ON x$dbgalertext TO monitor;
```

---

## Module : Instance Viewer

### 1. Informations de la base de données
**Vue :** `v$instance`, `v$database`, `v$version`

```sql
SELECT 
    i.instance_name,
    i.version,
    i.host_name,
    i.platform_name,
    TO_CHAR(i.startup_time, 'YYYY-MM-DD HH24:MI:SS') as startup_time,
    i.log_mode,
    d.database_role,
    i.instance_number,
    d.name as db_name
FROM v$instance i
JOIN v$database d ON 1=1
```

**Résultat :** Nom de l'instance, version, hôte, plateforme, heure de démarrage, mode de journalisation, rôle de la base, numéro d'instance

---

### 2. Durée de fonctionnement de l'instance
**Vue :** `v$instance`

```sql
SELECT FLOOR((SYSDATE - startup_time) * 86400) as uptime_seconds
FROM v$instance
```

**Résultat :** Durée de fonctionnement en secondes

---

### 3. Résumé des clients
**Vue :** `v$session`

```sql
SELECT 
    machine,
    program,
    module,
    COUNT(*) as session_count
FROM v$session
WHERE type = 'USER'
GROUP BY machine, program, module
ORDER BY session_count DESC
```

**Résultat :** Machine, programme, module, nombre de sessions par groupe

---

### 4. Métriques de processus
**Vue :** `v$process`, `v$sysstat`

```sql
SELECT 
    (SELECT COUNT(*) FROM v$process) as process_count,
    (SELECT value FROM v$sysstat WHERE name = 'execute count') as exec_count,
    (SELECT value FROM v$sysstat WHERE name = 'parse count (total)') as parse_count,
    (SELECT value FROM v$sysstat WHERE name = 'opened cursors current') as open_cursors,
    (SELECT value FROM v$sysstat WHERE name = 'user commits') as commits,
    (SELECT value FROM v$sysstat WHERE name = 'user rollbacks') as rollbacks
FROM dual
```

**Résultat :** Nombre de processus, nombre d'exécutions, nombre d'analyses, curseurs ouverts, commits, rollbacks

---

### 5. Métriques mémoire (SGA)
**Vue :** `v$sgastat`, `v$sgainfo`

```sql
-- SGA breakdown
SELECT pool, name, bytes
FROM v$sgastat
WHERE pool IS NOT NULL

-- SGA info (configured sizes)
SELECT name, ROUND(bytes / 1024 / 1024, 2) as size_mb
FROM v$sgainfo
WHERE name IN (
    'Maximum SGA Size',
    'Shared Pool Size',
    'Buffer Cache Size',
    'Large Pool Size',
    'Java Pool Size',
    'Streams Pool Size',
    'Redo Buffers',
    'Fixed SGA Size'
)
```

**Résultat :** Répartition des pools SGA, tailles configurées des composants

**Espace libre du shared pool (pour le KPI de la page Mémoire) :** `InstanceService.get_memory()` dérive
`shared_pool_free_mb` à partir de la ligne `v$sgastat` avec `pool='shared pool'` / `name='free memory'`
(conversion octets → MB), exposé au frontend sous le nom `sharedPoolFreeMB` (`SGAMetrics`). La page Mémoire
calcule le KPI « Shared Pool Free % » comme `sharedPoolFreeMB / sharedPoolMB * 100`.

---

### 6. Métriques PGA
**Vue :** `v$pgastat`

```sql
SELECT name, value
FROM v$pgastat
```

**Métriques clés :** cible PGA agrégée, total alloué, total utilisé, % de hit du cache, max alloué

---

### 7. Taux de hit du Buffer Cache
**Vue :** `v$sysstat`

```sql
SELECT 
    (1 - (physical_reads / (consistent_gets + db_block_gets))) * 100 as hit_ratio
FROM (
    SELECT 
        SUM(DECODE(name, 'physical reads', value, 0)) as physical_reads,
        SUM(DECODE(name, 'consistent gets', value, 0)) as consistent_gets,
        SUM(DECODE(name, 'db block gets', value, 0)) as db_block_gets
    FROM v$sysstat
    WHERE name IN ('physical reads', 'consistent gets', 'db block gets')
)
```

---

### 8. Taux de hit du Library Cache
**Vue :** `v$librarycache`

```sql
SELECT 
    namespace,
    gets,
    gethits,
    pins,
    pinhits,
    reloads,
    invalidations
FROM v$librarycache
```

**Calcul :** `(gethits / gets) * 100` pour le taux de hit, `(pinhits / pins) * 100` pour le taux de hit des pins

---

### 9. Tablespaces
**Vue :** `dba_tablespaces`, `dba_data_files`, `dba_free_space`, `dba_temp_files`, `v$temp_space_header`

```sql
-- Permanent and Undo tablespaces
SELECT 
    t.tablespace_name,
    t.contents,
    t.status,
    ROUND(SUM(d.bytes) / 1024 / 1024, 2) as size_mb,
    ROUND(SUM(NVL(d.bytes, 0) - NVL(f.bytes, 0)) / 1024 / 1024, 2) as used_mb,
    ROUND(SUM(NVL(f.bytes, 0)) / 1024 / 1024, 2) as free_mb,
    ROUND(100 * SUM(NVL(d.bytes, 0) - NVL(f.bytes, 0)) / NULLIF(SUM(d.bytes), 0), 1) as pct_used,
    MAX(d.autoextensible) as autoextensible,
    MAX(d.maxbytes) / 1024 / 1024 as max_size_mb
FROM dba_tablespaces t
LEFT JOIN dba_data_files d ON t.tablespace_name = d.tablespace_name
LEFT JOIN (
    SELECT tablespace_name, SUM(bytes) as bytes
    FROM dba_free_space
    GROUP BY tablespace_name
) f ON t.tablespace_name = f.tablespace_name
WHERE t.contents IN ('PERMANENT', 'UNDO')
GROUP BY t.tablespace_name, t.contents, t.status

UNION ALL

-- Temporary tablespaces
SELECT 
    t.tablespace_name,
    t.contents,
    t.status,
    ROUND(SUM(d.bytes) / 1024 / 1024, 2) as size_mb,
    ROUND(SUM(NVL(d.bytes, 0) - NVL(f.bytes, 0)) / 1024 / 1024, 2) as used_mb,
    ROUND(SUM(NVL(f.bytes, 0)) / 1024 / 1024, 2) as free_mb,
    ROUND(100 * SUM(NVL(d.bytes, 0) - NVL(f.bytes, 0)) / NULLIF(SUM(d.bytes), 0), 1) as pct_used,
    MAX(d.autoextensible) as autoextensible,
    MAX(d.maxbytes) / 1024 / 1024 as max_size_mb
FROM dba_tablespaces t
LEFT JOIN dba_temp_files d ON t.tablespace_name = d.tablespace_name
LEFT JOIN (
    SELECT tablespace_name, SUM(bytes_free) as bytes
    FROM v$temp_space_header
    GROUP BY tablespace_name
) f ON t.tablespace_name = f.tablespace_name
WHERE t.contents = 'TEMPORARY'
GROUP BY t.tablespace_name, t.contents, t.status
```

---

### 10. Redo Logs
**Vue :** `v$log`, `v$log_history`

```sql
SELECT 
    l.group#,
    l.members,
    ROUND(l.bytes / 1024 / 1024, 2) as size_mb,
    l.status,
    COALESCE(h.switches_per_hour, 0) as switches_per_hour
FROM v$log l
LEFT JOIN (
    SELECT thread#, COUNT(*) as switches_per_hour
    FROM v$log_history
    WHERE first_time > SYSDATE - 1/24
    GROUP BY thread#
) h ON l.thread# = h.thread#
```

---

### 11. Taux d'archivage
**Vue :** `v$archived_log`

```sql
SELECT 
    COUNT(*) as archives_per_hour,
    ROUND(SUM(blocks * block_size) / 1024 / 1024, 2) as mb_per_hour
FROM v$archived_log
WHERE completion_time > SYSDATE - 1/24
```

---

### 12. Ratio CPU
**Vue :** `v$sys_time_model`, `v$osstat`

```sql
SELECT 
    ROUND(100 * tm.db_cpu / NULLIF(os.cpu_count * 1000000, 0), 2) as db_cpu_pct,
    ROUND(100 * tm.background_cpu / NULLIF(os.cpu_count * 1000000, 0), 2) as bg_cpu_pct,
    tm.db_time / 1000000 as db_time_per_sec
FROM (
    SELECT 
        SUM(DECODE(stat_name, 'DB CPU', value, 0)) as db_cpu,
        SUM(DECODE(stat_name, 'background cpu time', value, 0)) as background_cpu,
        SUM(DECODE(stat_name, 'DB time', value, 0)) as db_time
    FROM v$sys_time_model
) tm
CROSS JOIN (
    SELECT value as cpu_count FROM v$osstat WHERE stat_name = 'NUM_CPUS'
) os
```

---

### 13. Top SQL
**Vue :** `v$sqlstats`

```sql
SELECT 
    sql_id,
    plan_hash_value,
    executions,
    ROUND(elapsed_time / 1e6, 2) as elapsed_time_sec,
    ROUND(cpu_time / 1e6, 2) as cpu_time_sec,
    buffer_gets,
    disk_reads,
    rows_processed,
    SUBSTR(sql_text, 1, 200) as sql_text
FROM v$sqlstats
WHERE executions > 0
ORDER BY cpu_time DESC
FETCH FIRST :limit ROWS ONLY
```

---

### 14. Événements d'attente système
**Vue :** `v$system_event`

```sql
SELECT 
    event,
    wait_class,
    total_waits,
    ROUND(time_waited_micro / 1e6, 2) as time_waited_sec,
    ROUND(time_waited_micro / NULLIF(total_waits, 0) / 1000, 2) as avg_wait_ms,
    ROUND(100 * time_waited_micro / NULLIF(SUM(time_waited_micro) OVER (), 0), 2) as pct_db_time
FROM v$system_event
WHERE wait_class != 'Idle'
ORDER BY time_waited_micro DESC
```

---

## Module : Sessions

### 15. Liste des sessions
**Vue :** `v$session`

```sql
SELECT 
    s.sid,
    s.serial#,
    s.username,
    s.machine,
    s.program,
    s.module,
    s.action,
    TO_CHAR(s.logon_time, 'YYYY-MM-DD HH24:MI:SS') as logon_time,
    s.last_call_et,
    s.status,
    s.state,
    s.wait_class,
    s.event,
    s.seconds_in_wait,
    s.blocking_session,
    s.blocking_instance,
    s.sql_id,
    s.prev_sql_id,
    ROUND(s.pga_alloc_mem / 1024 / 1024, 2) as pga_allocated_mb,
    ROUND(s.pga_used_mem / 1024 / 1024, 2) as pga_used_mb
FROM v$session s
WHERE s.type = 'USER'
ORDER BY s.status DESC, s.last_call_et DESC
```

---

### 16. Sessions bloquantes
**Vue :** `v$session`, `dba_objects`

```sql
SELECT 
    s.sid,
    s.serial#,
    s.username,
    s.module,
    s.machine,
    s.blocking_session,
    s.blocking_instance,
    s.seconds_in_wait,
    s.event,
    o.object_name
FROM v$session s
LEFT JOIN dba_objects o ON s.row_wait_obj# = o.object_id
WHERE s.blocking_session IS NOT NULL
  AND s.type = 'USER'
```

---

### 17. Opérations longues
**Vue :** `v$session_longops`

```sql
SELECT 
    sid,
    serial#,
    opname,
    target,
    ROUND(sofar / NULLIF(totalwork, 0) * 100, 1) as pct_done,
    ROUND(elapsed_seconds, 1) as elapsed_sec,
    ROUND(time_remaining, 1) as remaining_sec,
    message
FROM v$session_longops
WHERE sofar < totalwork
  AND totalwork > 0
ORDER BY elapsed_seconds DESC
```

---

## Module : SQL Monitor

### 18. SQL Monitor actif
**Vue :** `v$sql_monitor`

```sql
SELECT 
    m.sql_id,
    m.sql_exec_id,
    m.status,
    ROUND(m.elapsed_time / 1e6, 2) as duration_sec,
    ROUND(m.cpu_time / 1e6, 2) as cpu_time_sec,
    ROUND(m.user_io_wait_time / 1e6, 2) as io_time_sec,
    m.sql_text,
    m.username,
    m.module,
    m.px_servers,
    TO_CHAR(m.sql_exec_start, 'YYYY-MM-DD HH24:MI:SS') as start_time,
    TO_CHAR(m.last_refresh_time, 'YYYY-MM-DD HH24:MI:SS') as last_refresh_time
FROM v$sql_monitor m
WHERE m.status LIKE 'EXECUTING%' 
   OR m.last_refresh_time > SYSDATE - 1/1440
ORDER BY m.last_refresh_time DESC
```

---

### 19. Détail SQL Monitor
**Vue :** `v$sql_monitor`

```sql
SELECT 
    m.sql_id,
    m.sql_exec_id,
    m.plan_hash_value,
    m.status,
    ROUND(m.elapsed_time / 1e6, 2) as duration_sec,
    ROUND(m.cpu_time / 1e6, 2) as cpu_time_sec,
    ROUND(m.user_io_wait_time / 1e6, 2) as io_time_sec,
    m.sql_text,
    m.username,
    m.module,
    m.px_servers,
    m.executions,
    m.buffer_gets,
    m.disk_reads,
    m.disk_writes,
    m.physical_read_requests,
    m.physical_read_bytes,
    m.physical_write_requests,
    m.physical_write_bytes,
    TO_CHAR(m.sql_exec_start, 'YYYY-MM-DD HH24:MI:SS') as start_time,
    TO_CHAR(m.last_refresh_time, 'YYYY-MM-DD HH24:MI:SS') as last_refresh_time
FROM v$sql_monitor m
WHERE m.sql_id = :sql_id AND m.sql_exec_id = :sql_exec_id
```

---

### 20. Plan d'exécution
**Vue :** `v$sql_plan`

```sql
SELECT 
    id,
    parent_id,
    operation,
    options,
    object_name,
    cost,
    cardinality,
    bytes,
    optimizer,
    distribution,
    access_predicates,
    filter_predicates
FROM v$sql_plan
WHERE sql_id = :sql_id AND plan_hash_value = :plan_hash_value
ORDER BY id
```

---

### 21. Détails de parallélisme
**Vue :** `v$pq_tqstat`

```sql
SELECT 
    dfo_number,
    tq_id,
    server_type,
    num_rows,
    bytes,
    open_time,
    avg_latency
FROM v$pq_tqstat
WHERE dfo_number IN (
    SELECT dfo_number FROM v$pq_tqstat WHERE sql_id = :sql_id
)
ORDER BY dfo_number, tq_id, server_type
```

---

## Module : Performance Hub (ASH)

### 22. Série temporelle AAS
**Vue :** `v$active_session_history`

```sql
SELECT 
    TO_CHAR(sample_time, 'YYYY-MM-DD HH24:MI:SS') as time_bucket,
    wait_class,
    COUNT(*) * 10 / 60 as aas,
    COUNT(*) as samples
FROM v$active_session_history
WHERE sample_time > SYSDATE - :hours/24
  AND session_type = 'FOREGROUND'
  AND wait_class != 'Idle'
GROUP BY TO_CHAR(sample_time, 'YYYY-MM-DD HH24:MI:SS'), wait_class
ORDER BY time_bucket
```

**Note :** ASH échantillonne toutes les secondes. `COUNT(*) * 10 / 60` convertit les échantillons de 10 secondes en Sessions Actives Moyennes par minute.

---

### 23. Top SQL par ASH
**Vue :** `v$active_session_history`, `v$sql`

```sql
SELECT 
    ash.sql_id,
    COUNT(*) as samples,
    ROUND(COUNT(*) * 10 / 3600, 2) as aas,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as pct_db_time,
    SUBSTR(st.sql_text, 1, 100) as sql_text
FROM v$active_session_history ash
LEFT JOIN v$sql st ON ash.sql_id = st.sql_id
WHERE ash.sample_time > SYSDATE - :hours/24
  AND ash.session_type = 'FOREGROUND'
GROUP BY ash.sql_id, SUBSTR(st.sql_text, 1, 100)
ORDER BY samples DESC
FETCH FIRST 20 ROWS ONLY
```

---

### 24. Détaillage ASH
**Vue :** `v$active_session_history`

```sql
SELECT 
    ash.{dimension} as dimension_value,
    ash.{filter_dimension} as filter_value,
    COUNT(*) as samples,
    ROUND(COUNT(*) * 10 / 3600, 2) as aas,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as pct_total
FROM v$active_session_history ash
WHERE ash.sample_time > SYSDATE - :hours/24
  AND ash.session_type = 'FOREGROUND'
  AND ash.wait_class != 'Idle'
GROUP BY ash.{dimension}, ash.{filter_dimension}
ORDER BY samples DESC
FETCH FIRST 20 ROWS ONLY
```

**Dimensions valides :** `wait_class`, `event`, `sql_id`, `username`, `machine`, `module`, `action`

---

### 25. Répartition des classes d'attente
**Vue :** `v$active_session_history`

```sql
SELECT 
    wait_class,
    COUNT(*) as samples,
    ROUND(COUNT(*) * 10 / 3600, 2) as aas,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as pct_total
FROM v$active_session_history
WHERE sample_time > SYSDATE - :hours/24
  AND session_type = 'FOREGROUND'
  AND wait_class != 'Idle'
GROUP BY wait_class
ORDER BY samples DESC
```

---

## Module : Stockage (Avancé)

### 26. Datafiles
**Vue :** `dba_data_files`, `dba_tablespaces`

```sql
SELECT 
    df.file_id,
    df.file_name,
    df.tablespace_name,
    ROUND(df.bytes / 1024 / 1024, 2) as size_mb,
    ROUND(df.maxbytes / 1024 / 1024, 2) as max_size_mb,
    df.autoextensible,
    ROUND(df.increment_by * t.block_size / 1024 / 1024, 2) as increment_mb,
    df.status,
    df.online_status
FROM dba_data_files df
JOIN dba_tablespaces t ON df.tablespace_name = t.tablespace_name
ORDER BY df.tablespace_name, df.file_id
```

---

### 27. Top segments
**Vue :** `dba_segments`

```sql
SELECT 
    owner,
    segment_name,
    segment_type,
    ROUND(bytes / 1024 / 1024, 2) as size_mb,
    extents
FROM dba_segments
WHERE tablespace_name = :tablespace_name
ORDER BY bytes DESC
FETCH FIRST 20 ROWS ONLY
```

---

### 28. Tendance de croissance des tablespaces
**Vue :** `dba_hist_tbspc_space_usage`, `v$tablespace`

```sql
SELECT 
    TO_CHAR(rtime, 'YYYY-MM-DD') as date,
    ROUND(space_used / 1024 / 1024, 2) as used_mb,
    ROUND(space_allocated / 1024 / 1024, 2) as allocated_mb
FROM dba_hist_tbspc_space_usage
WHERE tablespace_id = (
    SELECT ts# FROM v$tablespace WHERE name = :tablespace_name
)
  AND rtime > SYSDATE - 30
ORDER BY rtime
```

**Note :** Nécessite la licence Diagnostics Pack.

---

## Module : Conseillers Mémoire

### 29. Conseil SGA Target
**Vue :** `v$sga_target_advice`

```sql
SELECT 
    sga_size_factor,
    estd_db_time_factor,
    estd_physical_reads_factor
FROM v$sga_target_advice
```

**Résultat :** Facteur de taille (1.0 = actuel), facteur estimé du temps DB, facteur estimé des lectures physiques

---

### 30. Conseil PGA Target
**Vue :** `v$pga_target_advice`

```sql
SELECT 
    pga_target_factor,
    estd_db_time_factor,
    estd_physical_reads_factor
FROM v$pga_target_advice
```

---

### 31. Conseil Memory Target (AMM)
**Vue :** `v$memory_target_advice`

```sql
SELECT 
    memory_size_factor,
    estd_db_time_factor,
    estd_physical_reads_factor
FROM v$memory_target_advice
```

---

## Module : Événements d'attente

### 32. Métriques E/S
**Vue :** `v$sysmetric`

```sql
SELECT metric_name, value
FROM v$sysmetric
WHERE metric_name IN (
    'Physical Reads Per Sec',
    'Physical Writes Per Sec',
    'Physical Read Total Bytes Per Sec',
    'Physical Write Total Bytes Per Sec',
    'Redo Generated Per Sec',
    'Database Time Per Sec',
    'CPU Usage Per Sec',
    'Logons Per Sec'
)
```

---

### 33. Latence E/S
**Vue :** `v$iostat_function`

```sql
SELECT 
    ROUND(AVG(DECODE(name, 'physical read total latency', value, NULL)), 2) as avg_read_latency_ms,
    ROUND(AVG(DECODE(name, 'physical write total latency', value, NULL)), 2) as avg_write_latency_ms
FROM v$iostat_function
WHERE function_name = 'DBWR' OR function_name = 'LGWR'
```

---

### 34. Attentes de session
**Vue :** `v$session_wait`, `v$session`

```sql
SELECT 
    s.sid,
    s.serial#,
    s.username,
    s.event,
    s.wait_class,
    s.state,
    s.seconds_in_wait,
    s.p1text as p1_text,
    s.p1,
    s.p2text as p2_text,
    s.p2,
    s.p3text as p3_text,
    s.p3
FROM v$session_wait s
JOIN v$session ses ON s.sid = ses.sid
WHERE ses.type = 'USER'
  AND s.wait_class != 'Idle'
ORDER BY s.seconds_in_wait DESC
```

---

### 35. Historique des métriques
**Vue :** `v$sysmetric_history`

```sql
SELECT 
    TO_CHAR(begin_time, 'YYYY-MM-DD HH24:MI:SS') as timestamp,
    metric_name,
    ROUND(average, 2) as value
FROM v$sysmetric_history
WHERE begin_time > SYSDATE - :hours/24
  AND metric_name IN (
      'Physical Reads Per Sec',
      'Physical Writes Per Sec',
      'Database Time Per Sec',
      'CPU Usage Per Sec'
  )
ORDER BY begin_time
```

---

## Module : Alertes

### 36. Journal des alertes
**Vue :** `x$dbgalertext`

```sql
SELECT 
    TO_CHAR(originating_timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp,
    message_level as severity,
    message_text as message,
    facility
FROM x$dbgalertext
WHERE originating_timestamp > SYSDATE - :hours/24
ORDER BY originating_timestamp DESC
FETCH FIRST :limit ROWS ONLY
```

---

## Module : AWR (Diagnostics Pack requis)

### 37. Snapshots AWR
**Vue :** `dba_hist_snapshot`

La requête des snapshots est intégrée dans `app/services/awr_service.py` (`SNAPSHOTS_QUERY`) ; la
colonne `duration_min` est calculée avec une arithmétique `CAST(... AS DATE)` car les colonnes du plan sont
de type `TIMESTAMP` :

```sql
SELECT 
    snap_id,
    dbid,
    instance_number,
    TO_CHAR(begin_interval_time, 'YYYY-MM-DD HH24:MI:SS') as begin_time,
    TO_CHAR(end_interval_time, 'YYYY-MM-DD HH24:MI:SS') as end_time,
    ROUND((CAST(end_interval_time AS DATE) - CAST(begin_interval_time AS DATE)) * 24 * 60, 1) as duration_min,
    TO_CHAR(startup_time, 'YYYY-MM-DD HH24:MI:SS') as startup_time
FROM dba_hist_snapshot
WHERE dbid = :dbid
  AND begin_interval_time > SYSDATE - 30
ORDER BY snap_id DESC
```

> **Pourquoi `CAST(... AS DATE)` ?** `begin_interval_time`/`end_interval_time` sont de type `TIMESTAMP` ;
> leur différence est un `INTERVAL DAY TO SECOND`, et appeler `ROUND()` dessus déclenche
> `ORA-00932`. Le cast des deux colonnes en `DATE` produit une différence numérique. `dbid` est résolu à
> l'exécution depuis `v$database` (la même instance contient les lignes CDB de `dba_hist_snapshot`, qui se
> retrouvaient mélangées avec les lignes PDB lorsqu'on se connecte au service PDB — le filtrage par `dbid` maintient la
> cohérence de la liste). `startup_time` permet la détection de la fenêtre de démarrage de l'instance.

---

### 38. Génération de rapport AWR
**Package :** `DBMS_WORKLOAD_REPOSITORY` (`awr_report_html` / `awr_report_text`)

```sql
SELECT output
FROM TABLE(dbms_workload_repository.awr_report_html(
    :dbid, :instance_number, :snap_start, :snap_end, :options))
```

Le rapport est renvoyé sous forme de CLOB réparti sur plusieurs lignes ; le service concatène la colonne `output` de
chaque ligne en une seule chaîne. La sélection d'une plage de snapshots qui **traverse un redémarrage d'instance**
déclenche `ORA-20019` (`re-started during specified snapshot interval`) ; l'API le convertit en une réponse
400 conviviale. `AWRService.generate_report` valide `snap_id_end > snap_id_start` et résout
`dbid` depuis `v$database`.

---

### 39. Top SQL historique
**Vue :** `dba_hist_sqlstat`, `dba_hist_snapshot`, `dba_hist_sqltext`

```sql
SELECT 
    s.snap_id,
    st.sql_id,
    st.plan_hash_value,
    SUM(s.elapsed_time_delta) / 1e6 as elapsed_sec,
    SUM(s.cpu_time_delta) / 1e6 as cpu_sec,
    SUM(s.executions_delta) as execs,
    SUM(s.buffer_gets_delta) as gets,
    SUM(s.disk_reads_delta) as reads,
    SUM(s.rows_processed_delta) as rows,
    SUBSTR(st.sql_text, 1, 100) as sql_text
FROM dba_hist_sqlstat s
JOIN dba_hist_snapshot sn ON s.snap_id = sn.snap_id AND s.dbid = sn.dbid
JOIN dba_hist_sqltext st ON s.sql_id = st.sql_id AND s.dbid = st.dbid
WHERE sn.begin_interval_time BETWEEN :start_time AND :end_time
  AND s.executions_delta > 0
GROUP BY s.snap_id, st.sql_id, st.plan_hash_value, SUBSTR(st.sql_text, 1, 100)
ORDER BY elapsed_sec DESC
FETCH FIRST 20 ROWS ONLY
```

---

## Notes de Performance des Requêtes

### Recommandations d'index

Pour des performances de requête optimales, assurez-vous que ces index existent (généralement créés par Oracle) :

| Vue | Colonnes clés |
|-----|---------------|
| `v$session` | `type`, `status`, `username`, `machine` |
| `v$sqlstats` | `executions`, `cpu_time`, `elapsed_time` |
| `v$active_session_history` | `sample_time`, `session_type`, `wait_class` |
| `v$system_event` | `wait_class`, `time_waited_micro` |
| `dba_free_space` | `tablespace_name` |
| `dba_segments` | `tablespace_name`, `bytes` |
| `dba_hist_snapshot` | `begin_interval_time` |
| `dba_hist_sqlstat` | `snap_id`, `dbid`, `executions_delta` |

### Partitionnement

Pour les tables historiques AWR (si des tables partitionnées sont utilisées) :
- `dba_hist_*` : partitionné par `snap_id` ou `begin_interval_time`
- `v$active_session_history` : buffer circulaire en SGA (~1 heure de rétention)

### Conseils d'optimisation des requêtes

1. **Utiliser des variables de liaison** — Toutes les requêtes utilisent des liaisons paramétrées
2. **Limiter les ensembles de résultats** — Utiliser `FETCH FIRST N ROWS ONLY`
3. **Filtrer tôt** — Appliquer les clauses `WHERE` avant les jointures
4. **Éviter SELECT *** — Listes de colonnes explicites
5. **Utiliser des vues matérialisées** — Pour les agrégations complexes (amélioration future)

---

## Dépendance au Diagnostics Pack

| Fonctionnalité | Nécessite Diagnostics Pack |
|----------------|---------------------------|
| Vues V$ en temps réel | Non |
| ASH (v$active_session_history) | Non (1 heure de rétention) |
| Snapshots AWR (dba_hist_*) | **Oui** |
| SQL historique (dba_hist_sqlstat) | **Oui** |
| Rapports AWR (`awr_report_html`/`awr_report_text`) | **Oui** |
| Historique de croissance des tablespaces | **Oui** |

### Sans Diagnostics Pack

Le dashboard se dégrade gracieusement :
- La supervision en temps réel fonctionne pleinement
- ASH limité à ~1 heure (en mémoire)
- Pas de tendances historiques au-delà de V$SYSMETRIC_HISTORY (1 heure)
- Pas de génération de rapports AWR
- La planification de capacité utilise uniquement les données courantes
