# Password Reset and Change Implementation Plan

## Overview
This plan outlines the implementation of password reset functionality (forget password) and password change functionality for the PPT Translate application.

## Features to Implement

### 1. Password Reset (Forget Password)
- Users can request password reset via email
- Email contains secure reset link with token
- Users can set new password using the reset link
- Reset tokens expire after a certain time

### 2. Password Change (In Profile)
- Users can change their password from profile page
- Requires current password for security
- Only available for email-based accounts (not Google OAuth)

## Implementation Steps

### Backend Implementation

#### Database Schema Changes
- [ ] Add password reset token table or fields to existing user table
  - [ ] `reset_token` (string, nullable)
  - [ ] `reset_token_expires` (datetime, nullable)
  - [ ] Create database migration for these fields

#### API Endpoints
- [ ] Create `POST /api/auth/forgot-password` endpoint
  - [ ] Validate email format
  - [ ] Check if user exists with this email
  - [ ] Generate secure reset token
  - [ ] Save token and expiry to database
  - [ ] Send password reset email
  - [ ] Return success response (don't reveal if email exists)

- [ ] Create `POST /api/auth/reset-password` endpoint
  - [ ] Validate reset token
  - [ ] Check token expiry
  - [ ] Validate new password requirements
  - [ ] Hash new password
  - [ ] Update user password
  - [ ] Clear reset token from database
  - [ ] Return success response

- [ ] Create `POST /api/auth/change-password` endpoint
  - [ ] Require authentication
  - [ ] Validate current password
  - [ ] Validate new password requirements
  - [ ] Check user is not Google OAuth user
  - [ ] Hash new password
  - [ ] Update user password
  - [ ] Return success response

#### Email Service Updates
- [ ] Create password reset email template
  - [ ] Add HTML template for reset email
  - [ ] Include reset link with token
  - [ ] Add email subject and content
  - [ ] Support multiple languages

- [ ] Update email service to send reset emails
  - [ ] Add `send_password_reset_email` function
  - [ ] Generate secure reset URL
  - [ ] Handle email sending errors

#### Security Enhancements
- [ ] Generate cryptographically secure reset tokens
- [ ] Set appropriate token expiry time (e.g., 1 hour)
- [ ] Rate limiting for password reset requests
- [ ] Clear reset tokens after use
- [ ] Validate password strength requirements

### Frontend Implementation

#### Login Form Updates
- [ ] Add "Forgot Password?" link to LoginForm component
- [ ] Create ForgotPasswordModal component
  - [ ] Email input field
  - [ ] Submit button
  - [ ] Loading state
  - [ ] Success/error messages
  - [ ] Form validation

- [ ] Integrate ForgotPasswordModal with LoginForm
  - [ ] Add modal trigger
  - [ ] Handle modal open/close
  - [ ] Handle form submission
  - [ ] Show success message after submission

#### Password Reset Page
- [ ] Create password reset page (`/reset-password`)
  - [ ] Extract token from URL parameters
  - [ ] Validate token on page load
  - [ ] Show password input form
  - [ ] Handle form submission
  - [ ] Show success/error messages
  - [ ] Redirect to login after success

- [ ] Add password reset form component
  - [ ] New password input field
  - [ ] Form validation
  - [ ] Submit button
  - [ ] Loading state
  - [ ] Password strength indicator (optional)

#### Profile Page Updates
- [ ] Add password change section to profile page
  - [ ] Only show for email-based accounts
  - [ ] Add "Change Password" button with icon
  - [ ] Create ChangePasswordModal component

- [ ] Create ChangePasswordModal component
  - [ ] Current password input field
  - [ ] New password input field
  - [ ] Form validation
  - [ ] Submit button
  - [ ] Loading state
  - [ ] Success/error messages

- [ ] Integrate ChangePasswordModal with profile page
  - [ ] Add modal trigger
  - [ ] Handle modal open/close
  - [ ] Handle form submission
  - [ ] Show success message after password change

### API Client Updates
- [ ] Add password reset API functions to api-client.ts
  - [ ] `requestPasswordReset(email: string)`
  - [ ] `resetPassword(token: string, newPassword: string)`
  - [ ] `changePassword(currentPassword: string, newPassword: string)`

### Translation Updates
- [ ] Add translation keys for password reset functionality
  - [ ] Forgot password link text
  - [ ] Reset email form labels and messages
  - [ ] Reset password form labels and messages
  - [ ] Success/error messages
  - [ ] Email templates

- [ ] Add translation keys for password change functionality
  - [ ] Change password button text
  - [ ] Change password form labels
  - [ ] Success/error messages
  - [ ] Validation messages

### Testing
- [ ] Write unit tests for backend endpoints
  - [ ] Test password reset request
  - [ ] Test password reset confirmation
  - [ ] Test password change
  - [ ] Test error scenarios
  - [ ] Test token expiry

- [ ] Write frontend component tests
  - [ ] Test ForgotPasswordModal component
  - [ ] Test password reset page
  - [ ] Test ChangePasswordModal component
  - [ ] Test integration with profile page

- [ ] Manual testing
  - [ ] Test complete password reset flow
  - [ ] Test password change flow
  - [ ] Test error handling
  - [ ] Test email delivery
  - [ ] Test token expiry

### Security Considerations
- [ ] Implement rate limiting for password reset requests
- [ ] Use HTTPS for all password-related operations
- [ ] Implement proper password hashing (bcrypt)
- [ ] Validate password strength requirements
- [ ] Clear sensitive data from memory after use
- [ ] Log security events for monitoring

### Documentation
- [ ] Update API documentation
- [ ] Update user guide
- [ ] Document security considerations
- [ ] Document email template customization

## Technical Notes

### Token Generation
- Use cryptographically secure random token generation
- Tokens should be long enough to prevent brute force attacks
- Consider using JWT tokens with expiry for added security

### Email Templates
- Create responsive HTML email templates
- Include clear instructions and branding
- Support multiple languages
- Include security warning about not sharing reset links

### Database Considerations
- Consider adding indexes for reset token lookups
- Clean up expired tokens periodically
- Consider using Redis for temporary token storage

### Error Handling
- Don't reveal whether email exists in forgot password flow
- Provide clear error messages for validation failures
- Log security events for monitoring

## Implementation Priority
1. Backend database schema and API endpoints
2. Email service integration
3. Frontend password reset flow
4. Frontend password change flow
5. Testing and security review
6. Documentation and deployment

## Dependencies
- Email service must be properly configured
- SMTP settings must be available
- SSL/TLS certificates for secure email delivery
- Rate limiting middleware (if not already implemented) 