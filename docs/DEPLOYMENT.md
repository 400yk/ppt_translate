# Deployment Guide: PowerPoint Translation App on Alicloud Ubuntu with Dokploy

This guide walks you through deploying the PowerPoint Translation application to an Alicloud Ubuntu server using Dokploy.

## Prerequisites

- Alicloud Ubuntu server with root access
- Domain name pointing to your server (e.g., `translide.co`)
- Git repository with your code

## Architecture Overview

The deployment consists of:
- **Frontend**: Next.js application (port 3000)
- **Backend**: Flask API (port 5000/8000)
- **Celery Worker**: Background task processing
- **PostgreSQL**: Database (port 5432)
- **Redis**: Cache and Celery broker (port 6379)

## Step 1: Install Dokploy

1. **SSH into your server:**
   ```bash
   ssh root@your-server-ip
   ```

2. **Install Dokploy:**
   ```bash
   curl -sSL https://dokploy.com/install.sh | sh
   ```
   
   **Note**: The script must be run as root.

3. **Access Dokploy:**
   - Open `http://your-server-ip:3000` in your browser
   - Complete the registration form to create your admin account

## Step 2: Create Project

1. **Click "Create Project"** in the Dokploy dashboard
2. **Configure:**
   - **Project Name**: `translide` (or your preferred name)
   - **Description**: `PowerPoint Translation Application`
3. **Click "Create"**

## Step 3: Set Up PostgreSQL Database

1. **Click "Create Service" → Database → PostgreSQL**
2. **Configure:**
   - **Service Name**: `postgres`
   - **Database Name**: `ppt_translate`
   - **Username**: `ppt_user`
   - **Password**: `[create-strong-password]` (save this!)
   - **Port**: `5432`
3. **Deploy and wait for green "running" status**

## Step 4: Set Up Redis Database

1. **Click "Create Service" → Database → Redis**
2. **Configure:**
   - **Service Name**: `redis`
   - **Port**: `6379`
   - **Password**: `[create-password]` (optional)
3. **Deploy and wait for green "running" status**

## Step 5: Deploy Flask Backend

1. **Click "Create Service" → Application → Git Repository**
2. **Configure:**
   - **Service Name**: `backend`
   - **Repository URL**: `https://github.com/yourusername/ppt_translate.git`
   - **Branch**: `master` (or your main branch)
   - **Build Path**: `/backend`
   - **Build Type**: `Nixpacks`

3. **Environment Variables:**
   ```
   DATABASE_URL=postgresql://ppt_user:[password]@translide-postgres-[id]:5432/ppt_translate
   REDIS_URL=redis://:[redis-password]@translide-redis-[id]:6379/0
   SECRET_KEY=[random-string]
   JWT_SECRET_KEY=[random-string]
   FLASK_ENV=production
   ```
   
   **Note**: Replace `[id]` with actual service IDs from your Dokploy dashboard

4. **Advanced Settings - Override Start Command:**
   ```bash
   /opt/venv/bin/gunicorn --bind 0.0.0.0:8000 --workers 4 app:app
   ```

5. **Domain Configuration:**
   - **Domain**: `translide.co`
   - **Path**: `/api`
   - **Port**: `8000`
   - **Enable HTTPS**: ✅

## Step 6: Deploy Celery Worker

1. **Click "Create Service" → Application → Git Repository**
2. **Configure:**
   - **Service Name**: `celery-worker`
   - **Repository**: Same as backend
   - **Branch**: `master`
   - **Build Path**: `/backend`
   - **Build Type**: `Nixpacks`

3. **Environment Variables:** (Same as backend)
   ```
   DATABASE_URL=postgresql://ppt_user:[password]@translide-postgres-[id]:5432/ppt_translate
   REDIS_URL=redis://:[redis-password]@translide-redis-[id]:6379/0
   SECRET_KEY=[same-as-backend]
   JWT_SECRET_KEY=[same-as-backend]
   FLASK_ENV=production
   ```

4. **Advanced Settings - Override Start Command:**
   ```bash
   /opt/venv/bin/celery -A app.celery_app worker --loglevel=info --pool=solo
   ```

## Step 7: Deploy Next.js Frontend

1. **Click "Create Service" → Application → Git Repository**
2. **Configure:**
   - **Service Name**: `frontend`
   - **Repository**: Same repository
   - **Branch**: `master`
   - **Build Path**: `/` (root directory)
   - **Build Type**: `Nixpacks`

3. **Environment Variables:**
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://translide.co/api
   PORT=3000
   ```

4. **Domain Configuration:**
   - **Domain**: `translide.co`
   - **Path**: `/`
   - **Port**: `3000`
   - **Enable HTTPS**: ✅

## Step 8: Initialize Database

1. **Access Backend Container Terminal:**
   - Go to Backend service → Docker Terminal
   - Select your backend container

2. **Create Database Tables:**
   ```bash
   cd /app
   /opt/venv/bin/python -c "from app import app, db; app.app_context().push(); db.create_all(); print('Database tables created successfully!')"
   ```

## Step 9: Generate Invitation Codes (If Needed)

1. **In the Backend Container Terminal:**
   ```bash
   cd /app
   /opt/venv/bin/python -m scripts.generate_codes
   ```

## Step 10: Verify Deployment

1. **Check all services are running:**
   - ✅ postgres (green status)
   - ✅ redis (green status)
   - ✅ backend (green status)
   - ✅ celery-worker (green status)
   - ✅ frontend (green status)

2. **Test your application:**
   - Visit `https://translide.co`
   - Try API endpoints: `https://translide.co/api`

## Common Issues & Solutions

### Mixed Content Errors
**Problem**: HTTPS frontend calling HTTP backend
**Solution**: Ensure `NEXT_PUBLIC_API_URL=https://translide.co` (path /api already added in backend/api code)

### 502 Bad Gateway
**Problem**: Backend not accessible
**Solution**: Check Gunicorn binding: `--bind 0.0.0.0:8000`

### Database Connection Issues
**Problem**: Can't connect to PostgreSQL/Redis
**Solution**: Use full service names (e.g., `translide-postgres-xxxxx`)

### Celery "not found" Error
**Problem**: Command not in PATH
**Solution**: Use full path: `/opt/venv/bin/celery`

### Tables Don't Exist
**Problem**: Database not initialized
**Solution**: Run `db.create_all()` command in backend container

## Environment Variables Reference

### Backend & Celery Worker
```bash
DATABASE_URL=postgresql://ppt_user:password@translide-postgres-id:5432/ppt_translate
REDIS_URL=redis://:password@translide-redis-id:6379/0
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
FLASK_ENV=production
```

### Frontend
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://translide.co/api
PORT=3000
```

## Security Notes

- Always use HTTPS in production
- Use strong passwords for databases
- Keep secret keys secure
- Review Dokploy's built-in security features
- Consider setting up database backups

## Scaling Considerations

- Monitor resource usage in Dokploy dashboard
- Adjust Gunicorn worker count based on CPU cores
- Consider Redis persistence settings
- Set up log rotation for long-term deployments

---

**Deployment completed successfully!** Your PowerPoint Translation application should now be running at `https://translide.co`. 