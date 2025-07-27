#!/usr/bin/env python3
"""
Script to set up an admin user for testing the admin dashboard.
Run this after running the database migration.
"""

import sys
import os

# Add the parent directory to the path so we can import from the backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from db.models import db, User
from werkzeug.security import generate_password_hash

def setup_admin_user(username="admin", email="admin@example.com", password="admin123"):
    """Create an admin user if it doesn't exist."""
    app = create_app()
    
    with app.app_context():
        # Check if admin user already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            print(f"Admin user '{username}' already exists.")
            # Make sure they have admin privileges
            if not existing_user.is_admin:
                existing_user.is_admin = True
                db.session.commit()
                print(f"Updated user '{username}' with admin privileges.")
            else:
                print(f"User '{username}' already has admin privileges.")
            return existing_user
        
        # Create new admin user
        admin_user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            is_admin=True,
            is_email_verified=True  # Skip email verification for admin
        )
        
        db.session.add(admin_user)
        db.session.commit()
        
        print(f"✅ Admin user '{username}' created successfully!")
        print(f"   Username: {username}")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"   Admin privileges: {admin_user.is_admin}")
        
        return admin_user

def main():
    print("🔧 Setting up Admin User")
    print("=" * 40)
    
    # You can customize these values
    username = input("Enter admin username (default: admin): ").strip() or "admin"
    email = input("Enter admin email (default: admin@example.com): ").strip() or "admin@example.com"
    password = input("Enter admin password (default: admin123): ").strip() or "admin123"
    
    try:
        admin_user = setup_admin_user(username, email, password)
        print("\n🎉 Admin user setup completed!")
        print("\nYou can now:")
        print("1. Run the test script: python test_admin_api.py")
        print("2. Access the admin API endpoints with the credentials above")
        print("3. Start building the frontend admin dashboard")
        
    except Exception as e:
        print(f"❌ Error setting up admin user: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 