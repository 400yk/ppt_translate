"""
Configuration values for PowerPoint translation.
"""

import os
from pathlib import Path

# Database settings
basedir = os.path.abspath(os.path.dirname(__file__))
SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///' + os.path.join(basedir, 'app.db'))
SQLALCHEMY_TRACK_MODIFICATIONS = False

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
GEMINI_API_BATCH_SIZE = 200

# Font settings for text measurement
MIN_FONT_SIZE = 8 

# User translation limits
GUEST_TRANSLATION_LIMIT = 1  # Number of translations allowed for guest users
FREE_USER_TRANSLATION_LIMIT = 1  # Number of translations allowed for free users
FREE_USER_TRANSLATION_PERIOD = 'weekly'  # 'daily', 'weekly', or 'monthly'
INVITATION_MEMBERSHIP_MONTHS = 3  # Default duration for invitation-based membership in months
PAID_MEMBERSHIP_MONTHLY = 1  # Duration for monthly paid membership
PAID_MEMBERSHIP_YEARLY = 12  # Duration for yearly paid membership
GUEST_FREE_USER_MAX_FILE_SIZE = 50  # 50MB


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