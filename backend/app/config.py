from functools import lru_cache
from pathlib import Path
from typing import Optional
from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    
    APP_NAME: str = "Oracle Monitor Dashboard"
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    ORACLE_USER: str = Field(..., description="Oracle username")
    ORACLE_PASSWORD: SecretStr = Field(..., description="Oracle password")
    ORACLE_DSN: str = Field(..., description="Oracle DSN (host:port/service)")
    ORACLE_POOL_MIN: int = Field(default=2, ge=1, le=10)
    ORACLE_POOL_MAX: int = Field(default=20, ge=2, le=100)
    ORACLE_POOL_INCREMENT: int = Field(default=2, ge=1, le=10)
    ORACLE_TIMEOUT: int = Field(default=30, ge=5, le=300)
    ORACLE_ENCODING: str = "UTF-8"
    ORACLE_NCHAR_ENCODING: str = "UTF-8"

    DATABASES_JSON: str = ""
    DATABASES_FILE: str = "config/databases.json"
    THRESHOLDS_FILE: str = "config/thresholds.json"
    
    REDIS_URL: str = Field(default="redis://redis:6379/0")
    REDIS_MAX_CONNECTIONS: int = 50
    REDIS_SOCKET_TIMEOUT: int = 5
    REDIS_SOCKET_CONNECT_TIMEOUT: int = 5
    
    CACHE_TTL_DEFAULT: int = 30
    CACHE_TTL_INSTANCE_INFO: int = 300
    CACHE_TTL_TABLESPACES: int = 60
    CACHE_TTL_ASH: int = 10
    CACHE_TTL_SQL_MONITOR: int = 5
    CACHE_TTL_SESSIONS: int = 15
    CACHE_TTL_WAITS: int = 15
    CACHE_TTL_MEMORY: int = 60
    
    SECRET_KEY: SecretStr = Field(..., min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, ge=5, le=1440)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, ge=1, le=30)
    BCRYPT_ROUNDS: int = 12
    
    CORS_ORIGINS: list[str] = Field(default=["http://localhost:3000", "http://localhost:5173"])
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    CORS_ALLOW_HEADERS: list[str] = ["*"]
    
    HAS_DIAGNOSTICS_PACK: bool = True
    ENABLE_KILL_SESSION: bool = False
    ENABLE_AWR_REPORTS: bool = True
    ENABLE_AUTO_REFRESH: bool = True
    DEFAULT_REFRESH_INTERVAL: int = 30
    
    THRESHOLD_TABLESPACE_WARN: int = Field(default=80, ge=50, le=95)
    THRESHOLD_TABLESPACE_CRIT: int = Field(default=90, ge=60, le=99)
    THRESHOLD_SESSIONS_WARN: int = Field(default=70, ge=50, le=90)
    THRESHOLD_SESSIONS_CRIT: int = Field(default=85, ge=60, le=95)
    THRESHOLD_CPU_WARN: int = Field(default=80, ge=50, le=95)
    THRESHOLD_CPU_CRIT: int = Field(default=90, ge=60, le=99)
    THRESHOLD_WAIT_TIME_MS_WARN: int = Field(default=100, ge=10, le=1000)
    THRESHOLD_WAIT_TIME_MS_CRIT: int = Field(default=500, ge=50, le=5000)
    
    CELERY_BROKER_URL: str = "redis://redis:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/2"
    CELERY_TASK_TRACK_STARTED: bool = True
    CELERY_TASK_TIME_LIMIT: int = 300
    CELERY_WORKER_PREFETCH_MULTIPLIER: int = 4
    
    METRICS_ENABLED: bool = True
    METRICS_FLUSH_INTERVAL: int = 30
    METRICS_RETENTION_HOURS: int = 168
    METRICS_COLLECT_DB: bool = True
    METRICS_COLLECT_INFRA: bool = True
    METRICS_COLLECT_API: bool = True
    
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 500
    
    EXPORT_MAX_ROWS: int = 10000
    REPORT_TEMPLATE_DIR: Path = Path("app/templates/reports")
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()