import time

import oracledb
import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.connections import DBConnection, get_catalog, save_database_file, is_env_configured
from app.database import oracle_pool
from app.api.deps import get_current_dba

logger = structlog.get_logger(__name__)

router = APIRouter(tags=["Databases"])

CONNECT_TIMEOUT = 5


class DatabaseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64, description="Unique connection name")
    host: str = Field(..., min_length=1, description="Hostname or IP")
    port: int = Field(default=1521, ge=1, le=65535)
    service: str = Field(default="", description="Oracle service name", alias="serviceName")
    username: str = Field(default="", description="Oracle username")
    password: str = Field(default="", description="Oracle password")
    is_default: bool = Field(default=False, alias="isDefault")

    model_config = {"populate_by_name": True}


async def _ping(conn: DBConnection) -> tuple[bool, float | None, str | None]:
    start = time.monotonic()
    try:
        connection = await oracledb.connect_async(
            user=conn.username,
            password=conn.password,
            dsn=conn.dsn,
            tcp_connect_timeout=CONNECT_TIMEOUT,
        )
        db_name: str | None = None
        try:
            async with connection.cursor() as cursor:
                await cursor.execute("SELECT d.name FROM v$database d")
                row = await cursor.fetchone()
                db_name = row[0] if row else None
        finally:
            await connection.close()
        return True, round((time.monotonic() - start) * 1000, 1), db_name
    except Exception as exc:
        logger.warning("Database ping failed", db=conn.name, dsn=conn.dsn, error=str(exc))
        return False, None, None


async def _serialize(conn: DBConnection) -> dict:
    online, latency_ms, db_name = await _ping(conn)
    return {
        "name": db_name or conn.name,
        "configName": conn.name,
        "host": conn.host,
        "port": conn.port,
        "serviceName": conn.service,
        "username": conn.username,
        "isDefault": conn.is_default,
        "isActive": conn.is_active,
        "status": "ONLINE" if online else "OFFLINE",
        "latencyMs": latency_ms,
    }


@router.get("")
async def list_databases():
    """List all configured databases with a live connectivity check."""
    catalog = get_catalog()
    return [await _serialize(conn) for conn in catalog]


@router.post("", response_model=None)
async def add_database(payload: DatabaseCreate, _: None = Depends(get_current_dba)):
    """Test and persist a new database connection (active only)."""
    candidate = DBConnection(
        name=payload.name,
        host=payload.host,
        port=payload.port,
        service=payload.service,
        username=payload.username,
        password=payload.password,
        is_default=payload.is_default,
        is_active=True,
    )
    online, _, _ = await _ping(candidate)
    if not online:
        raise HTTPException(
            status_code=422,
            detail=f"Connection to {candidate.dsn} failed - cannot add '{payload.name}'",
        )

    catalog = get_catalog()
    existing = next((c for c in catalog if c.name == payload.name), None)
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Database '{payload.name}' already exists")

    if payload.is_default:
        for conn in catalog:
            conn.is_default = False
    catalog.append(candidate)
    save_database_file(catalog)

    try:
        await oracle_pool.create_pool(candidate)
        logger.info("Database pool created", name=payload.name, dsn=candidate.dsn)
    except Exception as exc:
        logger.exception("Database added but pool creation failed", name=payload.name, error=str(exc))
        raise HTTPException(
            status_code=422,
            detail=f"Cannot add '{payload.name}': {exc}",
        )

    logger.info("Database added", name=payload.name, dsn=candidate.dsn)
    return await _serialize(candidate)


@router.delete("/{database_name}")
async def remove_database(database_name: str, _: None = Depends(get_current_dba)):
    """Remove a persisted database connection (env-configured ones are ignored)."""
    catalog = get_catalog()
    match = next((c for c in catalog if c.name == database_name), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"Database '{database_name}' not found")
    if is_env_configured(database_name):
        raise HTTPException(
            status_code=400,
            detail=f"Database '{database_name}' is configured via environment - edit DATABASES_JSON instead",
        )

    if match.is_default:
        for conn in catalog:
            if conn.name != database_name:
                conn.is_default = True
                break

    remaining = [c for c in catalog if c.name != database_name]
    if not remaining:
        from app.connections import database_file_path
        path = database_file_path()
        if path.exists():
            path.write_text("[]", encoding="utf-8")
    else:
        save_database_file(remaining)

    await oracle_pool.drop_pool(database_name)
    logger.info("Database removed", name=database_name)
    return {"name": database_name, "removed": True}