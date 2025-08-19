# Admin Dashboard Deployment Guide

## Overview
This guide provides simple steps to deploy the new admin dashboard code to your existing server. The admin dashboard is now complete and ready for production deployment.

## Prerequisites
- ✅ Existing server deployment (following the main deployment guide)
- ✅ Admin user already created in the database
- ✅ Git repository with the latest admin dashboard code

## Quick Deployment Steps

### Step 1: Update Code on Server

**Option A: Using Git Pull (Recommended)**
```bash
# SSH into your server
ssh root@your-server-ip

# Navigate to your project directory
cd /path/to/your/project

# Pull the latest changes
git pull origin main

# Or if you're on a different branch
git pull origin your-branch-name
```

**Option B: Manual File Upload**
If you prefer to upload files manually:
1. Upload the updated files to your server
2. Ensure all new admin-related files are included

### Step 2: Update Backend Dependencies

```bash
# Navigate to backend directory
cd backend

# Install any new Python dependencies
pip install -r requirements.txt

# Or if using virtual environment
/opt/venv/bin/pip install -r requirements.txt
```

### Step 3: Update Frontend Dependencies

```bash
# Navigate to frontend directory (root of project)
cd /path/to/your/project

# Install new Node.js dependencies
npm install

# Build the frontend
npm run build
```

### Step 4: Run Database Migrations

```bash
# Navigate to backend directory
cd backend

# Run database migrations for admin features
python -m flask db upgrade

# Or if using virtual environment
/opt/venv/bin/python -m flask db upgrade
```

### Step 5: Restart Services

**If using Dokploy:**
1. Go to your Dokploy dashboard
2. Restart the backend service
3. Restart the frontend service
4. Restart the celery worker service

**If using manual deployment:**
```bash
# Restart backend
sudo systemctl restart your-backend-service

# Restart frontend
sudo systemctl restart your-frontend-service

# Restart celery worker
sudo systemctl restart your-celery-service
```

### Step 6: Verify Admin Dashboard

1. **Access the admin dashboard:**
   - Go to `https://your-domain.com/admin`
   - Login with your admin credentials

2. **Test admin features:**
   - ✅ Dashboard analytics
   - ✅ User management
   - ✅ Translation logs
   - ✅ Referral management
   - ✅ Revenue analytics
   - ✅ Settings page

## Admin User Setup (If Not Already Done)

If you haven't created an admin user yet:

```bash
# SSH into your server
ssh root@your-server-ip

# Navigate to backend directory
cd backend

# Run the admin setup script
python -m scripts.setup_admin

# Or if using virtual environment
/opt/venv/bin/python -m scripts.setup_admin
```

Follow the prompts to create your admin user.

## Environment Variables Check

Ensure these environment variables are set in your backend:

```bash
# Required for admin functionality
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
FLASK_ENV=production

# Database and Redis (should already be set)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Optional: Admin-specific settings
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-admin-password
```

## Troubleshooting

### Admin Dashboard Not Loading
1. Check browser console for errors
2. Verify frontend build completed successfully
3. Check if admin routes are accessible

### Admin Login Issues
1. Verify admin user exists in database
2. Check JWT_SECRET_KEY is set correctly
3. Ensure admin middleware is working

### Analytics Not Showing Data
1. Check if translation logs are being created
2. Verify database queries are working
3. Check celery worker is processing tasks

### Permission Errors
1. Verify user has `is_admin=True` in database
2. Check admin middleware configuration
3. Ensure proper authentication headers

## Post-Deployment Checklist

- [ ] Admin dashboard accessible at `/admin`
- [ ] Admin login working
- [ ] Dashboard analytics showing data
- [ ] User management table loading
- [ ] Translation logs displaying
- [ ] Referral management working
- [ ] Revenue analytics functional
- [ ] Settings page accessible
- [ ] All admin API endpoints responding
- [ ] No console errors in browser
- [ ] Mobile responsiveness working

## Rollback Plan

If something goes wrong:

1. **Revert to previous git commit:**
   ```bash
   git reset --hard HEAD~1
   git pull origin main
   ```

2. **Restart services:**
   ```bash
   # Restart all services
   sudo systemctl restart your-services
   ```

3. **Check application is working:**
   - Verify main app functionality
   - Test user features
   - Ensure no broken functionality

## Security Notes

- ✅ Admin routes are protected with authentication
- ✅ Admin users have restricted access
- ✅ All admin actions are logged
- ✅ JWT tokens are properly secured
- ✅ Database queries are sanitized

## Performance Considerations

- Admin dashboard loads analytics on demand
- Large datasets are paginated
- Database queries are optimized
- Frontend uses efficient data fetching
- Charts and graphs are rendered client-side

---

**Deployment Complete!** Your admin dashboard should now be fully functional at `https://your-domain.com/admin`.

For additional support, refer to the main deployment guide or check the troubleshooting section. 