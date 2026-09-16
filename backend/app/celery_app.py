from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "oracle_monitor",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.collect_metrics",
        "app.tasks.check_thresholds",
        "app.tasks.generate_awr",
        "app.tasks.cleanup",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=settings.CELERY_TASK_TRACK_STARTED,
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
    worker_prefetch_multiplier=settings.CELERY_WORKER_PREFETCH_MULTIPLIER,
    worker_max_tasks_per_child=100,
    result_expires=3600,
    beat_schedule={
        "collect-metrics": {
            "task": "app.tasks.collect_metrics.collect_all_metrics",
            "schedule": 30.0,
        },
        "check-thresholds": {
            "task": "app.tasks.check_thresholds.check_all_thresholds",
            "schedule": 60.0,
        },
        "generate-awr-snapshot": {
            "task": "app.tasks.generate_awr.create_awr_snapshot",
            "schedule": crontab(hour=2, minute=0),
        },
        "cleanup-old-data": {
            "task": "app.tasks.cleanup.cleanup_old_data",
            "schedule": crontab(hour=3, minute=0),
        },
    },
)

celery_app.autodiscover_tasks(["app.tasks"])