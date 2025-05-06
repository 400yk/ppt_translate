#!/usr/bin/env python3
"""
Fix PostgreSQL sequence generators after migration from SQLite.
This script updates all sequence generators to the next value after the highest ID in each table.
"""

from flask import Flask
from sqlalchemy import text
from models import db
import config

def fix_postgres_sequences():
    print("Fixing PostgreSQL sequence generators...")
    
    # Create a Flask app context
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = config.POSTGRES_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    
    with app.app_context():
        # Get all tables with ID columns
        tables = ['user', 'invitation_code', 'translation_record']
        
        # Fix sequence for each table
        for table_name in tables:
            # Determine the sequence name (PostgreSQL naming convention)
            sequence_name = f"{table_name}_id_seq"
            
            # Use quoted identifiers to handle reserved keywords like "user"
            quoted_table_name = f'"{table_name}"'
            
            # Get the maximum ID from the table
            result = db.session.execute(text(f"SELECT MAX(id) FROM {quoted_table_name}"))
            max_id = result.scalar() or 0
            
            # Set the sequence to start from max_id + 1
            if max_id > 0:
                print(f"Setting sequence for {table_name} to start from {max_id + 1}")
                db.session.execute(text(f"SELECT setval('{sequence_name}', {max_id})"))
            else:
                print(f"No records in {table_name}, leaving sequence at default")

        # Commit the changes
        db.session.commit()
        print("Sequence fix completed successfully!")

if __name__ == '__main__':
    fix_postgres_sequences() 