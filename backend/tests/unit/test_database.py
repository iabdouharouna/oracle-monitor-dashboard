import time

import pytest

from app import database as db_module
from app.connections import DBConnection
from app.core.exceptions import DatabaseConnectionError, QueryTimeoutError
from app.database import POOL_RETRY_COOLDOWN_S, OraclePool, resolve_active_name


@pytest.fixture
def catalog(monkeypatch):
    def _install(*connections: DBConnection) -> list[DBConnection]:
        items = list(connections)
        monkeypatch.setattr(db_module, "get_catalog", lambda: items)
        return items

    return _install


@pytest.fixture
def pool(monkeypatch):
    instance = OraclePool()
    created: list[str] = []

    async def _fake_create(conn: DBConnection) -> None:
        created.append(conn.name)
        instance._pools[conn.name] = object()

    monkeypatch.setattr(instance, "_create_pool", _fake_create)
    instance.created = created
    return instance


def test_resolve_active_name_uses_explicit_name(catalog):
    catalog(DBConnection(name="PRIMARY", host="h", is_default=True))
    db_module.set_active_database("OTHER")
    try:
        assert resolve_active_name() == "OTHER"
    finally:
        db_module.set_active_database("")


def test_resolve_active_name_falls_back_to_default(catalog):
    catalog(
        DBConnection(name="A", host="h"),
        DBConnection(name="B", host="h", is_default=True),
    )
    db_module.set_active_database("")
    assert resolve_active_name() == "B"


def test_resolve_active_name_empty_catalog(catalog):
    catalog()
    db_module.set_active_database("")
    assert resolve_active_name() == ""


async def test_unknown_database_raises(catalog, pool):
    catalog(DBConnection(name="A", host="h", is_default=True))
    db_module.set_active_database("MISSING")
    try:
        with pytest.raises(DatabaseConnectionError, match="Unknown database 'MISSING'"):
            await pool._resolve_pool()
        assert pool.created == []
    finally:
        db_module.set_active_database("")


async def test_no_database_configured(catalog, pool):
    catalog()
    db_module.set_active_database("")
    with pytest.raises(DatabaseConnectionError, match="No Oracle database available"):
        await pool._resolve_pool()


async def test_pool_created_on_demand(catalog, pool):
    catalog(DBConnection(name="A", host="h"))
    db_module.set_active_database("A")
    try:
        resolved = await pool._resolve_pool()
        assert resolved is pool._pools["A"]
        assert pool.created == ["A"]
    finally:
        db_module.set_active_database("")


async def test_cooldown_skips_reconnect(catalog, pool):
    catalog(DBConnection(name="A", host="h"))
    db_module.set_active_database("A")
    pool._failed_at["A"] = time.monotonic()
    try:
        with pytest.raises(DatabaseConnectionError, match="not available"):
            await pool._resolve_pool()
        assert pool.created == []
    finally:
        db_module.set_active_database("")


async def test_cooldown_expires_and_retries(catalog, pool):
    catalog(DBConnection(name="A", host="h"))
    db_module.set_active_database("A")
    pool._failed_at["A"] = time.monotonic() - POOL_RETRY_COOLDOWN_S - 1
    try:
        resolved = await pool._resolve_pool()
        assert resolved is pool._pools["A"]
        assert pool.created == ["A"]
    finally:
        db_module.set_active_database("")


async def test_drop_pool_clears_failure_marker(catalog, pool):
    catalog(DBConnection(name="A", host="h"))
    db_module.set_active_database("A")
    pool._failed_at["A"] = time.monotonic()
    pool._pools["A"] = object()
    try:
        await pool.drop_pool("A")
        assert "A" not in pool._pools
        assert "A" not in pool._failed_at
        resolved = await pool._resolve_pool()
        assert resolved is pool._pools["A"]
    finally:
        db_module.set_active_database("")


@pytest.mark.parametrize("message", ["DPY-6005: dropped", "DPI-1067: timeout"])
def test_reraise_translates_timeouts(message):
    with pytest.raises(QueryTimeoutError):
        OraclePool._reraise(Exception(message))


def test_reraise_passes_through_other_errors():
    original = ValueError("boom")
    with pytest.raises(ValueError, match="boom"):
        OraclePool._reraise(original)
