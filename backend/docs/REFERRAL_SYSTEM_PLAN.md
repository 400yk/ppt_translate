# Referral and Feedback System Implementation Plan

## Overview
Implement a referral system that allows users to recommend Translide to friends and earn extra membership weeks. Also collect user feedback through a popup interface.

## Core Features
- Bottom popup with referral and feedback options
- Referral link generation and tracking
- Extra membership rewards for successful referrals
- Feedback collection and storage
- Database tracking of referral relationships

---

## Phase 0: Configuration Setup

### 0.1 Backend Configuration
- [ ] Add referral system configuration to `backend/config.py`
  - [ ] `REFERRAL_REWARD_DAYS = 3` (reward days for BOTH referrer and referee)
  - [ ] `INVITATION_CODE_REWARD_DAYS = 3` (reward days for invitation codes - current user only)
  - [ ] `REFERRAL_CODE_LENGTH = 8` (length of referral codes)
  - [ ] `REFERRAL_EXPIRY_DAYS = 30` (referral link expiry)
  - [ ] `MAX_REFERRALS_PER_USER = 100` (anti-spam limit)
  - [ ] `REFERRAL_FEATURE_PAID_MEMBERS_ONLY = True` (only paid members can generate referral codes)

---

## Phase 1: Database Schema Changes

### 1.1 Referral System Tables
- [ ] Create `referrals` table
  - [ ] `id` (Primary Key)
  - [ ] `referrer_user_id` (Foreign Key to users)
  - [ ] `referee_email` (Email of referred person)
  - [ ] `referee_user_id` (Foreign Key to users, nullable until registration)
  - [ ] `referral_code` (Unique code for tracking)
  - [ ] `status` (pending, completed, expired)
  - [ ] `reward_claimed` (Boolean)
  - [ ] `created_at`
  - [ ] `completed_at` (When referee registered)
  - [ ] `expires_at`

- [ ] Create `feedback` table
  - [ ] `id` (Primary Key)
  - [ ] `user_id` (Foreign Key to users, nullable for anonymous)
  - [ ] `feedback_text` (Text content)
  - [ ] `rating` (Optional 1-5 star rating)
  - [ ] `user_email` (For anonymous feedback)
  - [ ] `page_context` (Which page feedback was given from)
  - [ ] `created_at`

### 1.2 User Table Updates
- [ ] Add `referral_code` column to users table (unique personal referral code)
- [ ] Add `referred_by_code` column to users table (track who referred them)
- [ ] Add `bonus_membership_days` column to track extra days earned
- [ ] Update existing membership expiry logic to handle different membership sources:
  - [ ] Membership from payment (existing)
  - [ ] Membership from invitation codes
  - [ ] Membership from referral codes

### 1.3 Database Migration
- [ ] Create Alembic migration script for referral tables
- [ ] Create Alembic migration script for user table updates
- [ ] Test migrations on development database

---

## Phase 2: Backend API Development

### 2.1 Referral API Endpoints
- [ ] `POST /api/referrals/generate` - Generate referral link for user
  - [ ] Require authentication
  - [ ] Check if user has active (non-expired) membership
  - [ ] Return 403 error if user is not eligible (guest, unpaid, or expired membership)
  - [ ] Generate unique referral code
  - [ ] Return shareable link pointing to registration page with referral code
  
- [ ] `GET /api/referrals/track/<referral_code>` - Handle referral link clicks
  - [ ] Store referral attempt in database
  - [ ] Redirect to registration page with referral code as URL parameter
  - [ ] Set cookie/session for tracking
  
- [ ] `GET /api/referrals/my-referrals` - Get user's referral history
  - [ ] Return list of referrals and their status
  
- [ ] `POST /api/referrals/claim-reward` - Claim referral reward
  - [ ] Verify referral is completed
  - [ ] Add bonus days to both users (configurable amount)
  - [ ] Mark reward as claimed

### 2.2 Registration Enhancement
- [ ] Update registration endpoint to handle both code types
  - [ ] Distinguish between referral codes and invitation codes in "invitation code" field
  - [ ] For referral codes:
    - [ ] Validate referral code exists and is active
    - [ ] Link referee to referrer in database
    - [ ] Award `REFERRAL_REWARD_DAYS` to BOTH referrer and referee
    - [ ] Set membership expiry date for new user (today + REFERRAL_REWARD_DAYS)
  - [ ] For invitation codes (existing system):
    - [ ] Validate invitation code as before
    - [ ] Award `INVITATION_CODE_REWARD_DAYS` to current user only
    - [ ] Set membership expiry date for new user (today + INVITATION_CODE_REWARD_DAYS)
  - [ ] Add code type detection logic (by format or database lookup)
  
### 2.3 Feedback API Endpoints
- [ ] `POST /api/feedback/submit` - Submit user feedback
  - [ ] Accept both authenticated and anonymous feedback
  - [ ] Store in feedback table
  - [ ] Send notification to admin (optional)
  
- [ ] `GET /api/feedback/admin` - Admin endpoint to view feedback
  - [ ] Require admin authentication
  - [ ] Paginated feedback list

### 2.4 User Service Updates
- [ ] Add referral code generation service
- [ ] Add membership bonus calculation service
- [ ] Update user permission checks to include bonus days
- [ ] Add membership status service:
  - [ ] Check if user has active (non-expired) membership
  - [ ] Membership sources: payment, invitation codes, referral codes
  - [ ] Return eligibility for referral code generation and popup display

---

## Phase 3: Frontend Components

### 3.1 Bottom Popup Component
- [ ] Create `ReferralPopup` component
  - [ ] Slide up animation from bottom
  - [ ] Responsive design for mobile/desktop
  - [ ] Manual dismiss functionality (X button only)
  - [ ] Cookie-based "don't show again" option
  - [ ] Persist visibility regardless of translation result
  - [ ] Show during translation progress (40%+ progress trigger)
  - [ ] **Active membership only** - check membership expiry before showing popup
  
- [ ] Popup content sections:
  - [ ] Main message about referral program
  - [ ] "Share Translide" button
  - [ ] "Feedback" button
  - [ ] Close/dismiss button

### 3.2 Share Functionality
- [ ] Create `ShareModal` component
  - [ ] Generate and display referral link (format: `/register?ref=REFERRAL_CODE`)
  - [ ] Copy to clipboard functionality
  - [ ] Social media share buttons (optional)
  - [ ] Email share option
  - [ ] WhatsApp/messaging app integration

### 3.3 Feedback Modal
- [ ] Create `FeedbackModal` component
  - [ ] Text area for feedback input
  - [ ] Optional star rating system
  - [ ] Email input for anonymous users
  - [ ] Submit and cancel buttons
  - [ ] Success/error message handling

### 3.4 Referral Dashboard
- [ ] Create `ReferralDashboard` component for user profile
  - [ ] Show user's referral code
  - [ ] List of sent referrals and their status
  - [ ] Display earned bonus days
  - [ ] Referral statistics

---

## Phase 4: Integration Points

### 4.1 Translation Page Integration
- [ ] Add popup trigger logic to translation page
  - [ ] Show during translation process (around 40% progress)
  - [ ] Trigger after user clicks translate button and translation is in progress
  - [ ] **Only show to users with active membership** (guests, unpaid, and expired users won't see popup)
  - [ ] Implement smart timing (when user is waiting and has time to engage)
  - [ ] Respect user preferences (don't show again)
  - [ ] Keep popup visible regardless of translation result
  - [ ] Only hide popup when user explicitly closes it (X button)
  
- [ ] Integration with TranslationForm component:
  - [ ] Monitor progress state from `translateFileAsync` function
  - [ ] Trigger popup when progress reaches 40%
  - [ ] Pass translation context to popup (user is actively using the service)
  - [ ] Handle popup state alongside translation progress state

### 4.2 Registration Page Integration
- [ ] Update registration form to handle both code types
- [ ] Pre-fill referral code from URL parameter into "invitation code" input
- [ ] Show appropriate bonus message based on code type:
  - [ ] Referral codes: "You and your friend will both get 3 days free!"
  - [ ] Invitation codes: "You will get 7 days free!" (existing behavior)
- [ ] Validate code and detect type (referral vs invitation)
- [ ] Set membership expiry date when users use any valid code

### 4.3 Profile Page Integration
- [ ] Add referral section to user profile
- [ ] Show current bonus membership days
- [ ] Link to referral dashboard

### 4.4 Authentication Context Updates
- [ ] Update auth context to track referral codes
- [ ] Handle referral code in login/registration flows

---

## Phase 5: Business Logic Implementation

### 5.1 Referral Code Generation & Detection
- [ ] Implement unique referral code generation algorithm
- [ ] Ensure codes are user-friendly (avoid confusing characters)
- [ ] Add validation for code uniqueness
- [ ] Implement code type detection strategy:
  - [ ] Option A: Different prefixes (REF-12345678 vs INV-12345678)
  - [ ] Option B: Database lookup (check referrals table first, then invitation_codes table)
  - [ ] Option C: Different character patterns/lengths

### 5.2 Reward Calculation & Membership Status
- [ ] Implement dual reward system using config values:
  - [ ] Referral codes: Award `REFERRAL_REWARD_DAYS` (3 days) to BOTH users
  - [ ] Invitation codes: Award `INVITATION_CODE_REWARD_DAYS` (7 days) to current user only
- [ ] Add code type detection service (distinguish referral vs invitation codes)
- [ ] Implement dynamic membership status logic:
  - [ ] Check membership expiry date (not expired = active member)
  - [ ] Membership can come from: payment, invitation codes, referral codes
  - [ ] Once membership expires, user loses eligibility for referral features
- [ ] Handle edge cases (user already has premium, extending existing membership, etc.)

### 5.3 Expiration Logic
- [ ] Set referral link expiration (e.g., 30 days)
- [ ] Implement cleanup for expired referrals
- [ ] Notification system for expiring referrals

### 5.4 Anti-Fraud Measures
- [ ] Prevent self-referrals
- [ ] Limit referrals per user per time period
- [ ] Validate email uniqueness for referrals
- [ ] Track IP addresses for suspicious activity

---

## Phase 6: UI/UX Enhancements

### 6.1 Popup Styling
- [ ] Design consistent with app theme
- [ ] Smooth animations and transitions
- [ ] Mobile-first responsive design
- [ ] Accessibility considerations (ARIA labels, keyboard navigation)
- [ ] Non-blocking design (doesn't interfere with translation progress display)
- [ ] Contextual messaging during translation wait time

### 6.2 Share Link Customization
- [ ] Referral URL structure: `https://domain.com/register?ref=REFERRAL_CODE`
- [ ] UTM parameter tracking for analytics
- [ ] Preview image for social media shares
- [ ] Custom messages for different platforms
- [ ] Auto-fill invitation code input on registration page

### 6.3 Feedback Form Enhancements
- [ ] Character limit indicators
- [ ] Emoji reactions (optional)
- [ ] Category selection for feedback type
- [ ] Attachment support (optional)

---

## Phase 7: Testing and Quality Assurance

### 7.1 Backend Testing
- [ ] Unit tests for referral service functions
- [ ] Integration tests for API endpoints
- [ ] Database transaction testing
- [ ] Code type detection testing (referral vs invitation codes)
- [ ] Dual reward system testing (3 days vs 7 days rewards)
- [ ] Active membership eligibility testing (can/cannot generate referral codes)
- [ ] Membership expiry testing (users lose eligibility when membership expires)
- [ ] Membership date calculation testing (proper expiry dates set)
- [ ] Edge case testing (expired codes, invalid referrals, code conflicts, expired memberships)

### 7.2 Frontend Testing
- [ ] Component unit tests
- [ ] Popup interaction testing during translation process
- [ ] Progress-based popup trigger testing (40% threshold)
- [ ] Form validation testing
- [ ] Responsive design testing
- [ ] Popup persistence testing (stays after translation completes/fails)
- [ ] Manual close functionality testing (X button)

### 7.3 End-to-End Testing
- [ ] Complete referral flow testing
- [ ] Feedback submission flow testing
- [ ] Reward allocation testing
- [ ] Cross-browser compatibility testing

---

## Phase 8: Analytics and Monitoring

### 8.1 Tracking Implementation
- [ ] Referral conversion rate tracking
- [ ] Popular sharing channels analysis
- [ ] Feedback sentiment analysis
- [ ] User engagement metrics

### 8.2 Admin Dashboard
- [ ] Referral program statistics
- [ ] Feedback management interface
- [ ] Fraud detection alerts
- [ ] Performance monitoring

---

## Phase 9: Deployment and Launch

### 9.1 Staging Deployment
- [ ] Deploy to staging environment
- [ ] Comprehensive testing with real data
- [ ] Performance testing under load
- [ ] Security testing

### 9.2 Production Deployment
- [ ] Database migration execution
- [ ] Feature flag implementation (gradual rollout)
- [ ] Monitoring setup
- [ ] Rollback plan preparation

### 9.3 Launch Strategy
- [ ] Soft launch to limited users
- [ ] Feedback collection and iteration
- [ ] Full launch announcement
- [ ] Documentation and user guides

---

## Phase 10: Post-Launch Optimization

### 10.1 Performance Monitoring
- [ ] Database query optimization
- [ ] API response time monitoring
- [ ] Frontend performance metrics
- [ ] User engagement tracking

### 10.2 Feature Iteration
- [ ] A/B testing for popup messaging during translation
- [ ] Optimize popup timing (test different progress thresholds)
- [ ] Referral program optimization
- [ ] Feedback analysis and product improvements
- [ ] User experience enhancements

---

## Technical Considerations

### Security
- [ ] Validate all referral codes server-side
- [ ] Sanitize feedback input to prevent XSS
- [ ] Rate limiting for feedback submissions
- [ ] Secure referral link generation

### Performance
- [ ] Optimize database queries for referral lookups
- [ ] Cache frequently accessed referral data
- [ ] Lazy load popup components
- [ ] Minimize popup rendering impact

### Scalability
- [ ] Design for high-volume referral tracking
- [ ] Efficient feedback storage and retrieval
- [ ] Consider eventual consistency for reward allocation
- [ ] Plan for international referral handling

---

## Dependencies and Prerequisites

### Required
- [ ] Existing user authentication system
- [ ] Database migration capabilities
- [ ] Email service for notifications
- [ ] Frontend state management

### Optional
- [ ] Analytics platform integration
- [ ] Social media API access
- [ ] Push notification service
- [ ] Admin dashboard framework

---

## Estimated Timeline

- **Phase 0 (Configuration)**: 1 day
- **Phase 1-2 (Backend)**: 2-3 weeks
- **Phase 3-4 (Frontend)**: 2-3 weeks  
- **Phase 5-6 (Logic & UX)**: 1-2 weeks
- **Phase 7 (Testing)**: 1 week
- **Phase 8-10 (Launch & Optimization)**: 1-2 weeks

**Total Estimated Time**: 7-11 weeks

---

## Success Metrics

- [ ] Referral conversion rate > 10%
- [ ] User engagement with popup > 15%
- [ ] Feedback submission rate > 5%
- [ ] Reduced churn rate through referral program
- [ ] Positive feedback sentiment > 80%

---

## Risk Mitigation

- [ ] Fraud prevention measures
- [ ] Performance impact assessment
- [ ] User privacy compliance
- [ ] Spam prevention for feedback
- [ ] Graceful degradation if services fail 