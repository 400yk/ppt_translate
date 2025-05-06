"""
Migration script to add stripe_customer_id field to the User model.
Run this script to update your existing database.
"""

import os
import sys
import datetime

# Add the parent directory to the path so we can import the models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.models import db, User
from app import create_app
from sqlalchemy import Column, String

def migrate():
    """Add stripe_customer_id field to the User model."""
    print("Starting migration to add Stripe customer ID field...")
    
    # Create Flask app and establish application context
    app = create_app()
    
    with app.app_context():
        try:
            # First, check if the column already exists
            inspector = db.inspect(db.engine)
            existing_columns = [col['name'] for col in inspector.get_columns('user')]
            
            # Add the missing column if it doesn't exist
            with db.engine.begin() as conn:
                if 'stripe_customer_id' not in existing_columns:
                    print("Adding 'stripe_customer_id' column to user table...")
                    # SQLite doesn't support adding a UNIQUE constraint when altering a table
                    # Just add the column without the UNIQUE constraint
                    conn.execute(db.text("ALTER TABLE user ADD COLUMN stripe_customer_id VARCHAR(255)"))
                    
                    print("Column added successfully.")
                else:
                    print("'stripe_customer_id' column already exists, no changes needed.")
            
            print("Migration completed successfully.")
        except Exception as e:
            print(f"Error during migration: {str(e)}")
            raise

if __name__ == "__main__":
    migrate() 