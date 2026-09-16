-- Health check script for Oracle container
-- Returns 0 if healthy, 1 if unhealthy

SET HEADING OFF
SET FEEDBACK OFF
SET PAGESIZE 0

SELECT 'HEALTHY' FROM DUAL;

EXIT