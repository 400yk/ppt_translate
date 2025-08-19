# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PPT Translate is a full-stack web application for translating PowerPoint presentations between different languages using AI. The project consists of:

- **Frontend**: Next.js 15 with TypeScript, React, and Tailwind CSS
- **Backend**: Flask/FastAPI with Python, Celery for async processing
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Infrastructure**: Docker Compose, Redis for caching/queues
- **Storage**: S3/MinIO/Azure OSS for file storage
- **Authentication**: JWT with Google OAuth integration
- **Payment**: Stripe integration for subscriptions

## Development Commands

### Frontend (Next.js)
```bash
# Development server (uses Turbopack)
npm run dev                 # Starts on port 9003

# Production build
npm run build
npm run start

# Code quality
npm run lint
npm run typecheck          # TypeScript checking

# Heroku deployment
npm run heroku-postbuild
```

### Backend (Flask/Python)
```bash
# Setup virtual environment
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Database migrations
flask db init
flask db migrate -m "description"
flask db upgrade

# Start services with Docker
docker-compose up postgres redis pgadmin

# Run Flask application
python app.py

# Run Celery worker for async tasks
celery -A celery_init.celery_app worker --loglevel=info

# Run tests
python -m pytest backend/tests/
```

### Infrastructure
```bash
# Start all services
docker-compose up

# Start specific services
docker-compose up postgres redis
docker-compose up pgadmin  # Database admin UI on port 5050
```

## Architecture Overview

### Frontend Structure (`src/`)
- `app/` - Next.js App Router pages and layouts
- `components/` - Reusable React components (auth, translation, admin, UI)
- `lib/` - Service layers (API clients, auth context, utilities)
- `hooks/` - Custom React hooks
- `locale/` - Internationalization JSON files

### Backend Structure (`backend/`)
- `api/` - API endpoints organized by feature (auth, translate, admin, etc.)
- `db/` - Database models and migration scripts
- `services/` - Business logic (LLM, translation, email, storage)
- `utils/` - Utility functions for PPTX processing
- `tests/` - Comprehensive test suite

### Key Features
- **Multi-language support**: i18n with JSON locale files
- **File processing**: PPTX manipulation with python-pptx
- **Async processing**: Celery tasks for translation jobs
- **Storage flexibility**: Supports S3, Alicloud OSS, and MinIO
- **Admin dashboard**: Full administrative interface
- **Referral system**: User referral tracking and rewards
- **Membership tiers**: Subscription-based access control

### Database
- PostgreSQL as primary database
- Redis for caching and Celery task queue
- SQLAlchemy ORM with Flask-Migrate for schema management
- Migration files in `backend/migrations/versions/`

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Google OAuth integration via `@react-oauth/google`
- User roles: regular users and admin
- Email verification system

### Payment Integration
- Stripe for subscription management
- Multiple pricing tiers defined in pricing service
- Webhook handling for payment events

## Environment Configuration

The project uses environment variables extensively. Key files:
- `backend/.env` - Backend configuration (not in repo)
- Frontend uses Next.js environment variables

Required environment variables include:
- Database credentials (POSTGRES_*)
- API keys (OPENAI_API_KEY, STRIPE_*)
- Storage configuration (AWS_*, AZURE_*, OSS_*)
- Email service credentials
- OAuth client configurations

## Testing

Backend tests are located in `backend/tests/` and cover:
- API endpoints (`test_*_api.py`)
- Service layer functionality
- Integration tests
- Fallback mechanisms for external services

Run tests with: `python -m pytest backend/tests/`

## Deployment

The application supports multiple deployment strategies:
- **Heroku**: Using Procfile and heroku-postbuild
- **Docker**: Full containerization with docker-compose
- **Custom servers**: Deployment scripts in `deploy/` directory

## Important Notes

- Always run `npm run typecheck` before committing frontend changes
- Backend changes should include appropriate tests
- Database migrations must be reviewed before deployment
- API keys and secrets should never be committed to the repository
- The application handles multiple storage backends - check configuration before deployment