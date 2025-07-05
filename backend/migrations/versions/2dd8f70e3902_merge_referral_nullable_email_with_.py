"""Merge referral nullable email with other migrations

Revision ID: 2dd8f70e3902
Revises: b1c2d3e4f5g6, update_referral_nullable_email
Create Date: 2025-07-05 12:55:27.367436

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2dd8f70e3902'
down_revision = ('b1c2d3e4f5g6', 'update_referral_nullable_email')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
