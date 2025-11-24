"""
Configuration values for PowerPoint translation.
"""

import os
import tempfile
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
# On Heroku with Redis Cloud, the URL is provided as REDISCLOUD_URL
# For local development, use REDIS_URL
REDIS_URL = os.getenv('REDISCLOUD_URL') or os.getenv('REDIS_URL', 'redis://localhost:6379/0')

# Celery env
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_S3_BUCKET_NAME = os.getenv('AWS_S3_BUCKET_NAME', 'translide-files')
AWS_S3_REGION = os.getenv('AWS_S3_REGION', 'us-east-1')
# Enable S3 storage if credentials are available
USE_S3_STORAGE = bool(AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY)

# Alicloud OSS Configuration (fallback for S3)
ALICLOUD_OSS_ACCESS_KEY_ID = os.getenv('ALICLOUD_OSS_ACCESS_KEY_ID')
ALICLOUD_OSS_ACCESS_KEY_SECRET = os.getenv('ALICLOUD_OSS_ACCESS_KEY_SECRET')
ALICLOUD_OSS_BUCKET_NAME = os.getenv('ALICLOUD_OSS_BUCKET_NAME', 'translide-backup')
ALICLOUD_OSS_ENDPOINT = os.getenv('ALICLOUD_OSS_ENDPOINT', 'https://oss-us-east-1.aliyuncs.com')
ALICLOUD_OSS_REGION = os.getenv('ALICLOUD_OSS_REGION', 'us-east-1')
# Enable OSS storage if credentials are available
USE_OSS_STORAGE = bool(ALICLOUD_OSS_ACCESS_KEY_ID and ALICLOUD_OSS_ACCESS_KEY_SECRET)

# Secret key for session management
SECRET_KEY = os.getenv('SECRET_KEY', os.urandom(24).hex())
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', os.urandom(24).hex())
JWT_ACCESS_TOKEN_EXPIRES = 43200  # 12 hours

# Default font settings
DEFAULT_FONT_NAME = "Arial"
DEFAULT_FONT_SIZE = 18
DEFAULT_TITLE_FONT_SIZE = 24

# API settings
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
GEMINI_API_CHARACTER_BATCH_SIZE = 20000  # Maximum characters per batch
GEMINI_API_BATCH_SIZE = 50  # Keeping for backward compatibility

# DeepSeek API settings (fallback for Gemini)
DEEPSEEK_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
DEEPSEEK_MODEL = 'deepseek-v3'  # Fixed model name
DEEPSEEK_API_CHARACTER_BATCH_SIZE = 15000   # Smaller batch size for slow responses
DEEPSEEK_API_BATCH_SIZE = 30  # Smaller batch size for slow responses

# Font settings for text measurement
MIN_FONT_SIZE = 8 

# User translation limits
GUEST_TRANSLATION_LIMIT = 1
FREE_USER_TRANSLATION_LIMIT = 1
FREE_USER_TRANSLATION_PERIOD = 'weekly'  # 'daily', 'weekly', or 'monthly'
FREE_USER_CHARACTER_PER_FILE_LIMIT = 50000
FREE_USER_CHARACTER_MONTHLY_LIMIT = 200000
INVITATION_MEMBERSHIP_MONTHS = 3
PAID_MEMBERSHIP_MONTHLY = 1  # Duration for monthly paid membership
PAID_MEMBERSHIP_YEARLY = 12  # Duration for yearly paid membership
PAID_USER_CHARACTER_MONTHLY_LIMIT = 5000000
GUEST_USER_MAX_FILE_SIZE = 50
GUEST_USER_CHARACTER_MONTHLY_LIMIT = 100000  # Number of characters allowed for guest users

# Frontend and API URLs
FLASK_API_URL = os.getenv('FLASK_API_URL', 'http://localhost:5000/api')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:9003')

# Stripe payment settings
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')  # No default value to avoid committed secrets
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')  # No default value
STRIPE_SUCCESS_URL = os.getenv('STRIPE_SUCCESS_URL', f'{FRONTEND_URL}/payment/success')
STRIPE_CANCEL_URL = os.getenv('STRIPE_CANCEL_URL', f'{FRONTEND_URL}/payment/cancel')

# Alipay payment settings
ALIPAY_PUBLIC_KEY = os.getenv('ALIPAY_PUBLIC_KEY')

# Pricing configuration (in USD)
PRICING = {
    "monthly": {
        "usd": 7.99,
        "discount": 0,
    },
    "yearly": {
        "usd": 81.48,
        "discount": 15,
    },
}

# Currency conversion rates (relative to USD)
# These rates should be updated regularly via an external API
CURRENCY_RATES = {
    "usd": 1.0,     # US Dollar (base currency)
    "cny": 6.2565,    # Chinese Yuan, made discount to achieve 49.99CNY/month
    # "cny": 0.01,    # Price for testing
    "eur": 0.93,    # Euro (for French and German)
    "jpy": 159.40,  # Japanese Yen
    "krw": 1370.50, # Korean Won
    "rub": 91.37,   # Russian Ruble
    "gbp": 0.79,    # British Pound
    "mxn": 17.05,   # Mexican Peso (for Spanish/Latin America option)
    "ars": 882.90,  # Argentine Peso (alternative for Spanish)
    "esp": 0.93,    # Euro (for Spain - using Euro)
    "hkd": 7.80,    # Hong Kong Dollar
}

# Default currency by locale
LOCALE_TO_CURRENCY = {
    "en": "usd",  # English - US Dollar
    "zh": "cny",  # Chinese - Yuan
    "zh_hk": "hkd", # Chinese Traditional - Hong Kong Dollar
    "es": "eur",  # Spanish - Euro
    "fr": "eur",  # French - Euro
    "de": "eur",  # German - Euro
    "ja": "jpy",  # Japanese - Yen
    "ko": "krw",  # Korean - Won
    "ru": "rub",  # Russian - Ruble
} 

# Referral System Configuration
REFERRAL_REWARD_DAYS = 3
INVITATION_CODE_REWARD_DAYS = 3  # Reward days for invitation codes - current user only
REFERRAL_CODE_LENGTH = 12  # Length of referral codes
REFERRAL_EXPIRY_DAYS = 30
MAX_REFERRALS_PER_USER = 100  # Anti-spam limit for referrals per user
REFERRAL_FEATURE_PAID_MEMBERS_ONLY = True  # Only paid members can generate referral codes

# Email Verification Configuration
EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS = 24  # Email verification token expiry in hours
REQUIRE_EMAIL_VERIFICATION = True
SKIP_EMAIL_VERIFICATION_FOR_GOOGLE_AUTH = True  # Skip verification for Google OAuth users

# File Storage Configuration
# Directory for storing uploaded files temporarily before Celery processing
# Defaults to system temp directory, but can be set to a shared path for Docker/Kubernetes
UPLOAD_TEMP_DIR = os.getenv('UPLOAD_TEMP_DIR', os.path.join(tempfile.gettempdir(), 'ppt_translate_uploads'))
# Ensure the directory exists
os.makedirs(UPLOAD_TEMP_DIR, exist_ok=True)
# Cleanup files older than this many hours (default 24 hours)
UPLOAD_FILE_TTL_HOURS = int(os.getenv('UPLOAD_FILE_TTL_HOURS', '24'))

# Email Service Configuration
EMAIL_SERVICE = os.environ.get('EMAIL_SERVICE', 'flask_mail')  # Use Flask-Mail for local development

# Flask-Mail Configuration (for development)
MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'False').lower() == 'true'
MAIL_USERNAME = os.environ.get('MAIL_USERNAME')  # Your Gmail address
MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')  # Your Gmail App Password
MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', MAIL_USERNAME)

# Third-party Email Service API Keys
SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
AWS_SES_REGION = os.getenv('AWS_SES_REGION', 'us-east-1')
MAILGUN_API_KEY = os.getenv('MAILGUN_API_KEY')
MAILGUN_DOMAIN = os.getenv('MAILGUN_DOMAIN')
RESEND_API_KEY = os.getenv('RESEND_API_KEY') 