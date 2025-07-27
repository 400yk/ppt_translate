"""Add admin role and translation status tracking

Revision ID: add_admin_translation_tracking
Revises: 5efe368e84f4
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_admin_translation_tracking'
down_revision = '5efe368e84f4'
branch_labels = None
depends_on = None


def upgrade():
    # Add is_admin field to user table
    op.add_column('user', sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create translation_status enum
    translation_status = postgresql.ENUM('processing', 'success', 'failed', name='translation_status')
    translation_status.create(op.get_bind())
    
    # Add translation tracking fields to translation_record table
    op.add_column('translation_record', sa.Column('status', sa.Enum('processing', 'success', 'failed', name='translation_status'), nullable=False, server_default='processing'))
    op.add_column('translation_record', sa.Column('error_message', sa.Text(), nullable=True))
    op.add_column('translation_record', sa.Column('processing_time', sa.Float(), nullable=True))
    op.add_column('translation_record', sa.Column('started_at', sa.DateTime(), nullable=True))
    op.add_column('translation_record', sa.Column('completed_at', sa.DateTime(), nullable=True))
    
    # Add indexes for better query performance
    op.create_index(op.f('ix_translation_record_status'), 'translation_record', ['status'], unique=False)
    op.create_index(op.f('ix_translation_record_started_at'), 'translation_record', ['started_at'], unique=False)
    op.create_index(op.f('ix_translation_record_completed_at'), 'translation_record', ['completed_at'], unique=False)


def downgrade():
    # Remove indexes
    op.drop_index(op.f('ix_translation_record_completed_at'), table_name='translation_record')
    op.drop_index(op.f('ix_translation_record_started_at'), table_name='translation_record')
    op.drop_index(op.f('ix_translation_record_status'), table_name='translation_record')
    
    # Remove translation tracking fields
    op.drop_column('translation_record', 'completed_at')
    op.drop_column('translation_record', 'started_at')
    op.drop_column('translation_record', 'processing_time')
    op.drop_column('translation_record', 'error_message')
    op.drop_column('translation_record', 'status')
    
    # Drop translation_status enum
    translation_status = postgresql.ENUM('processing', 'success', 'failed', name='translation_status')
    translation_status.drop(op.get_bind())
    
    # Remove is_admin field
    op.drop_column('user', 'is_admin') 