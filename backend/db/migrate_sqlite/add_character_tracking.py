"""
Migration script to add character tracking fields to User and TranslationRecord tables.
"""

import sys
import os
import datetime
import sqlite3

# Add parent directory to path so we can import from parent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate():
    """Add character tracking fields to database."""
    # Get the database file path from config
    from config import SQLALCHEMY_DATABASE_URI
    
    # Handle sqlite file path
    if SQLALCHEMY_DATABASE_URI.startswith('sqlite:///'):
        db_path = SQLALCHEMY_DATABASE_URI.replace('sqlite:///', '')
    else:
        print(f"This migration only supports SQLite databases. Current URI: {SQLALCHEMY_DATABASE_URI}")
        return False
    
    # Connect to the database
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        print(f"Connected to database: {db_path}")
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return False
    
    # Check if the columns already exist in the User table
    cursor.execute("PRAGMA table_info(user)")
    columns = cursor.fetchall()
    column_names = [col[1] for col in columns]
    
    # Add monthly_characters_used to User table if it doesn't exist
    if 'monthly_characters_used' not in column_names:
        try:
            cursor.execute("ALTER TABLE user ADD COLUMN monthly_characters_used INTEGER DEFAULT 0")
            print("Added monthly_characters_used column to User table")
        except Exception as e:
            print(f"Error adding monthly_characters_used column: {e}")
            return False
    else:
        print("monthly_characters_used column already exists in User table")
    
    # Add last_character_reset to User table if it doesn't exist
    if 'last_character_reset' not in column_names:
        try:
            # Using current date as default
            now = datetime.datetime.utcnow().isoformat()
            cursor.execute(f"ALTER TABLE user ADD COLUMN last_character_reset TIMESTAMP DEFAULT '{now}'")
            print("Added last_character_reset column to User table")
        except Exception as e:
            print(f"Error adding last_character_reset column: {e}")
            return False
    else:
        print("last_character_reset column already exists in User table")
    
    # Check if the column already exists in the TranslationRecord table
    cursor.execute("PRAGMA table_info(translation_record)")
    columns = cursor.fetchall()
    column_names = [col[1] for col in columns]
    
    # Add character_count to TranslationRecord table if it doesn't exist
    if 'character_count' not in column_names:
        try:
            cursor.execute("ALTER TABLE translation_record ADD COLUMN character_count INTEGER DEFAULT 0")
            print("Added character_count column to TranslationRecord table")
        except Exception as e:
            print(f"Error adding character_count column: {e}")
            return False
    else:
        print("character_count column already exists in TranslationRecord table")
    
    # Commit the changes
    conn.commit()
    conn.close()
    
    print("Migration completed successfully.")
    return True

if __name__ == "__main__":
    success = migrate()
    if success:
        print("Character tracking fields added successfully!")
    else:
        print("Migration failed. Please check the error messages above.")
        sys.exit(1) 