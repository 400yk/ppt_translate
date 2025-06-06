# Deploying Flask Backend to Heroku

This guide will help you deploy your Flask backend (in the `backend` folder) to Heroku using the Heroku CLI on Windows.

---

## 1. Install the Heroku CLI (Windows)

1. Go to the [Heroku CLI download page](https://devcenter.heroku.com/articles/heroku-cli#download-and-install).
2. Download the Windows 64-bit installer (`heroku-x64.exe`).
3. Run the installer and follow the prompts.
4. After installation, open a new PowerShell window and run:
   ```sh
   heroku --version
   ```
   You should see the Heroku CLI version output.

---

## 2. Prepare Your Backend for Deployment

Make sure your `backend` folder contains:
- `Procfile` with:
  ```
  web: gunicorn app:app
  ```
- `requirements.txt` (with `gunicorn` and `Flask-Migrate` included)
- `runtime.txt` (e.g., `python-3.11.7`)

---

## 3. Deploy to Heroku

### a. Initialize Git (if not already done)
```sh
cd backend
git init
```

### b. Commit Your Code
```sh
git add .
git commit -m "Initial backend commit"
```

### c. Create a New Heroku App
```sh
heroku create your-app-name-backend
```
Replace `your-app-name-backend` with a unique name.

### d. Add Heroku Remote (if not automatically added)
```sh
heroku git:remote -a your-app-name-backend
```

### e. Push to Heroku
```sh
git push heroku master
```
Or, if your branch is `main`:
```sh
git push heroku main
```

---

## 4. Set Environment Variables
Set any required environment variables (e.g., API keys):
```sh
heroku config:set GEMINI_API_KEY=your_api_key -a your-app-name-backend
```
Add any other variables your backend needs.

**Important:**
- Set `FLASK_API_URL` to your Heroku backend URL in production, **not** to `localhost`. For example:
  ```
  heroku config:set FLASK_API_URL=https://your-app-name-backend.herokuapp.com -a your-app-name-backend
  ```
- This ensures that any URLs generated by your backend (e.g., for Stripe redirects or API responses) are correct for users accessing your deployed app.

---

## 5. Update Frontend API URL
After deployment, update your frontend's environment variables to point to your Heroku backend.

### For Next.js Frontend (Important!)
With Next.js, you must use the `NEXT_PUBLIC_` prefix for any environment variables that need to be accessible in the browser:

```sh
heroku config:set NEXT_PUBLIC_API_URL=https://your-app-name-backend.herokuapp.com -a your-frontend-app-name
```

Also update your frontend code to use this environment variable:
```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
```

**Why `NEXT_PUBLIC_` is required:**
- Next.js only exposes environment variables prefixed with `NEXT_PUBLIC_` to the browser.
- Regular environment variables (without this prefix) are only available server-side.
- Since API calls are often made from the client-side, the `NEXT_PUBLIC_` prefix is essential.

Make sure your frontend is **not** using `localhost` for the backend in production.

---

## 6. Run Database Migrations on Heroku

If you are in your backend repo and have already set the Heroku remote, you can simply run:
```sh
heroku run bash
```
This will open a shell in your Heroku dyno.

Then, in the Heroku shell, run:
```sh
flask db upgrade
```
If you see an error about `FLASK_APP` not being set, try:
```sh
export FLASK_APP=app.py
flask db upgrade
```

---

## 7. Verify Deployment
Visit `https://your-app-name-backend.herokuapp.com` in your browser to check if your backend is running.

---

## Troubleshooting
- Make sure all dependencies are in `requirements.txt`.
- Check Heroku logs with:
  ```sh
  heroku logs --tail
  ```
- Ensure your backend is listening on `0.0.0.0` and the port provided by Heroku (already handled in `app.py`).
- If your frontend cannot reach the backend, check these common issues:
  1. Verify both `FLASK_API_URL` (backend) and `NEXT_PUBLIC_API_URL` (frontend) are set to the correct Heroku backend URL, **not** localhost.
  2. Check for `ERR_CONNECTION_REFUSED` errors in your browser console - this usually means your frontend is still trying to use localhost.
  3. Check CORS settings in your backend if you get CORS errors.

## Database Migration Issues

Heroku's ephemeral filesystem can cause issues with database migrations and file-based storage. Here are some common problems and solutions:

### File Storage Issues

**Problem**: Files saved to the filesystem (like JSON data files) don't persist between Heroku dynos or after restarts.

**Solution**: Always use the database or another persistent storage solution (e.g., S3) for any data that needs to persist. For example:
- Instead of storing data in JSON files, create database tables
- For user uploads, use cloud storage like AWS S3 or Cloudinary

### Migration Problems

If you encounter migration issues, try these steps:

1. **Check migration files for errors**:
   - Ensure revision IDs don't contain placeholders like `[auto-generated]`
   - Make sure table names match between your models and migrations

2. **Check current migration status**:
   ```sh
   heroku run flask db current
   ```

3. **Manually set the migration version** if needed:
   ```sh
   heroku run flask db stamp <revision_id>
   ```

4. **Create tables directly** (emergency fallback):
   ```sh
   heroku run python
   ```
   ```python
   from app import app, db
   with app.app_context():
       db.create_all()
       print("Tables created successfully")
   ```

5. **Reset database and migrations** (caution: destroys all data):
   ```sh
   heroku pg:reset DATABASE_URL --confirm your-app-name
   heroku run flask db upgrade
   ```

6. **Synchronize environments**:
   Always ensure your local and Heroku environments are on the same migration version to prevent conflicts.

### Best Practices

1. **Test migrations locally** before deploying to Heroku
2. **Version control your migrations** - ensure all migration files are committed to Git
3. **Use proper naming conventions** in your models (e.g., explicit `__tablename__`)
4. **Backup your data** before major migrations
5. **Check logs** for detailed error messages during migration issues:
   ```sh
   heroku logs --tail
   ```

---

Happy deploying! 