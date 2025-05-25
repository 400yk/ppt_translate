# Troubleshooting Guide

This guide helps you resolve common issues with the PPT Translation application.

## 🚨 Common Issues and Solutions

### 1. Frontend Connection Error (ERR_CONNECTION_REFUSED)

**Error**: `GET http://localhost:5000/api/guest/status net::ERR_CONNECTION_REFUSED`

**Cause**: The Flask backend server is not running.

**Solution**:
```bash
# Start the backend server
cd backend
python app.py
```

The server should start on `http://localhost:5000`. You should see output like:
```
* Running on http://127.0.0.1:5000
* Debug mode: on
```

### 2. Gemini API JSON Parsing Error

**Error**: `Error parsing Gemini JSON: Expecting ',' delimiter` or `unterminated string literal`

**Cause**: Gemini API returns malformed JSON when translating text with special characters (quotes, newlines, etc.).

**Solution**: The latest update includes improved JSON parsing with multiple fallback methods:
- Automatic JSON repair for common issues
- Regex-based string extraction
- Better error handling

**Prevention**:
- Ensure your `GEMINI_API_KEY` is valid
- Check that you have sufficient API quota
- The improved prompt should reduce malformed responses

### 3. Redis Connection Issues

**Error**: `ConnectionError: Error connecting to Redis`

**Cause**: Redis server is not accessible or `REDIS_URL` is incorrect.

**Solution**:
1. **Check Redis Cloud Setup**:
   - Verify your Redis Cloud database is active
   - Check the connection URL format: `redis://username:password@host:port`

2. **Set Environment Variable**:
   ```bash
   # Windows
   set REDIS_URL=redis://username:password@host:port
   
   # Linux/Mac
   export REDIS_URL=redis://username:password@host:port
   ```

3. **Test Connection**:
   ```bash
   cd backend
   python -c "import redis; r = redis.from_url('your_redis_url'); print('Connected:', r.ping())"
   ```

### 4. Celery Worker Not Starting

**Error**: `ImportError` or worker fails to start

**Cause**: Missing dependencies or import issues.

**Solution**:
1. **Install Dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Start Worker with Correct Pool**:
   ```bash
   # Windows
   celery -A app.celery_app worker --loglevel=info --pool=solo
   
   # Linux/Mac
   celery -A app.celery_app worker --loglevel=info
   ```

3. **Check Imports**:
   ```bash
   cd backend
   python -c "from services.tasks import process_translation_task; print('Import successful')"
   ```

### 5. Translation Tasks Stuck in PENDING

**Error**: Tasks never complete, always show PENDING status

**Cause**: Celery worker is not connected to Redis or not processing tasks.

**Solution**:
1. **Check Worker Status**:
   ```bash
   cd backend
   celery -A app.celery_app status
   ```

2. **Check Active Tasks**:
   ```bash
   celery -A app.celery_app inspect active
   ```

3. **Restart Services**:
   - Stop all services (Ctrl+C)
   - Start Redis connection test
   - Start Celery worker first
   - Start Flask app

### 6. File Download Errors

**Error**: `File no longer exists` or download fails

**Cause**: Translated files are stored temporarily and may be cleaned up.

**Solution**:
- Files are stored in temporary directories on the worker
- For production, implement S3 storage (see `ASYNC_TRANSLATION_SETUP.md`)
- Ensure sufficient disk space on the worker

### 7. Environment Variables Not Set

**Error**: Missing API keys or configuration

**Solution**:
1. **Create Environment File**:
   ```bash
   # In backend directory, create .env file
   cd backend
   echo "GEMINI_API_KEY=your_key_here" > .env
   echo "REDIS_URL=your_redis_url" >> .env
   ```

2. **Set in Current Session**:
   ```bash
   # Windows
   set GEMINI_API_KEY=your_key_here
   set REDIS_URL=your_redis_url
   
   # Linux/Mac
   export GEMINI_API_KEY=your_key_here
   export REDIS_URL=your_redis_url
   ```

## 🛠️ Quick Start Scripts

### Windows Users
Run `start_dev.bat` to start all services automatically:
```cmd
start_dev.bat
```

### Linux/Mac Users
Run `start_dev.sh` to start all services:
```bash
./start_dev.sh
```

## 🔍 Debugging Commands

### Check Service Status
```bash
# Check if Flask is running
curl http://localhost:5000/api/guest/status

# Check if frontend is running
curl http://localhost:3000

# Check Celery worker
cd backend
celery -A app.celery_app inspect stats
```

### View Logs
```bash
# Backend logs (in Flask terminal)
# Look for API requests and errors

# Celery logs (in Celery terminal)
# Look for task processing and errors

# Frontend logs (in npm terminal)
# Look for network errors and API calls
```

### Test Translation Manually
```bash
# Test guest translation endpoint
curl -X POST http://localhost:5000/guest-translate-async-start \
  -F "file=@test.pptx" \
  -F "src_lang=zh" \
  -F "dest_lang=en"

# Check task status (replace TASK_ID)
curl http://localhost:5000/guest-translate-status/TASK_ID
```

## 📋 Checklist for Setup

- [ ] Redis Cloud database created and URL obtained
- [ ] Gemini API key obtained from Google AI Studio
- [ ] Environment variables set (`REDIS_URL`, `GEMINI_API_KEY`)
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Flask server running on port 5000
- [ ] Celery worker running and connected to Redis
- [ ] Frontend running on port 3000

## 🆘 Still Having Issues?

1. **Check the Console**: Look for specific error messages in browser console
2. **Check Server Logs**: Look at Flask and Celery terminal outputs
3. **Verify Environment**: Ensure all environment variables are set correctly
4. **Test Components**: Test each service individually before running together
5. **Check Network**: Ensure no firewall blocking local connections

## 📞 Getting Help

If you're still experiencing issues:
1. Note the exact error message
2. Check which service is failing (Frontend, Backend, Celery, Redis)
3. Verify your environment setup
4. Try the manual testing commands above 