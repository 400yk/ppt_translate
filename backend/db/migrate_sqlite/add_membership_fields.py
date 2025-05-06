"""
Migration script to add membership fields to the User model.
Run this script to update your existing database.
"""

import os
import sys
import datetime

# Add the parent directory to the path so we can import the models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.models import db, User, InvitationCode
from config import PAID_MEMBERSHIP_MONTHS
from app import create_app
from sqlalchemy import Column, DateTime, Boolean

def migrate():
    """Add membership fields to the User model and update existing invitation code users."""
    print("Starting migration of membership fields...")
    
    # Create Flask app and establish application context
    app = create_app()
    
    with app.app_context():
        try:
            # First, check if the columns already exist
            inspector = db.inspect(db.engine)
            existing_columns = [col['name'] for col in inspector.get_columns('user')]
            
            # Add the missing columns if they don't exist
            with db.engine.begin() as conn:
                if 'membership_start' not in existing_columns:
                    print("Adding 'membership_start' column to user table...")
                    conn.execute(db.text("ALTER TABLE user ADD COLUMN membership_start DATETIME"))
                
                if 'membership_end' not in existing_columns:
                    print("Adding 'membership_end' column to user table...")
                    conn.execute(db.text("ALTER TABLE user ADD COLUMN membership_end DATETIME"))
                
                if 'is_paid_user' not in existing_columns:
                    print("Adding 'is_paid_user' column to user table...")
                    conn.execute(db.text("ALTER TABLE user ADD COLUMN is_paid_user BOOLEAN DEFAULT FALSE"))
            
            # Get all users
            users = User.query.all()
            print(f"Found {len(users)} users in the database.")
            
            # Get active invitation codes
            active_codes = InvitationCode.query.filter_by(active=True).all()
            print(f"Found {len(active_codes)} active invitation codes.")
            
            # Update users with invitation codes to have membership
            users_updated = 0
            for user in users:
                if user.invitation_code and user.invitation_code.is_valid():
                    # Activate membership for this user
                    now = datetime.datetime.utcnow()
                    user.is_paid_user = True
                    user.membership_start = now
                    user.membership_end = now + datetime.timedelta(days=30 * PAID_MEMBERSHIP_MONTHS)
                    users_updated += 1
            
            # Commit changes
            db.session.commit()
            print(f"Updated {users_updated} users with valid invitation codes to have active memberships.")
            print(f"Migration completed successfully!")
            
        except Exception as e:
            print(f"Error during migration: {e}")
            import traceback
            traceback.print_exc()
            return False
        
        return True

if __name__ == "__main__":
    migrate() 