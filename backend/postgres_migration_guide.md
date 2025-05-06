# Migrating from SQLite to PostgreSQL: Step-by-Step Guide

This guide will walk you through migrating your PowerPoint Translation app from SQLite to PostgreSQL.

## Why PostgreSQL?

- **Improved Performance**: PostgreSQL handles concurrent users better than SQLite
- **Better Scalability**: Supports growing user base and data
- **Advanced Features**: Full-text search, JSON support, and more
- **Data Integrity**: Robust transaction support and data validation

## Prerequisites

1. PostgreSQL server (installed locally or accessible remotely)
2. Docker (optional, for containerized setup)
3. Python 3.6+ with pip
4. Basic database administration knowledge

## Migration Steps

### 1. Install PostgreSQL

#### Option A: Native Installation

**Windows:**
- Download and install from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)
- Remember to note your password during installation

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

#### Option B: Using Docker (Recommended for Development)

1. Make sure Docker and Docker Compose are installed
2. Use the provided `docker-compose.yml` file:
```bash
cd backend
docker-compose up -d
```

This creates:
- PostgreSQL server on port 5432
- pgAdmin web interface at http://localhost:5050

### 2. Install Required Python Packages

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a file named `.env.local` in the backend directory with:

```
POSTGRES_USER=ppt_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ppt_translate
```

Modify the values according to your setup.

### 4. Initialize the PostgreSQL Database

Run:
```bash
python init_postgres.py
```

### 5. Migrate Existing Data (Optional)

If you have existing data in SQLite that you want to keep:

```bash
# First, backup your SQLite database
cp app.db app.db.backup

# Run the migration script
python migrate_from_sqlite.py
```

### 6. Test the Application

Run the app with the new PostgreSQL configuration:
```bash
python app.py
```

Verify that features like user login, registration, and translations work correctly.

## Troubleshooting

### Connection Issues

- **Error**: "Could not connect to server: Connection refused"
  **Solution**: Verify PostgreSQL is running and check your host/port settings

- **Error**: "Password authentication failed"
  **Solution**: Verify username and password in `.env.local`

- **Error**: "Database does not exist"
  **Solution**: Run `CREATE DATABASE ppt_translate;` in PostgreSQL console

### Migration Issues

- **Error**: "Column X doesn't exist"
  **Solution**: Database schema may have changed; verify model definitions match both databases

## Reverting to SQLite (If Needed)

If you encounter problems and need to revert:

1. Set the `DATABASE_URL` environment variable to use SQLite:
```
DATABASE_URL=sqlite:///app.db
```

2. Restart your application

## Performance Tuning

After migration, consider these steps for optimal PostgreSQL performance:

1. Enable connection pooling
2. Add indexes for frequently queried fields
3. Regularly vacuum the database to reclaim space

## Getting Help

If you encounter issues not covered in this guide, consult:
- PostgreSQL documentation: https://www.postgresql.org/docs/
- SQLAlchemy documentation: https://docs.sqlalchemy.org/ 