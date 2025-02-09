"""add social login

Revision ID: 0003
Revises: ab67cb520665
Create Date: 2025-02-08 19:23:45.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None

def upgrade():
    # Add social login columns
    op.add_column('users', sa.Column('social_provider', sa.String(), nullable=True))
    op.add_column('users', sa.Column('social_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('social_picture', sa.String(), nullable=True))
    op.add_column('users', sa.Column('social_access_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('social_refresh_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('social_token_expires_at', sa.DateTime(), nullable=True))
    
    # Create unique constraint for social provider and ID
    op.create_unique_constraint(
        'uq_users_social_provider_id',
        'users',
        ['social_provider', 'social_id']
    )

def downgrade():
    # Drop unique constraint
    op.drop_constraint('uq_users_social_provider_id', 'users', type_='unique')
    
    # Drop social login columns
    op.drop_column('users', 'social_token_expires_at')
    op.drop_column('users', 'social_refresh_token')
    op.drop_column('users', 'social_access_token')
    op.drop_column('users', 'social_picture')
    op.drop_column('users', 'social_id')
    op.drop_column('users', 'social_provider')
