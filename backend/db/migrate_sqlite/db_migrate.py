import os
import sys
import sqlite3

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from db.models import TranslationRecord

def migrate_database():
    """
    Add new tables and columns to the database
    """
    print("Starting database migration...")
    db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
    
    # Check if the database file exists
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        print("Creating tables from scratch instead...")
        with app.app_context():
            db.create_all()
        print("Database tables created successfully.")
        return
    
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if the last_used column exists in invitation_code table
        cursor.execute("PRAGMA table_info(invitation_code)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'last_used' not in columns:
            print("Adding last_used column to invitation_code table...")
            cursor.execute("ALTER TABLE invitation_code ADD COLUMN last_used TIMESTAMP")
            print("Column added successfully.")
        
        # Check if the translation_record table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='translation_record'")
        if not cursor.fetchone():
            print("Creating translation_record table...")
            cursor.execute('''
                CREATE TABLE translation_record (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    filename TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    source_language TEXT,
                    target_language TEXT,
                    FOREIGN KEY (user_id) REFERENCES user(id)
                )
            ''')
            print("Table created successfully.")
        
        conn.commit()
        print("Database migration completed successfully.")
        
    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        sys.exit(1)
    finally:
        conn.close()
    
    # Create all tables to ensure any missing tables are created
    with app.app_context():
        db.create_all()

if __name__ == '__main__':
    migrate_database() 