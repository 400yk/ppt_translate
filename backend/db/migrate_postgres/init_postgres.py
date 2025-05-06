#!/usr/bin/env python3
"""
Initialize PostgreSQL database for PowerPoint translation app.
This script creates the database and all tables.
"""

import sys
import os

# Add the parent directory to the Python path so we can import from there
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from flask import Flask
from db.models import db
from sqlalchemy import text
import config

def init_postgres_db():
    print(f"Initializing PostgreSQL database at {config.POSTGRES_URI}")
    
    # Create a Flask app context
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = config.POSTGRES_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    
    with app.app_context():
        # Drop all existing tables and recreate them
        print("Dropping all existing tables...")
        db.drop_all()
        
        print("Creating all tables...")
        db.create_all()
        
        # Reset sequence generators to 1
        print("Resetting sequence generators...")
        tables = ['user', 'invitation_code', 'translation_record']
        
        for table_name in tables:
            # Determine the sequence name (PostgreSQL naming convention)
            sequence_name = f"{table_name}_id_seq"
            
            # Reset the sequence to 1
            db.session.execute(text(f"ALTER SEQUENCE {sequence_name} RESTART WITH 1"))
        
        db.session.commit()
        print("PostgreSQL database initialization complete!")

if __name__ == '__main__':
    init_postgres_db() 