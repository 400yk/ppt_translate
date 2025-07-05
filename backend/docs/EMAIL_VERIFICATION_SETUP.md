# Email Verification System Setup Guide

## Overview
This guide explains how to implement email verification for the Translide application. The system supports both **Flask-Mail** (free, built-in) and **third-party email services** (SendGrid, AWS SES, Mailgun) for production use.

## 🔧 Configuration Options

### Option 1: Flask-Mail (Free, Development)
Perfect for development and small-scale production.

**Environment Variables:**
```bash
# Email service configuration
EMAIL_SERVICE=flask_mail

# Gmail SMTP (recommended for development)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USE_SSL=False
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=your-email@gmail.com

# Email verification settings
REQUIRE_EMAIL_VERIFICATION=True
SKIP_EMAIL_VERIFICATION_FOR_GOOGLE_AUTH=True
```

**Gmail Setup:**
1. Enable 2-Factor Authentication in Gmail
2. Generate an App Password: Google Account → Security → App Passwords
3. Use the app password as `MAIL_PASSWORD`

---

### Option 2: SendGrid (Recommended for Production)
Excellent deliverability, easy setup, $15-50/month.

**Environment Variables:**
```bash
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
MAIL_DEFAULT_SENDER=noreply@yourdomain.com
REQUIRE_EMAIL_VERIFICATION=True
```

**Setup Steps:**
1. Sign up at [SendGrid](https://sendgrid.com)
2. Create API Key with "Mail Send" permissions
3. Verify your domain/sender email
4. Set the API key in environment variables

---

### Option 3: AWS SES (Scalable, Enterprise)
Best for high-volume applications, AWS ecosystem.

**Environment Variables:**
```bash
EMAIL_SERVICE=ses
AWS_SES_REGION=us-east-1
MAIL_DEFAULT_SENDER=noreply@yourdomain.com
REQUIRE_EMAIL_VERIFICATION=True

# AWS credentials (via IAM or environment)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

**Setup Steps:**
1. Configure AWS SES in your region
2. Verify your domain and sender email
3. Request production access (remove sandbox)
4. Configure IAM user with SES permissions

---

### Option 4: Mailgun (Developer-Friendly)
Good balance of features and ease of use.

**Environment Variables:**
```bash
EMAIL_SERVICE=mailgun
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=yourdomain.com
MAIL_DEFAULT_SENDER=noreply@yourdomain.com
REQUIRE_EMAIL_VERIFICATION=True
```

---

### Option 5: Resend (Modern, Developer-Focused)
Modern email API with excellent developer experience and deliverability.

**Environment Variables:**
```bash
EMAIL_SERVICE=resend
RESEND_API_KEY=your-resend-api-key
MAIL_DEFAULT_SENDER=noreply@yourdomain.com
REQUIRE_EMAIL_VERIFICATION=True
```

**Setup Steps:**
1. Sign up at [Resend](https://resend.com)
2. Add and verify your domain
3. Create an API key with sending permissions
4. Set the API key in environment variables

**Features:**
- ✅ Great deliverability rates
- ✅ Modern developer-friendly API
- ✅ Generous free tier (3,000 emails/month)
- ✅ Real-time webhooks and analytics
- ✅ Built-in spam protection

---

## 🚀 Implementation Steps

### 1. Database Migration
Run the migration to add email verification fields:

```bash
cd backend
flask db upgrade
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Add the appropriate environment variables for your chosen email service.

### 4. Test Email Configuration
```python
# Test script
from services.email_service import email_service

# Check configuration
status = email_service.test_email_configuration()
print(status)

# Send test email
success = email_service.send_verification_email(
    user_email="test@example.com",
    username="TestUser",
    verification_token="test-token-123"
)
print(f"Email sent: {success}")
```

---

## 📧 How Email Verification Works

### Registration Process
1. **User registers** → Account created with `is_email_verified=False`
2. **Verification email sent** → User receives email with verification link
3. **User clicks link** → Email verified, `is_email_verified=True`
4. **Access granted** → User can log in and use the app

### Email Templates
Professional HTML emails are automatically generated with:
- ✅ Company branding (Translide)
- ✅ Responsive design (mobile-friendly)
- ✅ Secure verification links
- ✅ 24-hour expiration
- ✅ Plain text fallback

### API Endpoints
- `POST /api/register` - Registration with email verification
- `GET /api/verify-email?token=...` - Verify email address
- `POST /api/resend-verification` - Resend verification email
- `POST /api/login` - Login (checks email verification)

---

## 🔒 Security Features

### Anti-Spam Protection
- **Cooldown period**: 5 minutes between verification emails
- **Token expiration**: 24-hour expiry for verification links
- **Unique tokens**: Cryptographically secure tokens

### Google OAuth Integration
- **Skip verification**: Google OAuth users automatically verified
- **Trusted emails**: Google-verified emails trusted by default

### Referral System Integration
- **Email verification required**: Referrals require verified emails
- **Protection against fake referrals**: Prevents spam referrals

---

## 🎨 Frontend Integration

The frontend should handle these scenarios:

### Registration Response
```json
{
  "message": "User registered successfully",
  "email_verification_required": true,
  "access_token": null  // No token until verified
}
```

### Login Response (Unverified Email)
```json
{
  "error": "Email verification required",
  "errorKey": "errors.email_not_verified",
  "email_verification_required": true
}
```

### Verification Success
```json
{
  "success": true,
  "message": "Email verified successfully",
  "access_token": "jwt-token-here"
}
```

---

## 🛠️ Development vs Production

### Development Setup (Flask-Mail)
```bash
# Quick setup for development
EMAIL_SERVICE=flask_mail
REQUIRE_EMAIL_VERIFICATION=False  # Optional: disable for dev
MAIL_USERNAME=your-dev-email@gmail.com
MAIL_PASSWORD=your-app-password
```

### Production Setup (SendGrid)
```bash
# Recommended for production
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-production-api-key
REQUIRE_EMAIL_VERIFICATION=True
MAIL_DEFAULT_SENDER=noreply@translide.com
```

### Production Setup (Resend) - Alternative
```bash
# Modern alternative for production
EMAIL_SERVICE=resend
RESEND_API_KEY=your-production-api-key
REQUIRE_EMAIL_VERIFICATION=True
MAIL_DEFAULT_SENDER=noreply@translide.com
```

---

## 🔍 Troubleshooting

### Common Issues

**1. Gmail "Less secure app access" error**
- ✅ **Solution**: Use App Passwords (not account password)
- ✅ Enable 2FA first, then generate App Password

**2. SendGrid emails go to spam**
- ✅ **Solution**: Set up SPF/DKIM records for your domain
- ✅ Use verified sender address

**3. AWS SES sandbox mode**
- ✅ **Solution**: Request production access in AWS console
- ✅ Verify recipient emails in sandbox mode

**4. Email not sending**
- ✅ **Check**: Environment variables are set correctly
- ✅ **Check**: Service credentials are valid
- ✅ **Test**: Use `email_service.test_email_configuration()`

### Testing Email Configuration
```python
# Backend testing
from services.email_service import email_service

# Test configuration
config_status = email_service.test_email_configuration()
if config_status['configured']:
    print("✅ Email service configured correctly")
else:
    print(f"❌ Configuration error: {config_status['error']}")
```

---

## 📊 Monitoring & Analytics

### Email Metrics (SendGrid)
- Delivery rates
- Open rates
- Click rates
- Bounce rates

### Application Metrics
- Registration completion rates
- Email verification rates
- Time to verification

---

## 🚨 Important Notes

### Existing Users
- **Automatic verification**: Existing users marked as verified during migration
- **Google OAuth users**: Automatically verified
- **Backward compatibility**: No disruption to existing accounts

### GDPR Compliance
- **Email storage**: Only store emails with user consent
- **Data retention**: Implement email cleanup policies
- **Opt-out**: Provide unsubscribe mechanisms

### Rate Limiting
- **Built-in cooldown**: 5-minute cooldown between verification emails
- **Additional protection**: Consider implementing IP-based rate limiting

---

## 💡 Best Practices

1. **Use professional email addresses**: `noreply@yourdomain.com`
2. **Set up domain authentication**: SPF, DKIM, DMARC records
3. **Monitor deliverability**: Track bounce rates and spam reports
4. **Provide clear instructions**: Help users find verification emails
5. **Handle edge cases**: Expired tokens, multiple attempts
6. **Test thoroughly**: Test with different email providers
7. **Have fallback plans**: Support manual verification if needed

---

## 📞 Support

For production deployments:
- **SendGrid**: Excellent support, extensive documentation
- **Resend**: Modern support, great developer experience and documentation
- **AWS SES**: AWS Support plans available
- **Mailgun**: Good developer support
- **Flask-Mail**: Community support, documentation

---

## 🎯 Next Steps

After implementing email verification:

1. **Test with real email addresses**
2. **Monitor email deliverability**
3. **Implement frontend verification flow**
4. **Add password reset functionality** (uses same email service)
5. **Consider additional security features** (2FA, login notifications)

The email verification system is now production-ready and scalable! 🚀 

## 📊 Email Service Comparison

| Service | Best For | Free Tier | Pricing | Pros | Cons |
|---------|----------|-----------|---------|------|------|
| **Flask-Mail** | Development | ✅ Free | Free | No setup, works immediately | Poor deliverability, Gmail limits |
| **Resend** | Modern apps | 3,000/month | $20/month | Great DX, modern API, good deliverability | Newer service |
| **SendGrid** | Production | 100/day | $15+/month | Proven reliability, extensive features | Complex setup |
| **AWS SES** | Enterprise | 62,000/month | $0.10/1000 | Very cheap at scale, AWS ecosystem | Complex setup, sandbox mode |
| **Mailgun** | Developers | 5,000/month | $15+/month | Good balance, reliable | Limited free tier |

**Recommendations:**
- 🔧 **Development**: Flask-Mail (quick setup)
- 🚀 **Modern Production**: Resend (best developer experience)
- 🏢 **Established Production**: SendGrid (proven reliability)
- 📈 **High Volume**: AWS SES (cost-effective at scale)

--- 