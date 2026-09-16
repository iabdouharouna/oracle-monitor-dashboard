#!/usr/bin/env python3
"""
Run the init-db.sql script to create the monitor user
Execute statements directly using oracledb
"""
import oracledb
import sys

# Connection parameters for SYS user
SYS_USER = "sys"
SYS_PASSWORD = "haqq_129"
DSN = "172.23.112.1:1521/freepdb1"

def run_init_script():
    try:
        # Connect as SYSDBA
        connection = oracledb.connect(
            user=SYS_USER,
            password=SYS_PASSWORD,
            dsn=DSN,
            mode=oracledb.AUTH_MODE_SYSDBA
        )
        print(f"Connected to Oracle as {SYS_USER} (SYSDBA)")
        
        cursor = connection.cursor()
        
        # Statement 1: Create USERS tablespace
        try:
            print("Creating USERS tablespace...")
            cursor.execute("""
                CREATE TABLESPACE users 
                DATAFILE 'users01.dbf' SIZE 100M AUTOEXTEND ON NEXT 10M MAXSIZE UNLIMITED
            """)
            print("  -> USERS tablespace created")
        except oracledb.DatabaseError as e:
            error_obj, = e.args
            if error_obj.code == 1543:  # ORA-01543: tablespace already exists
                print("  -> USERS tablespace already exists")
            else:
                raise
        
        # Create monitor user
        try:
            print("Creating monitor user...")
            cursor.execute("""
                CREATE USER monitor IDENTIFIED BY monitor_secure_password_2024
                DEFAULT TABLESPACE users
                TEMPORARY TABLESPACE temp
                QUOTA UNLIMITED ON users
                CONTAINER = CURRENT
            """)
            print("  -> monitor user created")
        except oracledb.DatabaseError as e:
            error_obj, = e.args
            if error_obj.code == 1435:  # user already exists
                print("  -> monitor user already exists")
            else:
                raise
        
        # Grant privileges
        grants = [
            "GRANT CREATE SESSION TO monitor",
            "GRANT SELECT_CATALOG_ROLE TO monitor",
            "GRANT SELECT ANY DICTIONARY TO monitor",
            "GRANT SELECT ON v_$instance TO monitor",
            "GRANT SELECT ON v_$database TO monitor",
            "GRANT SELECT ON v_$version TO monitor",
            "GRANT SELECT ON v_$session TO monitor",
            "GRANT SELECT ON v_$session_wait TO monitor",
            "GRANT SELECT ON v_$system_event TO monitor",
            "GRANT SELECT ON v_$sysstat TO monitor",
            "GRANT SELECT ON v_$sys_time_model TO monitor",
            "GRANT SELECT ON v_$sql TO monitor",
            "GRANT SELECT ON v_$sqlstats TO monitor",
            "GRANT SELECT ON v_$sql_monitor TO monitor",
            "GRANT SELECT ON v_$sql_plan TO monitor",
            "GRANT SELECT ON v_$active_session_history TO monitor",
            "GRANT SELECT ON v_$sgastat TO monitor",
            "GRANT SELECT ON v_$sgainfo TO monitor",
            "GRANT SELECT ON v_$pgastat TO monitor",
            "GRANT SELECT ON v_$librarycache TO monitor",
            "GRANT SELECT ON v_$iostat_function TO monitor",
            "GRANT SELECT ON v_$sysmetric TO monitor",
            "GRANT SELECT ON v_$sysmetric_history TO monitor",
            "GRANT SELECT ON v_$osstat TO monitor",
            "GRANT SELECT ON v_$process TO monitor",
            "GRANT SELECT ON v_$log TO monitor",
            "GRANT SELECT ON v_$log_history TO monitor",
            "GRANT SELECT ON v_$archived_log TO monitor",
            "GRANT SELECT ON v_$tablespace TO monitor",
            "GRANT SELECT ON v_$temp_space_header TO monitor",
            "GRANT SELECT ON v_$parameter TO monitor",
            "GRANT SELECT ON v_$resource_limit TO monitor",
            "GRANT SELECT ON v_$pq_tqstat TO monitor",
            "GRANT SELECT ON v_$session_longops TO monitor",
            "GRANT SELECT ON v_$memory_target_advice TO monitor",
            "GRANT SELECT ON v_$sga_target_advice TO monitor",
            "GRANT SELECT ON v_$pga_target_advice TO monitor",
            "GRANT SELECT ON dba_tablespaces TO monitor",
            "GRANT SELECT ON dba_data_files TO monitor",
            "GRANT SELECT ON dba_temp_files TO monitor",
            "GRANT SELECT ON dba_free_space TO monitor",
            "GRANT SELECT ON dba_segments TO monitor",
            "GRANT SELECT ON dba_objects TO monitor",
            "GRANT SELECT ON dba_hist_snapshot TO monitor",
            "GRANT SELECT ON dba_hist_sqlstat TO monitor",
            "GRANT SELECT ON dba_hist_sqltext TO monitor",
            "GRANT SELECT ON dba_hist_active_sess_history TO monitor",
            "GRANT SELECT ON dba_hist_system_event TO monitor",
            "GRANT SELECT ON dba_hist_tbspc_space_usage TO monitor",
        ]
        
        print("Granting privileges...")
        for grant in grants:
            try:
                cursor.execute(grant)
            except oracledb.DatabaseError as e:
                error_obj, = e.args
                if error_obj.code in (1917, 942):  # user doesn't exist, table/view doesn't exist
                    pass  # ignore
                else:
                    print(f"  -> Grant error: {error_obj.message}")
        
        # Create health check function
        try:
            cursor.execute("""
                CREATE OR REPLACE FUNCTION monitor.health_check RETURN NUMBER IS
                BEGIN
                    RETURN 1;
                END;
            """)
            cursor.execute("GRANT EXECUTE ON monitor.health_check TO monitor")
            print("  -> Health check function created")
        except oracledb.DatabaseError as e:
            error_obj, = e.args
            if error_obj.code not in (1435, 4042):  # ignore user doesn't exist
                print(f"  -> Function error: {error_obj.message}")
        
        # Grant DBMS packages
        try:
            cursor.execute("GRANT EXECUTE ON DBMS_WORKLOAD_REPOSITORY TO monitor")
            cursor.execute("GRANT EXECUTE ON DBMS_MONITOR TO monitor")
            print("  -> DBMS packages granted")
        except oracledb.DatabaseError as e:
            error_obj, = e.args
            if error_obj.code != 1917:
                print(f"  -> DBMS grant error: {error_obj.message}")
        
        # Create profile
        try:
            cursor.execute("""
                CREATE PROFILE monitor_profile LIMIT
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
                PASSWORD_VERIFY_FUNCTION NULL
            """)
            cursor.execute("ALTER USER monitor PROFILE monitor_profile")
            print("  -> Profile created and assigned")
        except oracledb.DatabaseError as e:
            error_obj, = e.args
            if error_obj.code not in (1542, 1918):  # profile exists, user doesn't exist
                print(f"  -> Profile error: {error_obj.message}")
        
        connection.commit()
        cursor.close()
        connection.close()
        print("\nInit script completed successfully!")
        return True
        
    except oracledb.DatabaseError as e:
        error_obj, = e.args
        print(f"Database connection error: {error_obj.message}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_init_script()
    sys.exit(0 if success else 1)