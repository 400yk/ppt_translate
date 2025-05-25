# Async Translation Setup with Redis Cloud

This document explains how to set up and test the new asynchronous translation system using Redis Cloud and Celery.

## Backend Setup

### 1. Redis Cloud Configuration

1. Sign up for Redis Cloud at https://redis.com/try-free/
2. Create a new database
3. Get your Redis connection URL (format: `redis://username:password@host:port`)
4. Add the Redis URL to your environment variables:
   ```bash
   export REDIS_URL="redis://username:password@host:port"
   ```

### 2. Install Dependencies

Make sure you have all required dependencies in your `backend/requirements.txt`:
```
celery[redis]>=5.2.0
redis>=4.0.0
```

### 3. Start the Celery Worker

In your backend directory, run:
```bash
celery -A app.celery_app worker --loglevel=info --pool=solo
```

For Windows, use the `--pool=solo` option to avoid issues with the default pool.

### 4. Start the Flask Application

In another terminal, start your Flask app:
```bash
python app.py
```

## Frontend Setup

The frontend has been updated to use the new async translation endpoints:

### New Features Added:

1. **Async Translation Service** (`src/lib/translation-service.ts`):
   - `startAsyncTranslation()` - Starts a translation task
   - `pollTranslationStatus()` - Polls task status
   - `downloadTranslatedFile()` - Downloads completed files
   - `translateFileAsync()` - Complete workflow with polling

2. **Updated Translation Form** (`src/components/translation/TranslationForm.tsx`):
   - Status message display
   - Progress tracking with polling
   - Error handling for async operations

### API Endpoints

#### Authenticated Users:
- `POST /translate_async_start` - Start translation
- `GET /translate_status/<task_id>` - Check status
- `GET /download/<task_id>` - Download file

#### Guest Users:
- `POST /guest-translate-async-start` - Start translation
- `GET /guest-translate-status/<task_id>` - Check status
- `GET /guest-download/<task_id>` - Download file

## Testing the System

### 1. Test Backend Endpoints

You can test the backend endpoints using curl or Postman:

```bash
# Start a translation (replace with actual file)
curl -X POST http://localhost:5000/guest-translate-async-start \
  -F "file=@test.pptx" \
  -F "src_lang=zh" \
  -F "dest_lang=en"

# Check status (replace TASK_ID with actual task ID)
curl http://localhost:5000/guest-translate-status/TASK_ID

# Download file when ready
curl http://localhost:5000/guest-download/TASK_ID -o translated_file.pptx
```

### 2. Test Frontend Integration

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Upload a PowerPoint file through the web interface
3. Observe the status messages and progress bar
4. Download the translated file when complete

### 3. Monitor Celery Worker

Watch the Celery worker logs to see tasks being processed:
```bash
celery -A app.celery_app worker --loglevel=info --pool=solo
```

You should see output like:
```
[2024-01-01 12:00:00,000: INFO/MainProcess] Received task: services.tasks.process_translation_task[task-id]
[2024-01-01 12:00:05,000: INFO/MainProcess] Task services.tasks.process_translation_task[task-id] succeeded
```

## Deployment Considerations

### Heroku Deployment

1. **Add Redis Add-on**:
   - Go to your Heroku dashboard
   - Navigate to "Resources"
   - Add "Heroku Data for Redis"
   - This automatically sets the `REDIS_URL` environment variable

2. **Scale Worker Dyno**:
   - In the "Resources" tab, ensure you have at least one worker dyno running
   - Scale it to 1 or more instances

3. **Procfile** should contain:
   ```
   web: gunicorn app:app
   worker: celery -A app.celery_app worker --loglevel=info --pool=solo
   ```

### File Storage Considerations

Currently, translated files are stored on the worker dyno's ephemeral storage. For production, consider:

1. **AWS S3 Integration**: Store files in S3 and return pre-signed URLs
2. **Temporary File Cleanup**: Implement cleanup of old translation files
3. **File Expiration**: Set expiration times for download links

## Troubleshooting

### Common Issues:

1. **Redis Connection Errors**:
   - Verify your `REDIS_URL` is correct
   - Check Redis Cloud dashboard for connection details

2. **Celery Worker Not Starting**:
   - Ensure Redis is accessible
   - Check for import errors in tasks
   - Use `--pool=solo` on Windows

3. **Tasks Stuck in PENDING**:
   - Verify worker is running and connected to Redis
   - Check worker logs for errors

4. **File Download Errors**:
   - Ensure file paths are accessible to the web process
   - Check file permissions

### Debug Commands:

```bash
# Check Celery status
celery -A app.celery_app status

# Inspect active tasks
celery -A app.celery_app inspect active

# Monitor task events
celery -A app.celery_app events
```

## Next Steps

1. Implement S3 file storage for production
2. Add task cleanup and file expiration
3. Implement task progress updates
4. Add retry logic for failed tasks
5. Monitor and optimize worker performance 