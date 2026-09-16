-- Oracle Monitor Dashboard - Database Initialization Script
-- Run as SYS or SYSTEM user

-- Create USERS tablespace if not exists
BEGIN
  EXECUTE IMMEDIATE 'CREATE TABLESPACE users DATAFILE ''users01.dbf'' SIZE 100M AUTOEXTEND ON NEXT 10M MAXSIZE UNLIMITED';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -1543 THEN -- ORA-01543: tablespace 'USERS' already exists
      RAISE;
    END IF;
END;
/

-- Create monitor user
CREATE USER monitor IDENTIFIED BY monitor_secure_password_2024
  DEFAULT TABLESPACE users
  TEMPORARY TABLESPACE temp
  QUOTA UNLIMITED ON users
  CONTAINER = CURRENT;

-- Grant necessary privileges for monitoring
GRANT CREATE SESSION TO monitor;
GRANT SELECT_CATALOG_ROLE TO monitor;
GRANT SELECT ANY DICTIONARY TO monitor;

-- Performance monitoring views
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

-- DBA views (require Diagnostics Pack license)
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

-- X$ tables for alert log (X$ tables cannot be granted directly, skip)
-- GRANT SELECT ON x$dbgalertext TO monitor;

-- Additional useful views (GV$ views are for RAC, skip if not RAC)
-- GRANT SELECT ON gv$instance TO monitor;
-- GRANT SELECT ON gv$session TO monitor;
-- GRANT SELECT ON gv$active_session_history TO monitor;

-- Create a simple health check function
CREATE OR REPLACE FUNCTION monitor.health_check RETURN NUMBER IS
BEGIN
  RETURN 1;
END;
/

GRANT EXECUTE ON monitor.health_check TO monitor;

-- Grant execute on DBMS packages for advanced features
GRANT EXECUTE ON DBMS_WORKLOAD_REPOSITORY TO monitor;
GRANT EXECUTE ON DBMS_MONITOR TO monitor;

-- Create a monitoring profile
BEGIN
  EXECUTE IMMEDIATE 'CREATE PROFILE monitor_profile LIMIT
    SESSIONS_PER_USER 10
    CPU_PER_SESSION UNLIMITED
    CPU_PER_CALL UNLIMITED
    CONNECT_TIME 60
    IDLE_TIME 30
    LOGICAL_READS_PER_SESSION UNLIMITED
    LOGICAL_READS_PER_CALL UNLIMITED
    COMPOSITE_LIMIT UNLIMITED
    PRIVATE_SGA UNLIMITED
    FAILED_LOGIN_ATTEMPTS 5
    PASSWORD_LIFE_TIME 90
    PASSWORD_REUSE_TIME 365
    PASSWORD_REUSE_MAX 5
    PASSWORD_VERIFY_FUNCTION NULL';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -1542 THEN -- ORA-01542: profile 'MONITOR_PROFILE' already exists
      RAISE;
    END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'ALTER USER monitor PROFILE monitor_profile';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -1918 THEN -- ORA-01918: user does not exist
      RAISE;
    END IF;
END;
/

-- Show granted privileges
SET SERVEROUTPUT ON
BEGIN
  FOR rec IN (SELECT * FROM dba_sys_privs WHERE grantee = 'MONITOR') LOOP
    DBMS_OUTPUT.PUT_LINE(rec.privilege);
  END LOOP;
  FOR rec IN (SELECT * FROM dba_tab_privs WHERE grantee = 'MONITOR') LOOP
    DBMS_OUTPUT.PUT_LINE(rec.table_name || ' - ' || rec.privilege);
  END LOOP;
END;
/

PROMPT Monitor user created and configured successfully!