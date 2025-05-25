"""
Configuration values for PowerPoint translation.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Patch Heroku's DATABASE_URL to be compatible with SQLAlchemy
if 'DATABASE_URL' in os.environ:
    os.environ['DATABASE_URL'] = os.environ['DATABASE_URL'].replace('postgres://', 'postgresql://', 1)

# Load environment variables with priority
# 1. .env.local (highest priority, for secrets and local overrides)
# 2. .env (shared development settings)
env_local_path = os.path.join(os.path.dirname(__file__), '.env.local')
env_path = os.path.join(os.path.dirname(__file__), '.env')

# First load the shared .env file
if os.path.exists(env_path):
    load_dotenv(env_path)

# Then load .env.local to override if needed
if os.path.exists(env_local_path):
    load_dotenv(env_local_path, override=True)

# Database settings
basedir = os.path.abspath(os.path.dirname(__file__))

# Default SQLite connection (for development/fallback)
SQLITE_URI = 'sqlite:///' + os.path.join(basedir, 'db', 'app.db')

# PostgreSQL connection string
# Format: postgresql://username:password@hostname:port/database_name
POSTGRES_USER = os.getenv('POSTGRES_USER', 'postgres')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'postgres')
POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'localhost')
POSTGRES_PORT = os.getenv('POSTGRES_PORT', '5432')
POSTGRES_DB = os.getenv('POSTGRES_DB', 'ppt_translate')

# Build PostgreSQL URI
POSTGRES_URI = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Use PostgreSQL by default, fall back to SQLite if DATABASE_URL is explicitly set to sqlite
SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', POSTGRES_URI)
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Redis env
REDIS_URL = os.getenv('REDIS_URL', '')

# Celery env
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL


# Secret key for session management
SECRET_KEY = os.getenv('SECRET_KEY', os.urandom(24).hex())
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', os.urandom(24).hex())
JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours

# Default font settings
DEFAULT_FONT_NAME = "Arial"
DEFAULT_FONT_SIZE = 18
DEFAULT_TITLE_FONT_SIZE = 24

# API settings
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
GEMINI_API_CHARACTER_BATCH_SIZE = 20000  # Maximum characters per batch
GEMINI_API_BATCH_SIZE = 100  # Keeping for backward compatibility

# Font settings for text measurement
MIN_FONT_SIZE = 8 

# User translation limits
GUEST_TRANSLATION_LIMIT = 1  # Number of translations allowed for guest users
FREE_USER_TRANSLATION_LIMIT = 1  # Number of translations allowed for free users
FREE_USER_TRANSLATION_PERIOD = 'weekly'  # 'daily', 'weekly', or 'monthly'
FREE_USER_CHARACTER_PER_FILE_LIMIT = 50000  # Number of characters allowed for free users
FREE_USER_CHARACTER_MONTHLY_LIMIT = 200000  # Number of characters allowed for free users
INVITATION_MEMBERSHIP_MONTHS = 3  # Default duration for invitation-based membership in months
PAID_MEMBERSHIP_MONTHLY = 1  # Duration for monthly paid membership
PAID_MEMBERSHIP_YEARLY = 12  # Duration for yearly paid membership
PAID_USER_CHARACTER_MONTHLY_LIMIT = 5000000  # Number of characters allowed for paid users
GUEST_USER_MAX_FILE_SIZE = 50  # 50MB
GUEST_USER_CHARACTER_MONTHLY_LIMIT = 100000  # Number of characters allowed for guest users

# Stripe payment settings
FLASK_API_URL = os.getenv('FLASK_API_URL', 'http://localhost:9002')
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')  # No default value to avoid committed secrets
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')  # No default value
STRIPE_SUCCESS_URL = os.getenv('STRIPE_SUCCESS_URL', f'{FLASK_API_URL}/payment/success')
STRIPE_CANCEL_URL = os.getenv('STRIPE_CANCEL_URL', f'{FLASK_API_URL}/payment/cancel')

# Pricing configuration (in USD)
PRICING = {
    "monthly": {
        "usd": 7.99,
        "discount": 0,  # No discount for monthly subscription
    },
    "yearly": {
        "usd": 81.48,  # $6.79 per month * 12 months
        "discount": 15,  # 15% discount compared to monthly price
    }
}

# Currency conversion rates (relative to USD)
# These rates should be updated regularly via an external API
CURRENCY_RATES = {
    "usd": 1.0,     # US Dollar (base currency)
    "cny": 6.2565,    # Chinese Yuan, made discount to achieve 49.99CNY/month
    "eur": 0.93,    # Euro (for French and German)
    "jpy": 159.40,  # Japanese Yen
    "krw": 1370.50, # Korean Won
    "rub": 91.37,   # Russian Ruble
    "gbp": 0.79,    # British Pound
    "mxn": 17.05,   # Mexican Peso (for Spanish/Latin America option)
    "ars": 882.90,  # Argentine Peso (alternative for Spanish)
    "esp": 0.93,    # Euro (for Spain - using Euro)
}

# Default currency by locale
LOCALE_TO_CURRENCY = {
    "en": "usd",  # English - US Dollar
    "zh": "cny",  # Chinese - Yuan
    "es": "eur",  # Spanish - Euro
    "fr": "eur",  # French - Euro
    "de": "eur",  # German - Euro
    "ja": "jpy",  # Japanese - Yen
    "ko": "krw",  # Korean - Won
    "ru": "rub",  # Russian - Ruble
} 