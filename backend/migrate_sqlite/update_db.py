"""
Script to check and update the database schema.
"""

import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

def create_app():
    """Create a Flask app with database configuration."""
    app = Flask(__name__)
    
    # Import config after adding parent dir to path
    from config import SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS
    
    # Configure the app
    app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS
    
    return app

def check_and_update_schema():
    """Check if the database schema needs to be updated and update it if necessary."""
    app = create_app()
    db = SQLAlchemy(app)
    
    # Get the database inspector
    inspector = inspect(db.engine)
    
    # Use current migrations directory
    migrations_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Check if User table exists
    if 'user' in inspector.get_table_names():
        logger.info("User table exists, checking columns...")
        columns = {col['name']: col for col in inspector.get_columns('user')}
        
        # Check if membership fields exist
        missing_columns = []
        for col_name in ['membership_start', 'membership_end', 'is_paid_user']:
            if col_name not in columns:
                missing_columns.append(col_name)
        
        if missing_columns:
            logger.info(f"Missing columns in User table: {missing_columns}")
            logger.info("Need to run database migrations")
            
            # Add the missing columns
            with app.app_context():
                for col_name in missing_columns:
                    if col_name == 'is_paid_user':
                        db.engine.execute(f"ALTER TABLE user ADD COLUMN {col_name} BOOLEAN DEFAULT 0")
                    else:
                        db.engine.execute(f"ALTER TABLE user ADD COLUMN {col_name} DATETIME")
                
                logger.info("Schema updated successfully")
                
                # Now run the migration script to update existing users
                logger.info("Running data migration...")
                from migrate_sqlite.add_membership_fields import migrate
                migrate_result = migrate()
                
                if migrate_result:
                    logger.info("Data migration completed successfully")
                else:
                    logger.error("Data migration failed")
        else:
            logger.info("Database schema is up to date")
    else:
        logger.error("User table does not exist. You need to initialize the database first.")
        return False
    
    return True

if __name__ == "__main__":
    try:
        check_and_update_schema()
    except Exception as e:
        logger.error(f"Error updating database schema: {e}")
        import traceback
        traceback.print_exc() 