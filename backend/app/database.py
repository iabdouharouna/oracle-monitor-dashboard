import asyncio
import contextvars
import time
import oracledb
import structlog
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from app.config import settings
from app.connections import DBConnection, load_connections, get_catalog
from app.core.exceptions import DatabaseConnectionError, QueryTimeoutError

logger = structlog.get_logger(__name__)

active_database: contextvars.ContextVar[str] = contextvars.ContextVar("active_database", default="")

POOL_RETRY_COOLDOWN_S = 30.0


def resolve_active_name() -> str:
    name = active_database.get()
    if name:
        return name
    connections = get_catalog()
    for conn in connections:
        if conn.is_default:
            return conn.name
    return connections[0].name if connections else ""


class OraclePool:
    def __init__(self):
        self._pools: dict[str, oracledb.AsyncConnectionPool] = {}
        self._create_locks: dict[str, asyncio.Lock] = {}
        self._failed_at: dict[str, float] = {}

    def _lock_for(self, name: str) -> asyncio.Lock:
        lock = self._create_locks.get(name)
        if lock is None:
            lock = asyncio.Lock()
            self._create_locks[name] = lock
        return lock

    @staticmethod
    def _pool_settings() -> tuple[int, int, int, int]:
        return (
            settings.ORACLE_POOL_MIN,
            settings.ORACLE_POOL_MAX,
            settings.ORACLE_POOL_INCREMENT,
            settings.ORACLE_TIMEOUT,
        )

    async def _create_pool(self, conn: DBConnection) -> None:
        min_p, max_p, inc, timeout = self._pool_settings()
        logger.info(
            "Creating Oracle connection pool",
            db=conn.name,
            user=conn.username,
            dsn=conn.dsn,
            min=min_p,
            max=max_p,
        )
        pool = oracledb.create_pool_async(
            user=conn.username,
            password=conn.password,
            dsn=conn.dsn,
            min=min_p,
            max=max_p,
            increment=inc,
            timeout=timeout,
        )
        try:
            async with pool.acquire() as test_conn:
                async with test_conn.cursor() as cursor:
                    await cursor.execute("SELECT 1 FROM DUAL")
                    result = await cursor.fetchone()
                    logger.info("Oracle connection test successful", db=conn.name, result=result)
        except Exception as exc:
            await pool.close()
            self._failed_at[conn.name] = time.monotonic()
            logger.warning("Oracle connection test failed, pool disabled", db=conn.name, error=str(exc))
            raise DatabaseConnectionError(f"Connection to {conn.dsn} failed") from exc
        self._pools[conn.name] = pool
        self._failed_at.pop(conn.name, None)

    async def initialize(self) -> None:
        for conn in get_catalog():
            if conn.name in self._pools:
                continue
            try:
                await self._create_pool(conn)
            except DatabaseConnectionError:
                continue

    async def create_pool(self, conn: DBConnection) -> None:
        """Create (or refresh) the pool for a single database, called on enrollment."""
        existing = self._pools.get(conn.name)
        if existing is not None:
            try:
                await existing.close()
            except Exception:
                logger.exception("Error closing previous pool", db=conn.name)
            self._pools.pop(conn.name, None)
        await self._create_pool(conn)

    async def drop_pool(self, name: str) -> None:
        """Close and remove the pool for a database, called on removal."""
        self._failed_at.pop(name, None)
        self._create_locks.pop(name, None)
        pool = self._pools.pop(name, None)
        if pool is not None:
            try:
                await pool.close()
                logger.info("Oracle connection pool removed", db=name)
            except Exception:
                logger.exception("Error closing pool", db=name)

    async def close(self) -> None:
        for name, pool in self._pools.items():
            try:
                await pool.close()
                logger.info("Oracle connection pool closed", db=name)
            except Exception:
                logger.exception("Error closing pool", db=name)
        self._pools.clear()

    @asynccontextmanager
    async def acquire(self, db: str = "") -> AsyncGenerator[oracledb.AsyncConnection, None]:
        if db:
            token = active_database.set(db)
            try:
                pool = await self._resolve_pool()
                async with pool.acquire() as conn:
                    conn.call_timeout = settings.ORACLE_CALL_TIMEOUT_MS
                    yield conn
            finally:
                active_database.reset(token)
            return
        pool = await self._resolve_pool()
        async with pool.acquire() as conn:
            conn.call_timeout = settings.ORACLE_CALL_TIMEOUT_MS
            yield conn

    async def _resolve_pool(self) -> oracledb.AsyncConnectionPool:
        name = resolve_active_name()
        pool = self._pools.get(name) if name else None
        if pool is not None:
            return pool
        if not name:
            raise DatabaseConnectionError("No Oracle database available")
        failed_at = self._failed_at.get(name)
        if failed_at is not None and (time.monotonic() - failed_at) < POOL_RETRY_COOLDOWN_S:
            raise DatabaseConnectionError(f"Database pool '{name}' is not available")
        connections = {conn.name: conn for conn in get_catalog()}
        conn = connections.get(name)
        if conn is None:
            raise DatabaseConnectionError(f"Unknown database '{name}'")
        async with self._lock_for(name):
            pool = self._pools.get(name)
            if pool is None:
                await self._create_pool(conn)
                pool = self._pools[conn.name]
        return pool

    @staticmethod
    def _reraise(exc: Exception) -> None:
        msg = str(exc)
        if "DPY-6005" in msg or "DPI-1067" in msg:
            raise QueryTimeoutError(
                f"Oracle query timed out after {settings.ORACLE_CALL_TIMEOUT_MS} ms"
            ) from exc
        raise exc

    async def execute_query(
        self,
        query: str,
        params: dict[str, Any] | None = None,
        fetch_all: bool = True,
        db: str = "",
    ) -> list[dict[str, Any]]:
        try:
            async with self.acquire(db=db) as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute(query, params or {})
                    columns = [col[0].lower() for col in cursor.description] if cursor.description else []
                    if fetch_all:
                        rows = await cursor.fetchall()
                    else:
                        row = await cursor.fetchone()
                        rows = [row] if row else []
                    return [dict(zip(columns, row)) for row in rows] if rows else []
        except (DatabaseConnectionError, QueryTimeoutError):
            raise
        except Exception as exc:
            self._reraise(exc)

    async def execute_scalar(
        self,
        query: str,
        params: dict[str, Any] | None = None,
        db: str = "",
    ) -> Any:
        try:
            async with self.acquire(db=db) as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute(query, params or {})
                    result = await cursor.fetchone()
                    return result[0] if result else None
        except (DatabaseConnectionError, QueryTimeoutError):
            raise
        except Exception as exc:
            self._reraise(exc)

    @property
    def pool_stats(self) -> dict[str, dict[str, int]]:
        stats: dict[str, dict[str, int]] = {}
        if not self._pools:
            return stats
        for name, pool in self._pools.items():
            stats[name] = {
                "opened": getattr(pool, "opened", 0),
                "busy": getattr(pool, "busy", 0),
                "free": max(getattr(pool, "opened", 0) - getattr(pool, "busy", 0), 0),
            }
        return stats


oracle_pool = OraclePool()


async def get_db() -> AsyncGenerator[OraclePool, None]:
    yield oracle_pool


async def init_db() -> None:
    await oracle_pool.initialize()


async def close_db() -> None:
    await oracle_pool.close()


def set_active_database(name: str) -> None:
    active_database.set(name)


def get_connections() -> list[DBConnection]:
    return load_connections()