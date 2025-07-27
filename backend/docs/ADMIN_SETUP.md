# Admin Dashboard Setup Guide

This guide will help you set up and test the admin dashboard functionality.

## Prerequisites

- Python 3.8+
- PostgreSQL database
- Redis (for Celery)
- All existing dependencies from `requirements.txt`

## Step 1: Database Migration

First, run the database migration to add the new admin and translation tracking fields:

```bash
cd backend
flask db upgrade
```

This will:
- Add `is_admin` field to the `user` table
- Add translation status tracking fields to `translation_record` table
- Create necessary indexes for performance

## Step 2: Set Up Admin User

Run the admin user setup script:

```bash
cd backend
python scripts/setup_admin.py
```

This will create an admin user with the credentials you specify. The default credentials are:
- Username: `admin`
- Email: `admin@example.com`
- Password: `admin123`

## Step 3: Test Admin API Endpoints

Run the test script to verify the admin API endpoints are working:

```bash
cd backend
python test_admin_api.py
```

This will test:
- User analytics endpoint
- Translation analytics endpoint
- Referral analytics endpoint
- Translation logs endpoint

## Step 4: Start the Backend Server

Start the Flask development server:

```bash
cd backend
python app.py
```

The server will run on `http://localhost:5000` by default.

## Admin API Endpoints

### Authentication
All admin endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Available Endpoints

#### User Analytics
- **GET** `/api/admin/analytics/users`
- Returns user statistics including total users, new users, membership status, etc.

#### Translation Analytics
- **GET** `/api/admin/analytics/translations`
- Returns translation statistics including success/failure rates, processing times, etc.

#### Referral Analytics
- **GET** `/api/admin/analytics/referrals`
- Returns referral statistics including conversion rates, top referrers, etc.

#### Translation Logs
- **GET** `/api/admin/translations/logs`
- Returns paginated translation logs with filtering options
- Query parameters:
  - `page`: Page number (default: 1)
  - `per_page`: Items per page (default: 20, max: 100)
  - `status`: Filter by status (processing/success/failed)
  - `user_id`: Filter by user ID
  - `start_date`: Filter by start date
  - `end_date`: Filter by end date
  - `search`: Search in filename

#### Translation Log Detail
- **GET** `/api/admin/translations/logs/<translation_id>`
- Returns detailed information for a specific translation

## Translation Status Tracking

The system now tracks translation status with the following fields:

- `status`: One of 'processing', 'success', 'failed'
- `error_message`: Detailed error message for failed translations
- `processing_time`: Time taken to process the translation (in seconds)
- `started_at`: When the translation started
- `completed_at`: When the translation completed

## Admin Role System

The admin role system includes:

- `is_admin` boolean field in the User model
- `is_administrator()` method that checks admin privileges
- Backward compatibility with the existing `user.id == 1` check
- Admin middleware for route protection

## Next Steps

After setting up the backend:

1. **Frontend Development**: Start building the admin dashboard UI
2. **Additional Features**: Implement more advanced analytics and management features
3. **Testing**: Add comprehensive tests for all admin functionality
4. **Security**: Implement additional security measures like audit logging

## Troubleshooting

### Common Issues

1. **Migration fails**: Make sure your database is up to date with existing migrations
2. **Admin user not found**: Run the setup script again or check database connectivity
3. **Permission denied**: Ensure the user has the `is_admin` flag set to `true`
4. **Translation tracking not working**: Check that the Celery workers are running

### Debug Mode

To enable debug mode for more detailed error messages:

```bash
export FLASK_ENV=development
export FLASK_DEBUG=1
python app.py
```

## API Response Examples

### User Analytics Response
```json
{
  "total_users": 150,
  "new_users": {
    "today": 5,
    "this_week": 25,
    "this_month": 100
  },
  "membership_status": {
    "paid": 50,
    "free": 100
  },
  "email_verification": {
    "verified": 120,
    "unverified": 30
  },
  "registration_source": {
    "invitation": 20,
    "referral": 15,
    "google": 25,
    "regular": 90
  }
}
```

### Translation Analytics Response
```json
{
  "total_translations": 500,
  "status_breakdown": {
    "successful": 480,
    "failed": 15,
    "processing": 5
  },
  "success_rate": 96.0,
  "translations_by_period": {
    "today": 25,
    "this_week": 150,
    "this_month": 500
  },
  "performance": {
    "average_processing_time": 45.2
  }
}
```

## Security Notes

- Admin endpoints are protected by JWT authentication
- Only users with `is_admin=True` can access admin endpoints
- All admin actions should be logged for audit purposes
- Consider implementing rate limiting for admin endpoints
- Sensitive error messages are sanitized before being stored 