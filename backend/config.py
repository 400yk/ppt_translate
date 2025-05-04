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

# Font settings for text measurement
MIN_FONT_SIZE = 8 