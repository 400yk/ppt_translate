import os
from celery import Celery
from celery.schedules import crontab
from config import REDIS_URL

# This is the central Celery application instance.
# Configure it with Redis broker and result backend
celery_app = Celery('backend_tasks')

# Get Redis URL from environment or use default
redis_url = REDIS_URL

# Configure Celery to use Redis
celery_app.conf.broker_url = redis_url
celery_app.conf.result_backend = redis_url

# Additional configuration
celery_app.conf.update(
    include=['services.tasks'],  # Path to your tasks module
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    # Explicitly disable any other transport options
    broker_transport_options={'visibility_timeout': 3600},
    result_expires=3600,
    # CRITICAL: Set prefetch to 1 to prevent loading multiple large tasks into memory
    # This ensures only one task is prefetched at a time, limiting RAM usage
    worker_prefetch_multiplier=1,
    # Periodic task schedule for cleanup
    beat_schedule={
        'cleanup-old-files': {
            'task': 'services.tasks.cleanup_old_uploaded_files',
            'schedule': crontab(hour=2, minute=0),  # Run daily at 2 AM
        },
    },
) 