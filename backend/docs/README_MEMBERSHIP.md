# PowerPoint Translation App: User Types & Translation Limits

This document explains the user types, translation limits, and membership system implemented in the PowerPoint translation application.

## User Types

The application supports three types of users with different translation limits:

1. **Guest Users**: Users who use the app without registration
2. **Free Users**: Registered users without a membership or invitation code
3. **Paid Users**: Users with an active membership or valid invitation code

## Configuration

Translation limits are configurable in `config.py`:

```python
# User translation limits
GUEST_TRANSLATION_LIMIT = 1  # Number of translations allowed for guest users
FREE_USER_TRANSLATION_LIMIT = 1  # Number of translations allowed for free users
FREE_USER_TRANSLATION_PERIOD = 'weekly'  # 'daily', 'weekly', or 'monthly'
PAID_MEMBERSHIP_MONTHS = 3  # Default duration for paid membership in months
```

## Translation Limits

### Guest Users
- Limited to `GUEST_TRANSLATION_LIMIT` translations per 24-hour period
- Tracked by IP address
- Must register to get more translations

### Free Users
- Limited to `FREE_USER_TRANSLATION_LIMIT` translations per `FREE_USER_TRANSLATION_PERIOD`
- Period options: 'daily', 'weekly', or 'monthly'
- Translations reset at the start of each new period

### Paid Users
- Unlimited translations during their membership period
- Membership duration is `PAID_MEMBERSHIP_MONTHS` months by default

## Membership System

### Activation
- Users who register with a valid invitation code automatically get a paid membership
- Membership duration is set to `PAID_MEMBERSHIP_MONTHS` months from activation
- When a membership expires, the user becomes a free user

### Invitation Codes
- Invitation codes have a maximum number of uses
- When a user enters a valid invitation code, they are granted a membership
- The code's usage counter is incremented

## Database Updates

New fields added to the User model:
- `membership_start`: When the membership started
- `membership_end`: When the membership will expire
- `is_paid_user`: Boolean indicating if the user has an active paid membership

## API Endpoints

The following endpoints have been added or modified:

- `/api/membership/status`: Get the current user's membership status and translation limits
- `/api/guest/status`: Get the guest translation status for the current IP address

## Updating the Database

To update an existing database with the new membership fields:

1. Run the database update script:
   ```
   python -m migrate_db.update_db
   ```
   
2. This will:
   - Add the necessary columns to the User table
   - Migrate existing users with invitation codes to have memberships

## Guest Translation Tracking

Guest translations are tracked using a simple file-based system:
- Stored in `guest_translations.json`
- Tracked by IP address
- Entries older than 24 hours are automatically cleaned up 