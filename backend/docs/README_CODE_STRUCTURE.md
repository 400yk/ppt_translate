# PowerPoint Translation App: Code Structure

This document explains the overall code structure of the backend for the PowerPoint translation application.

## Code Organization

The backend code is organized into several modules to maintain separation of concerns:

### Core Modules

- **translate.py**: Contains the PowerPoint translation logic and API endpoints
- **user_manager.py**: Handles user permissions, limits, and membership status
- **models.py**: Database models for users, translations, and invitation codes
- **config.py**: Configuration settings for the application
- **guest_tracker.py**: Manages guest user translation tracking

### Supporting Modules

- **api_client.py**: Interface to the Gemini translation API
- **pptx_utils.py**: Utilities for working with PowerPoint files

### Migration and Update Utilities

- **migrate_db/**: Directory containing all database migration utilities
  - **add_membership_fields.py**: Adds membership fields to the database
  - **add_stripe_customer_id.py**: Adds Stripe customer ID field to User model
  - **db_migrate.py**: Basic database migration utilities
  - **update_db.py**: Checks and updates the database schema
  - **update_invitation_code_schema.py**: Updates invitation code table schema

## Translation Workflow

1. User uploads a PowerPoint file to `/translate` or `/guest-translate` endpoint
2. The application checks user permissions through `user_manager.py`
3. If allowed, the presentation is translated using the `translate_pptx` function
4. The translation is recorded and the translated file is returned to the user

## User Types and Permissions

The application supports three types of users:

1. **Guest Users**: Limited translations per IP address
2. **Free Users**: Limited translations per time period (day/week/month)
3. **Paid Users**: Unlimited translations during their membership period

User permission checks are handled by the `user_manager.py` module:

- `check_user_permission()`: Verifies registered user permissions
- `check_guest_permission()`: Checks and tracks guest user limits

## API Endpoints

### Translation Endpoints

- `POST /translate`: Registered user translation endpoint
- `POST /guest-translate`: Guest user translation endpoint

### User Status Endpoints

- `GET /api/membership/status`: Get current user's membership status
- `GET /api/guest/status`: Get guest translation status for current IP
- `GET /api/translations/history`: Get user's translation history

## Configuration

All limits and settings are configurable in `config.py`:

- `GUEST_TRANSLATION_LIMIT`: Number of translations allowed for guest users
- `FREE_USER_TRANSLATION_LIMIT`: Number of translations allowed for free users
- `FREE_USER_TRANSLATION_PERIOD`: Period type for free user limits ('daily', 'weekly', 'monthly')
- `PAID_MEMBERSHIP_MONTHS`: Default duration for paid membership in months

## Modular Design Benefits

The new modular design provides several benefits:

1. **Separation of Concerns**: Translation logic is separated from user management
2. **Improved Maintainability**: Easier to locate and fix issues
3. **Code Reusability**: User permission logic can be reused in other parts of the application
4. **Testability**: Modules can be tested in isolation
5. **Scalability**: Easier to extend and add new features

## Database Structure

The application uses SQLAlchemy with the following models:

- **User**: Stores user information and membership details
- **InvitationCode**: Manages invitation codes for paid memberships
- **TranslationRecord**: Tracks translation history for each user 