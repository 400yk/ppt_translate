"""Add email verification fields to users table

Revision ID: b1c2d3e4f5g6
Revises: a1b2c3d4e5f6
Create Date: 2025-01-11 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b1c2d3e4f5g6'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None

def upgrade():
    """Add email verification fields to users table."""
    # Add email verification fields
    op.add_column('user', sa.Column('is_email_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('user', sa.Column('email_verification_token', sa.String(length=100), nullable=True))
    op.add_column('user', sa.Column('email_verification_sent_at', sa.DateTime(), nullable=True))
    op.add_column('user', sa.Column('email_verification_token_expires_at', sa.DateTime(), nullable=True))
    
    # Create index on email_verification_token for faster lookups
    op.create_index(op.f('ix_user_email_verification_token'), 'user', ['email_verification_token'], unique=True)
    
    # For existing users without Google OAuth, mark them as email verified (migration compatibility)
    # For users with Google OAuth, ensure they are marked as verified
    op.execute("""
        UPDATE "user" 
        SET is_email_verified = true 
        WHERE google_id IS NOT NULL OR email_verification_token IS NULL
    """)

def downgrade():
    """Remove email verification fields from users table."""
    # Drop index
    op.drop_index(op.f('ix_user_email_verification_token'), table_name='user')
    
    # Remove columns
    op.drop_column('user', 'email_verification_token_expires_at')
    op.drop_column('user', 'email_verification_sent_at')
    op.drop_column('user', 'email_verification_token')
    op.drop_column('user', 'is_email_verified') 