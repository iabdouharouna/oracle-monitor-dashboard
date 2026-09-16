from app.config import settings


INSTANCE_INFO = """
SELECT 
    i.instance_name,
    i.version,
    i.host_name,
    d.platform_name,
    TO_CHAR(i.startup_time, 'YYYY-MM-DD HH24:MI:SS') as startup_time,
    i.status,
    d.log_mode,
    d.database_role,
    i.instance_number,
    d.name as db_name
FROM v$instance i
JOIN v$database d ON 1=1
"""

INSTANCE_UPTIME = """
SELECT 
    FLOOR((SYSDATE - startup_time) * 86400) as uptime_seconds
FROM v$instance
"""

CLIENT_SUMMARY = """
SELECT 
    machine,
    program,
    module,
    COUNT(*) as session_count
FROM v$session
WHERE type = 'USER'
GROUP BY machine, program, module
ORDER BY session_count DESC
"""

PROCESS_METRICS = """
SELECT 
    (SELECT COUNT(*) FROM v$process) as process_count,
    (SELECT value FROM v$sysstat WHERE name = 'execute count') as exec_count,
    (SELECT value FROM v$sysstat WHERE name = 'parse count (total)') as parse_count,
    (SELECT value FROM v$sysstat WHERE name = 'opened cursors current') as open_cursors,
    (SELECT value FROM v$sysstat WHERE name = 'user commits') as commits,
    (SELECT value FROM v$sysstat WHERE name = 'user rollbacks') as rollbacks
FROM dual
"""

MEMORY_METRICS = """
SELECT 
    pool,
    name,
    bytes
FROM v$sgastat
WHERE pool IS NOT NULL
"""

PGA_METRICS = """
SELECT 
    name,
    value
FROM v$pgastat
"""

LIBRARY_CACHE = """
SELECT 
    namespace,
    gets,
    gethits,
    pins,
    pinhits,
    reloads,
    invalidations
FROM v$librarycache
"""

BUFFER_CACHE_HIT = """
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
"""

TABLESPACES = """
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
"""

REDO_LOGS = """
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
"""

ARCHIVE_LOG_RATE = """
SELECT 
    COUNT(*) as archives_per_hour,
    ROUND(SUM(blocks * block_size) / 1024 / 1024, 2) as mb_per_hour
FROM v$archived_log
WHERE completion_time > SYSDATE - 1/24
"""

CPU_RATIO = """
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
"""

TOP_SQL = """
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
"""

SYSTEM_WAITS = """
SELECT 
    event,
    wait_class,
    total_waits,
    ROUND(time_waited_micro / 1e6, 2) as time_waited_sec,
    ROUND(time_waited_micro / NULLIF(total_waits, 0) / 1000, 2) as avg_wait_ms,
    COALESCE(ROUND(100 * time_waited_micro / NULLIF(SUM(time_waited_micro) OVER (), 0), 2), 0) as pct_db_time
FROM v$system_event
WHERE wait_class != 'Idle'
ORDER BY time_waited_micro DESC
"""

SESSIONS = """
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
    ROUND(p.pga_alloc_mem / 1024 / 1024, 2) as pga_allocated_mb,
    ROUND(p.pga_used_mem / 1024 / 1024, 2) as pga_used_mb
FROM v$session s
LEFT JOIN v$process p ON p.addr = s.paddr
WHERE s.type = 'USER'
ORDER BY s.status DESC, s.last_call_et DESC
"""

BLOCKING_SESSIONS = """
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
"""

SQL_MONITOR_ACTIVE = """
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
    m.px_servers_allocated as px_servers,
    TO_CHAR(m.sql_exec_start, 'YYYY-MM-DD HH24:MI:SS') as start_time,
    TO_CHAR(m.last_refresh_time, 'YYYY-MM-DD HH24:MI:SS') as last_refresh_time
FROM v$sql_monitor m
WHERE m.status LIKE 'EXECUTING%' 
   OR m.last_refresh_time > SYSDATE - 1/1440

UNION ALL

SELECT
    s.sql_id,
    0 as sql_exec_id,
    'RUNNING' as status,
    ROUND((SYSDATE - s.sql_exec_start) * 86400, 2) as duration_sec,
    0 as cpu_time_sec,
    0 as io_time_sec,
    substr(q.sql_text, 1, 4000) as sql_text,
    s.username,
    s.module,
    NULL as px_servers,
    TO_CHAR(s.sql_exec_start, 'YYYY-MM-DD HH24:MI:SS') as start_time,
    TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') as last_refresh_time
FROM v$session s
JOIN v$sql q ON q.sql_id = s.sql_id AND q.child_number = s.sql_child_number
WHERE s.status = 'ACTIVE'
  AND s.username IS NOT NULL
  AND s.sql_id IS NOT NULL
  AND s.sql_exec_start IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM v$sql_monitor m
      WHERE m.sql_id = s.sql_id AND m.status LIKE 'EXECUTING%'
  )
ORDER BY last_refresh_time DESC
"""

SQL_MONITOR_DETAIL = """
SELECT 
    m.sql_id,
    m.sql_exec_id,
    m.sql_plan_hash_value as plan_hash_value,
    m.status,
    ROUND(m.elapsed_time / 1e6, 2) as duration_sec,
    ROUND(m.cpu_time / 1e6, 2) as cpu_time_sec,
    ROUND(m.user_io_wait_time / 1e6, 2) as io_time_sec,
    m.sql_text,
    m.username,
    m.module,
    m.px_servers_allocated as px_servers,
    1 as executions,
    m.buffer_gets,
    m.disk_reads,
    m.direct_writes as disk_writes,
    m.physical_read_requests,
    m.physical_read_bytes,
    m.physical_write_requests,
    m.physical_write_bytes,
    TO_CHAR(m.sql_exec_start, 'YYYY-MM-DD HH24:MI:SS') as start_time,
    TO_CHAR(m.last_refresh_time, 'YYYY-MM-DD HH24:MI:SS') as last_refresh_time
FROM v$sql_monitor m
WHERE m.sql_id = :sql_id AND m.sql_exec_id = :sql_exec_id
"""

EXECUTION_PLAN = """
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
"""

PARALLELISM_DETAIL = """
SELECT 
    0 as qcsid,
    dfo_number,
    tq_id,
    server_type,
    num_rows,
    bytes,
    open_time,
    avg_latency
FROM v$pq_tqstat
ORDER BY dfo_number, tq_id, server_type
"""

ASH_AAS = """
SELECT 
    TO_CHAR(sample_time, 'YYYY-MM-DD HH24:MI:SS') as time_bucket,
    COALESCE(wait_class, 'ON CPU') as wait_class,
    COUNT(*) * 10 / 60 as aas,
    COUNT(*) as samples
FROM v$active_session_history
WHERE sample_time > SYSDATE - :hours/24
  AND session_type = 'FOREGROUND'
  AND COALESCE(wait_class, 'ON CPU') != 'Idle'
GROUP BY TO_CHAR(sample_time, 'YYYY-MM-DD HH24:MI:SS'), COALESCE(wait_class, 'ON CPU')
ORDER BY time_bucket
"""

ASH_TOP_SQL = """
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
  AND ash.sql_id IS NOT NULL
GROUP BY ash.sql_id, SUBSTR(st.sql_text, 1, 100)
ORDER BY samples DESC
FETCH FIRST 20 ROWS ONLY
"""

ASH_DRILLDOWN = """
SELECT 
    {dimension} as dimension_value,
    {filter_dimension} as filter_value,
    COUNT(*) as samples,
    ROUND(COUNT(*) * 10 / 3600, 2) as aas,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as pct_total
FROM v$active_session_history ash
WHERE ash.sample_time > SYSDATE - :hours/24
  AND ash.session_type = 'FOREGROUND'
  AND COALESCE(ash.wait_class, 'ON CPU') != 'Idle'
GROUP BY {dimension}, {filter_dimension}
ORDER BY samples DESC
FETCH FIRST 20 ROWS ONLY
"""

IOS_METRICS = """
SELECT 
    metric_name,
    value
FROM v$metric
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
"""

IO_LATENCY = """
SELECT 
    ROUND(SUM(wait_time) / NULLIF(SUM(number_of_waits), 0) * 10, 2) as avg_read_latency_ms,
    ROUND(SUM(wait_time) / NULLIF(SUM(number_of_waits), 0) * 10, 2) as avg_write_latency_ms
FROM v$iostat_function
"""

SESSION_WAITS = """
SELECT 
    s.sid,
    ses.serial#,
    ses.username,
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
  AND ses.username IS NOT NULL
ORDER BY s.seconds_in_wait DESC
"""

LIVE_WAIT_CLASSES = """
SELECT 
    COALESCE(wait_class, 'ON CPU') AS wait_class,
    COUNT(*) AS session_count,
    ROUND(SUM(CASE WHEN state = 'WAITING' THEN NVL(seconds_in_wait, 0) ELSE 0 END), 1) AS total_wait_time_sec
FROM v$session
WHERE type = 'USER'
  AND username IS NOT NULL
  AND COALESCE(wait_class, 'ON CPU') != 'Idle'
GROUP BY COALESCE(wait_class, 'ON CPU')
ORDER BY session_count DESC
"""

LIVE_SESSIONS = """
SELECT 
    sid,
    serial#,
    username,
    program,
    module,
    machine,
    COALESCE(wait_class, 'ON CPU') AS wait_class,
    event,
    state,
    status,
    seconds_in_wait,
    sql_id,
    last_call_et
FROM v$session
WHERE type = 'USER'
  AND username IS NOT NULL
  AND (COALESCE(wait_class, 'ON CPU') != 'Idle' OR status = 'ACTIVE')
ORDER BY
    CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END,
    CASE WHEN COALESCE(wait_class, 'ON CPU') = 'ON CPU' THEN 0 ELSE 1 END,
    seconds_in_wait DESC
"""

ALERT_LOG = """
SELECT 
    TO_CHAR(originating_timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp,
    message_level as severity,
    message_text as message,
    component_id as facility
FROM v$diag_alert_ext
WHERE originating_timestamp > SYSDATE - :hours/24
ORDER BY originating_timestamp DESC
FETCH FIRST :limit ROWS ONLY
"""

METRICS_HISTORY = """
SELECT 
    TO_CHAR(begin_time, 'YYYY-MM-DD HH24:MI:SS') as timestamp,
    metric_name,
    ROUND(value, 2) as value
FROM v$metric_history
WHERE begin_time > SYSDATE - :hours/24
  AND metric_name IN (
      'Physical Reads Per Sec',
      'Physical Writes Per Sec',
      'Database Time Per Sec',
      'CPU Usage Per Sec'
  )
ORDER BY begin_time
"""

SGA_INFO = """
SELECT 
    name,
    ROUND(bytes / 1024 / 1024, 2) as size_mb
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
"""

MEMORY_ADVISOR_SGA = """
SELECT 
    sga_size_factor,
    estd_db_time_factor,
    ROUND(
        estd_physical_reads / NULLIF(MAX(CASE WHEN sga_size_factor = 1 THEN estd_physical_reads END) OVER (), 0),
        3
    ) as estd_physical_reads_factor
FROM v$sga_target_advice
"""

MEMORY_ADVISOR_PGA = """
SELECT 
    pga_target_factor,
    ROUND(MIN(estd_time) OVER () / NULLIF(estd_time, 0), 3) as estd_db_time_factor,
    ROUND(MIN(estd_extra_bytes_rw) OVER () / NULLIF(estd_extra_bytes_rw, 0), 3) as estd_physical_reads_factor
FROM v$pga_target_advice
"""

DATAFILES = """
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
WHERE df.tablespace_name = :tablespace_name
ORDER BY df.tablespace_name, df.file_id
"""

SEGMENTS = """
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
"""

TABLESPACE_GROWTH = """
SELECT 
    TO_CHAR(TO_DATE(rtime, 'MM/DD/YYYY HH24:MI:SS'), 'YYYY-MM-DD') as date_str,
    ROUND(tablespace_usedsize * 8 / 1024, 2) as used_mb,
    ROUND(tablespace_size * 8 / 1024, 2) as allocated_mb
FROM dba_hist_tbspc_space_usage
WHERE tablespace_id = (
    SELECT ts# FROM v$tablespace WHERE name = :tablespace_name
)
  AND TO_DATE(rtime, 'MM/DD/YYYY HH24:MI:SS') > SYSDATE - 30
ORDER BY TO_DATE(rtime, 'MM/DD/YYYY HH24:MI:SS')
"""

LONG_OPS = """
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
"""

MEMORY_TARGET_ADVICE = """
SELECT 
    memory_size_factor,
    estd_db_time_factor,
    0 as estd_physical_reads_factor
FROM v$memory_target_advice
"""

AWR_SNAPSHOTS = """
SELECT 
    snap_id,
    TO_CHAR(begin_interval_time, 'YYYY-MM-DD HH24:MI:SS') as begin_time,
    TO_CHAR(end_interval_time, 'YYYY-MM-DD HH24:MI:SS') as end_time,
    ROUND((end_interval_time - begin_interval_time) * 24 * 60, 1) as duration_min
FROM dba_hist_snapshot
WHERE begin_interval_time > SYSDATE - 30
ORDER BY snap_id DESC
"""

AWR_TOP_SQL = """
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
"""


def get_drilldown_query(dimension: str, filter_dimension: str) -> str:
    valid_dimensions = {
        'wait_class', 'event', 'sql_id', 'username', 'user_id', 'machine', 'module', 'action'
    }
    
    if dimension not in valid_dimensions or filter_dimension not in valid_dimensions:
        raise ValueError(f"Invalid dimension. Valid: {valid_dimensions}")
    
    col_map = {'username': 'user_id'}
    dimension_col = col_map.get(dimension, dimension)
    filter_col = col_map.get(filter_dimension, filter_dimension)
    
    def col_expr(c: str) -> str:
        if c.startswith("COALESCE("):
            return c
        return f"ash.{c}"
    
    if dimension == 'wait_class':
        dimension_col = "COALESCE(ash.wait_class, 'ON CPU')"
    if filter_dimension == 'wait_class':
        filter_col = "COALESCE(ash.wait_class, 'ON CPU')"
    
    return ASH_DRILLDOWN.format(
        dimension=col_expr(dimension_col), filter_dimension=col_expr(filter_col)
    )