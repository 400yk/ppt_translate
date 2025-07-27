#!/usr/bin/env python3
"""
Script to generate invitation codes for the application.
Run this script to create a set of invitation codes in the database.
"""

import os
import sys
from flask import Flask
from db.models import db, InvitationCode

def create_app():
    # Create a minimal Flask application
    app = Flask(__name__)
    
    # Import the database URI from your config
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    from config import SQLALCHEMY_DATABASE_URI
    
    # Configure database
    app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize database
    db.init_app(app)
    
    return app

def generate_invitation_codes(count=50):
    """Generate invitation codes and save them to the database."""
    app = create_app()
    
    with app.app_context():
        try:
            # Create tables if they don't exist
            db.create_all()
            
            # Generate codes using the same logic as admin API
            codes_batch = InvitationCode.generate_batch(count=count)
            created_codes = []
            
            for code_value in codes_batch:
                new_code = InvitationCode(
                    code=code_value,
                    active=True
                )
                db.session.add(new_code)
                created_codes.append(new_code)
            
            db.session.commit()
            
            # Print the generated codes
            print(f"Successfully created {len(created_codes)} invitation codes in the database:")
            for i, code in enumerate(created_codes, 1):
                print(f"{i:02d}. {code.code}")
                        
        except Exception as e:
            db.session.rollback()
            print(f"Error creating invitation codes: {str(e)}")
            sys.exit(1)

if __name__ == '__main__':
    # Parse command line arguments
    count = 50
    
    if len(sys.argv) > 1:
        try:
            count = int(sys.argv[1])
            if count <= 0:
                print("Count must be a positive integer. Using default: 50")
                count = 50
        except ValueError:
            print(f"Invalid count: {sys.argv[1]}. Using default: 50")
            count = 50
    
    print(f"Generating {count} invitation codes...")
    generate_invitation_codes(count) 