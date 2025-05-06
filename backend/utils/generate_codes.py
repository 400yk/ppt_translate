#!/usr/bin/env python3
"""
Script to generate invitation codes for the application.
Run this script to create a set of invitation codes.
"""

import os
import sys
from flask import Flask
from models import db, InvitationCode

def create_app():
    # Create a minimal Flask application
    app = Flask(__name__)
    
    # Configure database
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, '..', 'app.db')  # Updated path to reflect new location
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize database
    db.init_app(app)
    
    return app

def generate_invitation_codes(count=50):
    """Generate invitation codes and print them."""
    app = create_app()
    
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        
        # Generate codes
        codes = InvitationCode.generate_batch(count=count)
        
        # Print the generated codes
        print(f"Generated {len(codes)} invitation codes:")
        for i, code in enumerate(codes, 1):
            print(f"{i:02d}. {code}")

if __name__ == '__main__':
    # Parse command line arguments
    count = 50
    
    if len(sys.argv) > 1:
        try:
            count = int(sys.argv[1])
        except ValueError:
            print(f"Invalid count: {sys.argv[1]}. Using default: {count}")
    
    generate_invitation_codes(count) 