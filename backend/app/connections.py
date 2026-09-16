import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

DEFAULT_PORT = 1521


@dataclass
class DBConnection:
    name: str
    host: str
    port: int = DEFAULT_PORT
    service: str = ""
    username: str = ""
    password: str = field(repr=False, default="")
    is_default: bool = False
    is_active: bool = True

    @property
    def dsn(self) -> str:
        return f"{self.host}:{self.port}/{self.service}"

    @property
    def display_name(self) -> str:
        return f"{self.name} ({self.dsn})"

    def to_dict(self, include_password: bool = False) -> dict[str, Any]:
        data = {
            "name": self.name,
            "host": self.host,
            "port": self.port,
            "service": self.service,
            "username": self.username,
            "is_default": self.is_default,
            "is_active": self.is_active,
        }
        if include_password:
            data["password"] = self.password
        return data

    @classmethod
    def from_dict(cls, item: dict[str, Any]) -> "DBConnection":
        return cls(
            name=str(item.get("name") or "").strip(),
            host=str(item.get("host") or "").strip(),
            port=int(item.get("port") or DEFAULT_PORT),
            service=str(item.get("service") or "").strip(),
            username=str(item.get("username") or "").strip(),
            password=str(item.get("password") or ""),
            is_default=bool(item.get("is_default", False)),
            is_active=bool(item.get("is_active", True)),
        )


def _parse_env_json(raw: str) -> list[dict[str, Any]]:
    if not raw or not raw.strip():
        return []
    try:
        parsed = json.loads(raw)
    except (ValueError, TypeError) as exc:
        logger.warning("DATABASES_JSON: invalid JSON, ignoring", error=str(exc))
        return []
    if not isinstance(parsed, list):
        logger.warning("DATABASES_JSON: expected a list, ignoring")
        return []
    return [item for item in parsed if isinstance(item, dict)]


def load_connections() -> list[DBConnection]:
    """Build the list of database connections from DATABASES_JSON.

    The PRIMARY pool (single ORACLE_*) is always present as the fallback and is
    marked as default unless any configured connection is explicitly flagged
    is_default=true.
    """
    primary = DBConnection(
        name=settings.ORACLE_DSN.split("/")[-1] or "PRIMARY",
        host=settings.ORACLE_DSN.split(":")[0],
        service=settings.ORACLE_DSN.split("/")[-1],
        username=settings.ORACLE_USER,
        password=settings.ORACLE_PASSWORD.get_secret_value(),
        is_default=True,
    )

    configured: list[DBConnection] = []
    for item in _parse_env_json(settings.DATABASES_JSON):
        conn = DBConnection.from_dict(item)
        if not conn.name or not conn.host:
            logger.warning("DATABASES_JSON: entry missing name/host, skipping", item=item)
            continue
        configured.append(conn)
        logger.info("Configured database connection", name=conn.name, dsn=conn.dsn)

    if not configured:
        return [primary]

    default_present = any(conn.is_default for conn in configured)
    if not default_present:
        configured[0].is_default = True
    return [primary, *configured]


def database_file_path() -> Path:
    return Path(settings.DATABASES_FILE)


def load_database_file() -> list[DBConnection]:
    """Load editable connections from the persistent file."""
    path = database_file_path()
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError) as exc:
        logger.warning("DATABASES_FILE: unreadable, ignoring", path=str(path), error=str(exc))
        return []
    if not isinstance(data, list):
        return []
    return [DBConnection.from_dict(item) for item in data if isinstance(item, dict)]


def save_database_file(connections: list[DBConnection]) -> None:
    env_names = {conn.name for conn in load_connections()}
    persisted = [conn for conn in connections if conn.name not in env_names]
    path = database_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = [conn.to_dict(include_password=True) for conn in persisted]
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    logger.info("DATABASES_FILE: saved", path=str(path), count=len(payload))


def is_env_configured(name: str) -> bool:
    return name in {conn.name for conn in load_connections()}


def get_catalog() -> list[DBConnection]:
    """Effective catalog = PRIMARY + env-configured, overridden/persisted by file.

    Any entry in the file replaces the same-named entry from env (e.g. to edit
    credentials or add a database), and file-only entries are appended.
    """
    by_name: dict[str, DBConnection] = {conn.name: conn for conn in load_connections()}
    for conn in load_database_file():
        by_name[conn.name] = conn
    return list(by_name.values())