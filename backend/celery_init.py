import os
from celery import Celery
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
) 