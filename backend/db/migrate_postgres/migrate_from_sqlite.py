#!/usr/bin/env python3
"""
Migration script to transfer data from SQLite to PostgreSQL.
This script:
1. Connects to both databases
2. Creates tables in PostgreSQL
3. Copies all data from SQLite to PostgreSQL
4. Resets sequence generators to continue from the highest ID
"""

import os
import sys
import datetime

# Add the parent directory to the Python path so we can import from there
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy import create_engine, MetaData, Table, select, text, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from flask import Flask
from models import db, User, InvitationCode, TranslationRecord
import config

def migrate_sqlite_to_postgres():
    print("Starting migration from SQLite to PostgreSQL...")
    
    # Create a simple Flask app context
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = config.POSTGRES_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    
    # Create SQLite engine
    sqlite_engine = create_engine(config.SQLITE_URI)
    sqlite_conn = sqlite_engine.connect()
    
    # Create PostgreSQL engine
    postgres_engine = create_engine(config.POSTGRES_URI)
    
    with app.app_context():
        # Create all tables in PostgreSQL
        print("Creating tables in PostgreSQL...")
        db.create_all()
        
        # Migrate invitation codes
        print("Migrating invitation codes...")
        # Get column names from table
        inspector = inspect(sqlite_engine)
        columns = [column['name'] for column in inspector.get_columns('invitation_code')]
        
        # Execute with column names
        result = sqlite_conn.execute(text("SELECT * FROM invitation_code"))
        sqlite_invites = result.fetchall()
        
        for invite in sqlite_invites:
            # Convert result tuple to dictionary
            invite_dict = dict(zip(columns, invite))
            
            # Check if code already exists
            if not InvitationCode.query.filter_by(code=invite_dict['code']).first():
                last_used = invite_dict['last_used']
                if last_used:
                    # Convert to Python datetime if it's a string
                    if isinstance(last_used, str):
                        last_used = datetime.datetime.fromisoformat(last_used)
                
                new_invite = InvitationCode(
                    id=invite_dict['id'],
                    code=invite_dict['code'],
                    created_at=invite_dict['created_at'],
                    active=invite_dict['active'],
                    last_used=last_used
                )
                db.session.add(new_invite)
        
        # Commit invitation codes
        print("Committing invitation codes...")
        db.session.commit()
        
        # Migrate users
        print("Migrating users...")
        # Get column names from table
        columns = [column['name'] for column in inspector.get_columns('user')]
        
        # Execute with column names
        result = sqlite_conn.execute(text("SELECT * FROM user"))
        sqlite_users = result.fetchall()
        
        # Use no_autoflush to avoid premature queries
        with db.session.no_autoflush:
            for user in sqlite_users:
                # Convert result tuple to dictionary
                user_dict = dict(zip(columns, user))
                
                # Check if user already exists - without triggering autoflush
                existing_user = db.session.query(User).filter_by(username=user_dict['username']).first()
                if not existing_user:
                    membership_start = user_dict['membership_start']
                    membership_end = user_dict['membership_end']
                    last_login = user_dict['last_login']
                    last_character_reset = user_dict['last_character_reset']
                    
                    new_user = User(
                        id=user_dict['id'],
                        username=user_dict['username'],
                        email=user_dict['email'],
                        password_hash=user_dict['password_hash'],
                        created_at=user_dict['created_at'],
                        last_login=last_login,
                        invitation_code_id=user_dict['invitation_code_id'],
                        membership_start=membership_start,
                        membership_end=membership_end,
                        is_paid_user=user_dict['is_paid_user'],
                        stripe_customer_id=user_dict['stripe_customer_id'],
                        monthly_characters_used=user_dict['monthly_characters_used'],
                        last_character_reset=last_character_reset
                    )
                    db.session.add(new_user)
        
        # Commit users
        print("Committing users...")
        db.session.commit()
        
        # Migrate translation records
        print("Migrating translation records...")
        # Get column names from table
        columns = [column['name'] for column in inspector.get_columns('translation_record')]
        
        # Execute with column names
        result = sqlite_conn.execute(text("SELECT * FROM translation_record"))
        sqlite_records = result.fetchall()
        
        for record in sqlite_records:
            # Convert result tuple to dictionary
            record_dict = dict(zip(columns, record))
            
            # Check if record already exists
            if not TranslationRecord.query.filter_by(id=record_dict['id']).first():
                new_record = TranslationRecord(
                    id=record_dict['id'],
                    user_id=record_dict['user_id'],
                    filename=record_dict['filename'],
                    created_at=record_dict['created_at'],
                    source_language=record_dict['source_language'],
                    target_language=record_dict['target_language'],
                    character_count=record_dict['character_count']
                )
                db.session.add(new_record)
        
        # Commit translation records
        print("Committing translation records...")
        db.session.commit()
        
        sqlite_conn.close()
        
        # Fix sequence generators to continue from the highest ID
        print("Fixing PostgreSQL sequence generators...")
        tables = ['user', 'invitation_code', 'translation_record']
        
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
        
        db.session.commit()
        
        print("Migration completed successfully!")

if __name__ == '__main__':
    migrate_sqlite_to_postgres() 