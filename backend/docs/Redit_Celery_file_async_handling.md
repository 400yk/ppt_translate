From backend folder:
celery -A app.celery_app worker --loglevel=info --pool=solo


# Testing:
(Navigate to your backend directory first if app.py is there).
Test: Use a tool like Postman or curl (or your frontend if you adapt it quickly) to:
POST a file to /api/translate_async_start. You should get a task_id.
GET from /api/translate_status/<task_id>. Observe the status changing from PENDING to SUCCESS (or FAILURE).
Check the Celery worker logs for output from the process_translation_task.

Heroku Setup:
Add Redis Add-on: Go to your Heroku dashboard for the translide-backend-... app, navigate to "Resources", and add a Redis add-on (e.g., "Heroku Data for Redis"). This will automatically set the REDIS_URL environment variable that your backend/app.py will use for Celery configuration.
Scale Worker Dyno: After deploying, go to your Heroku dashboard ("Resources" tab) and ensure you have at least one worker dyno running. You might need to enable it and set it to 1 (or more). Heroku won't automatically start the worker process defined in Procfile unless you scale it.

Frontend Adaptation:
Your frontend (src/lib/translation-service.ts and src/components/translation/TranslationForm.tsx) needs to be updated:
Change the translateFile function in translation-service.ts to call /api/translate_async_start.

It should then store the task_id.

Implement a polling mechanism (e.g., using setInterval) to call /api/translate_status/<task_id> every few seconds.
Update the progress bar based on the task status.

When the task is SUCCESS, the result will contain translated_file_path. This is the part that needs further work for actual file download. For now, the frontend will get this path, but it won't be a downloadable URL.
File Download Mechanism (Post-Celery Setup):

This is a critical piece. Once the Celery task completes and the file is saved on the worker dyno (or ideally to S3):
If using S3: The Celery task should save the file to S3 and return a pre-signed S3 URL for download, or an S3 key that the web app can use to generate a pre-signed URL. The /api/translate_status endpoint would then provide this URL to the client.

If using worker's ephemeral storage (less ideal): This is much harder. The web dyno can't directly access files on another worker dyno. You'd need a more complex setup, perhaps having the worker notify the web app via another Redis message when a file is ready, and then the web app would somehow stream it (not straightforward). S3 is strongly recommended.

