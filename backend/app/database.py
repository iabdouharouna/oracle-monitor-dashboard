import contextvars
import oracledb
import structlog
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from app.config import settings
from app.connections import DBConnection, load_connections, get_catalog
from app.core.exceptions import DatabaseConnectionError

logger = structlog.get_logger(__name__)

active_database: contextvars.ContextVar[str] = contextvars.ContextVar("active_database", default="")


def resolve_active_name() -> str:
    name = active_database.get()
    connections = get_catalog()
    names = {conn.name for conn in connections}
    if name in names:
        return name
    for conn in connections:
        if conn.is_default:
            return conn.name
    return connections[0].name if connections else ""


class OraclePool:
    def __init__(self):
        self._pools: dict[str, oracledb.AsyncConnectionPool] = {}

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
            logger.warning("Oracle connection test failed, pool disabled", db=conn.name, error=str(exc))
            raise DatabaseConnectionError(f"Connection to {conn.dsn} failed") from exc
        self._pools[conn.name] = pool

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
                    yield conn
            finally:
                active_database.reset(token)
            return
        pool = await self._resolve_pool()
        async with pool.acquire() as conn:
            yield conn

    async def _resolve_pool(self) -> oracledb.AsyncConnectionPool:
        name = resolve_active_name()
        pool = self._pools.get(name) if name else None
        if pool is None:
            if not self._pools:
                await self.initialize()
            pool = self._pools.get(name)
        if pool is None:
            raise DatabaseConnectionError(
                "No Oracle database available" if not name else f"Database pool '{name}' is not available"
            )
        return pool

    async def execute_query(
        self,
        query: str,
        params: dict[str, Any] | None = None,
        fetch_all: bool = True,
        db: str = "",
    ) -> list[dict[str, Any]]:
        async with self.acquire(db=db) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(query, params or {})
                columns = [col[0].lower() for col in cursor.description] if cursor.description else []
                if fetch_all:
                    rows = await cursor.fetchall()
                else:
                    rows = [await cursor.fetchone()]
                return [dict(zip(columns, row)) for row in rows] if rows else []

    async def execute_scalar(
        self,
        query: str,
        params: dict[str, Any] | None = None,
        db: str = "",
    ) -> Any:
        async with self.acquire(db=db) as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(query, params or {})
                result = await cursor.fetchone()
                return result[0] if result else None

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