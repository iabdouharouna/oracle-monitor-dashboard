from __future__ import annotations

import time

import structlog

logger = structlog.get_logger(__name__)


class ApiMetricsBuffer:
    """In-process rolling buffer for API request metrics.

    The FastAPI middleware records every request into an in-memory buffer.
    A periodic background task flushes the buffer to the metrics history.
    """

    WINDOW_SECONDS = 30.0

    def __init__(self) -> None:
        self._requests: list[tuple[float, int]] = []  # (timestamp, duration_ms)
        self._errors: list[float] = []

    def record(self, duration_ms: float, status_code: int) -> None:
        now = time.time()
        self._requests.append((now, duration_ms))
        # keep only the last window
        cutoff = now - self.WINDOW_SECONDS
        self._prune(cutoff)
        if status_code >= 500:
            self._errors.append(now)
            cutoff_e = now - self.WINDOW_SECONDS
            self._errors = [e for e in self._errors if e >= cutoff_e]

    def _prune(self, cutoff: float) -> None:
        if not self._requests:
            return
        while self._requests and self._requests[0][0] < cutoff:
            self._requests.pop(0)

    def snapshot(self) -> dict[str, float]:
        """Return aggregated metrics over the current window and reset it."""
        now = time.time()
        cutoff = now - self.WINDOW_SECONDS
        self._prune(cutoff)
        total = len(self._requests)
        errors = len([e for e in self._errors if e >= cutoff])
        avg_latency_ms = (
            sum(d for _, d in self._requests) / total if total else 0.0
        )
        self._requests.clear()
        self._errors = [e for e in self._errors if e >= cutoff]
        return {
            "requests_total": float(total),
            "latency_avg_ms": round(avg_latency_ms, 2),
            "errors_total": float(errors),
        }


api_metrics_buffer = ApiMetricsBuffer()


async def flush_api_metrics() -> None:
    """Periodic flush of buffered API metrics to the history store."""
    from app.services.metrics_service import MetricsService

    snapshot = api_metrics_buffer.snapshot()
    try:
        await MetricsService.store("api_requests_total", snapshot["requests_total"])
        await MetricsService.store("api_latency_avg_ms", snapshot["latency_avg_ms"])
        await MetricsService.store("api_errors_total", snapshot["errors_total"])
    except Exception:
        logger.exception("Failed to flush API metrics")