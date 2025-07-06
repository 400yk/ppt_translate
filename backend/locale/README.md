# Email Translation System

This directory contains translation files specifically for backend email templates.

## Structure

The translation files are organized as follows:

```
backend/locale/
├── en.json       # English translations
├── zh.json       # Simplified Chinese translations
├── zh_hk.json    # Traditional Chinese translations
├── es.json       # Spanish translations
├── fr.json       # French translations
├── de.json       # German translations
├── ja.json       # Japanese translations
├── ko.json       # Korean translations
├── ru.json       # Russian translations
└── README.md     # This file
```

## Translation Structure

Each translation file contains email-specific translations:

```json
{
  "email": {
    "verification": {
      "subject": "Verify your email address - Translide",
      "welcome_title": "Welcome to Translide!",
      "hello": "Hello {username}!",
      "verification_intro": "Thank you for registering...",
      "button_text": "Verify Email Address",
      "button_fallback": "If the button doesn't work...",
      "expires_note": "This link will expire in 24 hours.",
      "ignore_note": "If you didn't create an account...",
      "footer_copyright": "© 2025 Translide. All rights reserved."
    },
    "reset_password": {
      "subject": "Reset your password - Translide",
      "welcome_title": "Password Reset Request",
      "hello": "Hello {username}!",
      "reset_intro": "We received a request to reset...",
      "button_text": "Reset Password",
      "button_fallback": "If the button doesn't work...",
      "expires_note": "This link will expire in 1 hour.",
      "ignore_note": "If you didn't request a password reset...",
      "footer_copyright": "© 2025 Translide. All rights reserved."
    },
    "errors": {
      "email_send_failed": "Failed to send verification email",
      "missing_token": "No verification token provided...",
      "invalid_token": "Invalid verification token...",
      "token_expired": "This verification link has expired...",
      "missing_email": "Email is required",
      "email_already_verified": "Email is already verified",
      "verification_cooldown": "Please wait before requesting...",
      "email_not_verified": "Email verification required"
    }
  }
}
```

## How to Update Translations

### Automated Update (Recommended)

When frontend translations are updated, run the extraction script to sync backend translations:

**Windows:**
```bash
update_email_translations.bat
```

**Unix/Linux:**
```bash
./update_email_translations.sh
```

**Manual:**
```bash
python scripts/extract_email_translations.py
```

### Manual Update

You can also manually edit the translation files in this directory. Make sure to:

1. Keep the same JSON structure
2. Use `{username}` as placeholder for dynamic content
3. Test the translations after updates

## Supported Languages

- `en` - English (default fallback)
- `zh` - Simplified Chinese
- `zh_hk` - Traditional Chinese
- `es` - Spanish
- `fr` - French
- `de` - German
- `ja` - Japanese
- `ko` - Korean
- `ru` - Russian

## Usage in Code

The email service automatically loads these translations:

```python
from services.email_service import email_service

# Send verification email in user's preferred language
email_service.send_verification_email(
    user_email="user@example.com",
    username="John",
    verification_token="token123",
    locale="zh"  # Will use Chinese translations
)
```

## Adding New Languages

To add a new language:

1. Create a new JSON file (e.g., `pt.json` for Portuguese)
2. Copy the structure from `en.json`
3. Translate all the text content
4. Update the `languages` list in `scripts/extract_email_translations.py`
5. Run the extraction script to ensure consistency

## Notes

- These files are automatically generated from frontend translations
- Manual changes may be overwritten when running the extraction script
- Always test email templates after translation updates
- The English (`en.json`) serves as the fallback for missing translations 