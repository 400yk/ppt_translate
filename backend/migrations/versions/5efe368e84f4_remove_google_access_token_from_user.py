"""Remove google_access_token from user

Revision ID: 5efe368e84f4
Revises: 2dd8f70e3902
Create Date: 2025-07-17 21:32:39.993513

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5efe368e84f4'
down_revision = '2dd8f70e3902'
branch_labels = None
depends_on = None


def upgrade():
    # Remove the google_access_token column from user table
    with op.batch_alter_table('user') as batch_op:
        batch_op.drop_column('google_access_token')

def downgrade():
    # Add the google_access_token column back if needed (optional, set length as before)
    with op.batch_alter_table('user') as batch_op:
        batch_op.add_column(sa.Column('google_access_token', sa.String(length=1024), nullable=True))