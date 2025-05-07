"""Add GuestTranslation model correct

Revision ID: 0a3705867ecd
Revises: 1e0b8b1725d6
Create Date: 2025-05-07 14:51:15.090868

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0a3705867ecd'
down_revision = '1e0b8b1725d6'
branch_labels = None
depends_on = None


def upgrade():
    # Create a new GuestTranslation table
    op.create_table('guest_translation',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('ip_address', sa.String(length=45), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('source_language', sa.String(length=10), nullable=True),
        sa.Column('target_language', sa.String(length=10), nullable=True),
        sa.Column('character_count', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_guest_translation_ip_address'), 'guest_translation', ['ip_address'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_guest_translation_ip_address'), table_name='guest_translation')
    op.drop_table('guest_translation')