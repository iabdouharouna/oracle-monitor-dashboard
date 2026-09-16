from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

import structlog

from app.redis import redis_client

logger = structlog.get_logger(__name__)


def _isoformat(epoch: float) -> str:
    return datetime.fromtimestamp(float(epoch), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class MetricsService:
    METRIC_NAMES = [
        "db_cpu_pct",
        "db_sessions_total",
        "db_sessions_active",
        "db_storage_pct",
        "db_io_read_mbps",
        "db_io_write_mbps",
        "api_requests_total",
        "api_latency_avg_ms",
        "api_errors_total",
        "host_cpu_pct",
        "host_ram_pct",
        "host_ram_used_mb",
        "host_disk_pct",
    ]

    RETENTION_SECONDS = 7 * 24 * 3600
    MAX_POINTS_PER_SERIES = 30000

    @staticmethod
    def _key(metric: str) -> str:
        return f"metrics:snapshot:{metric}"

    @classmethod
    async def store(cls, metric: str, value: float, timestamp: float | None = None) -> None:
        ts = timestamp if timestamp is not None else time.time()
        key = cls._key(metric)
        try:
            member = f"{int(ts * 1000)}:{round(float(value), 4)}"
            await redis_client.client.zadd(key, {member: ts})
            await cls._prune(key)
        except Exception:
            logger.exception("Failed to store metric", metric=metric)

    @classmethod
    async def _prune(cls, key: str) -> None:
        try:
            await redis_client.client.zremrangebyscore(key, 0, time.time() - cls.RETENTION_SECONDS)
            count = await redis_client.client.zcard(key)
            if count > cls.MAX_POINTS_PER_SERIES:
                await redis_client.client.zremrangebyrank(
                    key, 0, count - cls.MAX_POINTS_PER_SERIES - 1
                )
        except Exception:
            logger.exception("Failed to prune metric series", key=key)

    @classmethod
    async def get_history(
        cls, metrics: list[str], hours: float, step_seconds: int = 0
    ) -> dict[str, list[dict[str, Any]]]:
        if not metrics:
            metrics = cls.METRIC_NAMES
        end_ts = time.time()
        start_ts = end_ts - hours * 3600
        result: dict[str, list[dict[str, Any]]] = {}
        for metric in metrics:
            key = cls._key(metric)
            try:
                raw = await redis_client.client.zrangebyscore(key, start_ts, end_ts, withscores=True)
            except Exception:
                logger.exception("Failed to read history", metric=metric)
                raw = []
            points = []
            for member, score in raw:
                member_str = member.decode("utf-8") if isinstance(member, bytes) else str(member)
                _, _, value = member_str.partition(":")
                try:
                    points.append({"timestamp": float(score), "value": float(value)})
                except (TypeError, ValueError):
                    continue
            if not points:
                result[metric] = []
                continue
            result[metric] = cls._to_iso(cls._resample(points, step_seconds))
        return result

    @staticmethod
    def _resample(points: list[dict[str, Any]], step_seconds: int) -> list[dict[str, Any]]:
        if step_seconds <= 0 or not points:
            return points
        buckets: dict[int, list[float]] = {}
        for pt in points:
            bucket = int(float(pt["timestamp"]) // step_seconds) * step_seconds
            buckets.setdefault(bucket, []).append(float(pt["value"]))
        return [
            {"timestamp": bucket, "value": round(sum(values) / len(values), 4)}
            for bucket, values in sorted(buckets.items())
        ]

    @staticmethod
    def _to_iso(points: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {"timestamp": _isoformat(float(pt["timestamp"])), "value": pt["value"]}
            for pt in points
        ]

    @classmethod
    async def get_available(cls) -> list[str]:
        names: set[str] = set()
        try:
            keys = await redis_client.client.keys("metrics:snapshot:*")
            for raw_key in keys or []:
                key = (
                    raw_key.decode("utf-8")
                    if isinstance(raw_key, bytes)
                    else str(raw_key)
                )
                try:
                    if await redis_client.client.zcard(key):
                        names.add(key.rsplit(":", 1)[-1])
                except Exception:
                    continue
        except Exception:
            logger.exception("Failed to list available metrics")
        return sorted(names)