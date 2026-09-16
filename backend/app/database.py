import contextvars
import oracledb
import structlog
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from app.config import settings
from app.connections import DBConnection, load_connections

logger = structlog.get_logger(__name__)

active_database: contextvars.ContextVar[str] = contextvars.ContextVar("active_database", default="")


def resolve_active_name() -> str:
    name = active_database.get()
    connections = load_connections()
    names = {conn.name for conn in connections}
    if name in names:
        return name
    for conn in connections:
        if conn.is_default:
            return conn.name
    return connections[0].name if connections else "PRIMARY"


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

    async def initialize(self) -> None:
        min_p, max_p, inc, timeout = self._pool_settings()
        for conn in load_connections():
            if conn.name in self._pools:
                continue
            logger.info(
                "Initializing Oracle connection pool",
                db=conn.name,
                user=conn.username,
                dsn=conn.dsn,
                min=min_p,
                max=max_p,
            )
            self._pools[conn.name] = oracledb.create_pool_async(
                user=conn.username,
                password=conn.password,
                dsn=conn.dsn,
                min=min_p,
                max=max_p,
                increment=inc,
                timeout=timeout,
            )
            try:
                async with self._pools[conn.name].acquire() as test_conn:
                    async with test_conn.cursor() as cursor:
                        await cursor.execute("SELECT 1 FROM DUAL")
                        result = await cursor.fetchone()
                        logger.info("Oracle connection test successful", db=conn.name, result=result)
            except Exception as exc:
                await self._pools.pop(conn.name).close()
                logger.warning("Oracle connection test failed, pool disabled", db=conn.name, error=str(exc))

    async def close(self) -> None:
        for name, pool in self._pools.items():
            try:
                await pool.close()
                logger.info("Oracle connection pool closed", db=name)
            except Exception:
                logger.exception("Error closing pool", db=name)
        self._pools.clear()

    def _get_pool(self) -> oracledb.AsyncConnectionPool:
        if not self._pools:
            raise RuntimeError("Oracle pools are not initialized")
        name = resolve_active_name()
        return self._pools[name]

    @asynccontextmanager
    async def acquire(self, db: str = "") -> AsyncGenerator[oracledb.AsyncConnection, None]:
        if not self._pools:
            await self.initialize()
        if db:
            token = active_database.set(db)
            try:
                pool = self._get_pool()
                async with pool.acquire() as conn:
                    yield conn
            finally:
                active_database.reset(token)
            return
        pool = self._get_pool()
        async with pool.acquire() as conn:
            yield conn

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