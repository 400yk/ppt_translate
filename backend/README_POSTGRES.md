# Migrating to PostgreSQL

This guide explains how to migrate the PowerPoint Translation application from SQLite to PostgreSQL for improved performance and reliability.

## Prerequisites

1. PostgreSQL server installed and running
2. Python 3.6+ with pip
3. Access to the application's backend directory

## Installation

1. Install the required Python packages:

```bash
pip install -r requirements.txt
```

## PostgreSQL Setup

1. Create a new PostgreSQL database:

```bash
sudo -u postgres psql

postgres=# CREATE DATABASE ppt_translate;
postgres=# CREATE USER ppt_user WITH PASSWORD 'your_secure_password';
postgres=# GRANT ALL PRIVILEGES ON DATABASE ppt_translate TO ppt_user;
postgres=# \q
```

2. Configure environment variables in `.env.local` file:

```
POSTGRES_USER=ppt_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ppt_translate
```

## Initializing the Database

Run the initialization script to create the tables in PostgreSQL:

```bash
python init_postgres.py
```

## Migrating Existing Data (optional)

If you have existing data in SQLite that you want to migrate to PostgreSQL:

```bash
python migrate_from_sqlite.py
```

The migration script will automatically fix sequence generators in PostgreSQL, which is crucial for auto-incrementing primary keys to work properly.

## Fixing Sequence Generators

If you encounter "duplicate key" errors after migration, you may need to fix the PostgreSQL sequence generators:

```bash
python fix_postgres_sequences.py
```

This ensures that auto-increment columns continue from the highest existing ID in each table.

## Verifying the Migration

1. Make sure your Flask application starts correctly:

```bash
python app.py
```

2. Check that your application can connect to the PostgreSQL database by testing a feature that uses the database, such as logging in or viewing user data.

## Troubleshooting

### Connection Issues

- Verify that PostgreSQL is running:
  ```bash
  sudo systemctl status postgresql
  ```

- Check if the database exists:
  ```bash
  sudo -u postgres psql -l
  ```

- Verify connection parameters in your `.env.local` file

### Migration Errors

- If you encounter errors during migration, check that all required tables exist in the SQLite source database.
- Ensure you have proper permissions for both databases.
- For "duplicate key value violates unique constraint" errors, run the `fix_postgres_sequences.py` script to reset sequence generators.

## Database Backup (Important!)

Always backup your SQLite database before migration:

```bash
cp app.db app.db.backup
```

## Reverting to SQLite

If needed, you can revert to SQLite by setting the `DATABASE_URL` environment variable:

```
DATABASE_URL=sqlite:///path/to/app.db
``` 