# Admin Dashboard Development Plan

## Overview
This plan outlines the development of a comprehensive admin dashboard for the PPT translation application. The dashboard will provide administrators with insights into user activity, translation statistics, referral performance, and system health.

## Current State Analysis
- Basic admin authentication exists (user.id == 1 check)
- Some admin endpoints already implemented (invitation codes, feedback)
- Database models are well-structured for analytics
- Frontend uses Next.js with TypeScript and Tailwind CSS

## Development Tasks

### Phase 1: Backend Infrastructure

#### Authentication & Authorization
- [ ] **Create proper admin role system**
  - [ ] Add `is_admin` boolean field to User model
  - [ ] Create admin role migration
  - [ ] Update existing admin checks to use new field
  - [ ] Add admin middleware for route protection

- [ ] **Enhance admin authentication**
  - [ ] Create admin-specific login endpoint
  - [ ] Add admin session management
  - [ ] Implement admin logout functionality
  - [ ] Add admin token refresh mechanism

#### Analytics API Endpoints
- [ ] **User Analytics**
  - [ ] Create `/api/admin/analytics/users` endpoint
    - [ ] Total users count
    - [ ] New users today, this week, this month
    - [ ] Users by membership status (free/paid)
    - [ ] Users by email verification status
    - [ ] Users by registration source (invitation/referral/google)
  - [ ] Create `/api/admin/analytics/users/detailed` endpoint
    - [ ] User growth over time (daily/weekly/monthly)
    - [ ] User retention metrics
    - [ ] Geographic distribution (if IP tracking available)

- [ ] **Translation Analytics**
  - [ ] Create `/api/admin/analytics/translations` endpoint
    - [ ] Total translations performed
    - [ ] Successful vs failed translations count
    - [ ] Success rate percentage
    - [ ] Translations today, this week, this month
    - [ ] Translations by language pair
    - [ ] Character usage statistics
    - [ ] Guest vs authenticated user translations
    - [ ] Average processing time
  - [ ] Create `/api/admin/analytics/translations/detailed` endpoint
    - [ ] Translation volume over time
    - [ ] Success/failure trends over time
    - [ ] Peak usage hours/days
    - [ ] Average file size/character count
    - [ ] Error type distribution
    - [ ] Processing time analysis

- [ ] **Referral Analytics**
  - [ ] Create `/api/admin/analytics/referrals` endpoint
    - [ ] Total referrals created
    - [ ] Successful referrals (completed registrations)
    - [ ] Referral conversion rate
    - [ ] Top referrers by success count
    - [ ] Referral rewards claimed
  - [ ] Create `/api/admin/analytics/referrals/detailed` endpoint
    - [ ] Referral performance over time
    - [ ] Referral code usage patterns

- [ ] **Membership Analytics**
  - [ ] Create `/api/admin/analytics/memberships` endpoint
    - [ ] Active paid memberships count
    - [ ] Membership revenue (if payment tracking)
    - [ ] Membership source breakdown
    - [ ] Expiring memberships (next 30 days)
  - [ ] Create `/api/admin/analytics/memberships/detailed` endpoint
    - [ ] Membership growth trends
    - [ ] Churn rate analysis

- [ ] **System Health Analytics**
  - [ ] Create `/api/admin/analytics/system` endpoint
    - [ ] API response times
    - [ ] Error rates
    - [ ] Database performance metrics
    - [ ] Translation service status

#### Translation Logging & Error Tracking
- [ ] **Translation Status Tracking**
  - [ ] Add `status` field to TranslationRecord model (success/failed/processing)
  - [ ] Add `error_message` field to TranslationRecord model
  - [ ] Add `processing_time` field to TranslationRecord model
  - [ ] Add `started_at` and `completed_at` timestamps
  - [ ] Create migration for new translation tracking fields

- [ ] **Translation Log Management**
  - [ ] Create `/api/admin/translations/logs` endpoint for viewing translation logs
  - [ ] Create `/api/admin/translations/logs/<translation_id>` endpoint for detailed logs
  - [ ] Add log filtering by status, date range, user, language pair
  - [ ] Implement log pagination and search
  - [ ] Add log export functionality (CSV/JSON)

- [ ] **Error Analysis & Monitoring**
  - [ ] Create `/api/admin/translations/errors` endpoint for error summary
  - [ ] Add error categorization (API failure, file format, timeout, etc.)
  - [ ] Implement error trend analysis
  - [ ] Add error alert system for high failure rates

#### Data Export & Management
- [ ] **Data Export Endpoints**
  - [ ] Create `/api/admin/export/users` endpoint
  - [ ] Create `/api/admin/export/translations` endpoint
  - [ ] Create `/api/admin/export/translation-logs` endpoint
  - [ ] Create `/api/admin/export/referrals` endpoint
  - [ ] Add CSV/JSON export options

- [ ] **Bulk Operations**
  - [ ] Create `/api/admin/users/bulk` endpoint for bulk user operations
  - [ ] Create `/api/admin/invitation-codes/bulk` endpoint
  - [ ] Add user suspension/activation functionality
  - [ ] Add bulk translation retry functionality

### Phase 2: Frontend Development

#### Admin Authentication
- [x] **Admin Login Page**
  - [x] Create `/admin/login` page
  - [x] Implement admin-specific login form
  - [x] Add admin authentication context
  - [x] Create admin route protection middleware

- [x] **Admin Layout**
  - [x] Create admin layout component
  - [x] Add admin navigation sidebar
  - [x] Implement admin breadcrumbs
  - [x] Add admin logout functionality

#### Dashboard Components
- [x] **Main Dashboard Page**
  - [x] Create `/admin` main dashboard page
  - [x] Implement real-time statistics cards
  - [x] Add charts and graphs for key metrics
  - [x] Create responsive dashboard layout

- [x] **Statistics Cards**
  - [x] Create reusable stat card component
  - [x] Add trend indicators (up/down arrows)
  - [x] Add success/failure indicators for translations
  - [x] Implement loading states
  - [x] Add click-to-drill-down functionality
  - [x] Add color-coded status indicators (green for success, red for failures)

- [x] **Charts and Visualizations**
  - [x] Integrate chart library (Chart.js or Recharts)
  - [x] Create user growth chart
  - [x] Create translation volume chart with success/failure breakdown
  - [x] Create translation success rate trend chart
  - [x] Create error type distribution pie chart
  - [x] Create referral performance chart
  - [x] Add interactive chart features
  - [x] Add drill-down capabilities for error analysis

#### Data Tables
- [x] **User Management Table**
  - [x] Create `/admin/users` page
  - [x] Implement paginated user table
  - [x] Add user search and filtering
  - [x] Add user action buttons (suspend, activate, edit)
  - [x] Add detailed membership type distinction (Stripe vs Invitation vs Referral vs Bonus)
  - [x] Add sorting functionality (by translations, characters, join date, last login, etc.)
  - [ ] Add bulk operations

- [x] **Translation History Table**
  - [x] Create `/admin/translations` page
  - [x] Implement translation history table with status indicators
  - [x] Add success/failure status badges (green/red)
  - [x] Add translation search and filtering by status, user, date
  - [x] Add translation details modal with full error logs
  - [ ] Add retry failed translation functionality
  - [ ] Add bulk retry operations for failed translations

- [x] **Referral Management Table**
  - [x] Create `/admin/referrals` page
  - [x] Implement referral tracking table
  - [x] Add referral status management
  - [x] Add referral analytics view

#### Settings & Configuration
- [x] **Admin Settings Page**
  - [x] Create `/admin/settings` page
  - [x] Add system configuration options
  - [x] Add invitation code management
  - [x] Add referral system settings
  - [x] Add translation error alert thresholds
  - [x] Add log retention settings
  - [x] Add translation retry configuration


### Phase 3: Testing & Documentation

#### Testing
- [ ] **Backend Testing**
  - [ ] Write unit tests for admin endpoints
  - [ ] Add integration tests for admin workflows
  - [ ] Create admin API documentation
  - [ ] Add performance tests
  - [ ] Test translation error logging and retrieval
  - [ ] Test translation retry functionality

- [ ] **Frontend Testing**
  - [ ] Write component tests for admin UI
  - [ ] Add end-to-end tests for admin flows
  - [ ] Test admin authentication flows
  - [ ] Add accessibility testing
  - [ ] Test translation log viewing and filtering
  - [ ] Test error modal and retry functionality


## Technical Requirements

### Backend Requirements
- Flask-SQLAlchemy for database operations
- JWT for admin authentication
- Celery for background tasks (reports, exports)
- Redis for caching and session management
- PostgreSQL for data storage

### Frontend Requirements
- Next.js 14 with TypeScript
- Tailwind CSS for styling
- Chart.js or Recharts for visualizations
- React Query for data fetching
- Zustand or Redux for state management

### Security Requirements
- Admin role-based access control
- Secure admin authentication
- Audit logging for all admin actions
- Data encryption for sensitive information
- Rate limiting for admin endpoints

## Notes
- Start with basic analytics and user management
- Focus on essential admin functions first
- Implement security measures from the beginning
- Use existing admin patterns in the codebase
- Consider using existing UI components where possible 