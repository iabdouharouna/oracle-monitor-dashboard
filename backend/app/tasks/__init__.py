"""Celery task package for scheduled monitoring jobs."""

from app.tasks.collect_metrics import collect_all_metrics
from app.tasks.check_thresholds import check_all_thresholds
from app.tasks.generate_awr import create_awr_snapshot
from app.tasks.cleanup import cleanup_old_data

__all__ = [
    "collect_all_metrics",
    "check_all_thresholds",
    "create_awr_snapshot",
    "cleanup_old_data",
]