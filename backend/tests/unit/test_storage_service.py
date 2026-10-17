import pytest

from app.services.storage_service import StorageService


def _raw(name: str, size: float, used: float, max_size: float, auto: bool) -> dict:
    return {
        "tablespace_name": name,
        "contents": "PERMANENT",
        "status": "ONLINE",
        "size_mb": size,
        "used_mb": used,
        "max_size_mb": max_size,
        "autoextensible": "YES" if auto else "NO",
        "pct_used": 0,
        "legacy_fallback": 0,
    }


@pytest.fixture
def fake_rows(monkeypatch):
    def _install(rows: list[dict]) -> None:
        async def _fake() -> list[dict]:
            return rows

        monkeypatch.setattr(StorageService, "get_tablespaces_raw", staticmethod(_fake))

    return _install


async def test_autoextensible_uses_max_capacity(fake_rows):
    fake_rows([_raw("TS_AUTO", 8.0, 6.99, 65536.0, True)])

    ts = (await StorageService.get_tablespaces())[0]

    assert ts["maxSizeMB"] == 65536.0
    assert ts["pctUsed"] == 87.4
    assert ts["pctUsedMax"] == 0.01
    assert ts["freeMB"] == 1.01
    assert ts["autoextensible"] is True


async def test_non_autoextensible_ratios_match(fake_rows):
    fake_rows([_raw("TS_FIXED", 100.0, 80.0, 0.0, False)])

    ts = (await StorageService.get_tablespaces())[0]

    assert ts["maxSizeMB"] == 100.0
    assert ts["pctUsed"] == 80.0
    assert ts["pctUsedMax"] == 80.0


async def test_capacity_never_below_allocated(fake_rows):
    fake_rows([_raw("TS_SMALL_MAX", 100.0, 10.0, 50.0, True)])

    ts = (await StorageService.get_tablespaces())[0]

    assert ts["maxSizeMB"] == 100.0
    assert ts["pctUsedMax"] == 10.0


async def test_zero_size_is_safe(fake_rows):
    fake_rows([_raw("TS_EMPTY", 0.0, 0.0, 0.0, False)])

    ts = (await StorageService.get_tablespaces())[0]

    assert ts["pctUsed"] == 0.0
    assert ts["pctUsedMax"] == 0.0
    assert ts["maxSizeMB"] == 0.0
