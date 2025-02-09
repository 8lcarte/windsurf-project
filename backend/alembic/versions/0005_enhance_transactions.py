"""enhance transactions

Revision ID: 0005
Revises: 0004
Create Date: 2025-02-08 19:26:14.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None

def upgrade():
    # Add new transaction type
    op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'withdrawal'")
    
    # Add merchant fields
    op.add_column('transactions', sa.Column('merchant_id', sa.String(), nullable=True))
    op.add_column('transactions', sa.Column('merchant_country', sa.String(2), nullable=True))
    
    # Add transaction characteristics
    op.add_column('transactions', sa.Column('is_online', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('transactions', sa.Column('is_international', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('transactions', sa.Column('is_contactless', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('transactions', sa.Column('is_recurring', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add location data
    op.add_column('transactions', sa.Column('location_city', sa.String(), nullable=True))
    op.add_column('transactions', sa.Column('location_country', sa.String(2), nullable=True))
    op.add_column('transactions', sa.Column('location_postal_code', sa.String(), nullable=True))
    op.add_column('transactions', sa.Column('location_lat', sa.Numeric(9, 6), nullable=True))
    op.add_column('transactions', sa.Column('location_lon', sa.Numeric(9, 6), nullable=True))
    
    # Add risk indicators
    op.add_column('transactions', sa.Column('risk_score', sa.Integer(), nullable=True))
    op.add_column('transactions', sa.Column('risk_factors', sa.String(), nullable=True))
    
    # Add error handling
    op.add_column('transactions', sa.Column('decline_reason', sa.String(), nullable=True))
    op.add_column('transactions', sa.Column('error_code', sa.String(), nullable=True))
    op.add_column('transactions', sa.Column('error_message', sa.String(), nullable=True))

def downgrade():
    # Drop error handling
    op.drop_column('transactions', 'error_message')
    op.drop_column('transactions', 'error_code')
    op.drop_column('transactions', 'decline_reason')
    
    # Drop risk indicators
    op.drop_column('transactions', 'risk_factors')
    op.drop_column('transactions', 'risk_score')
    
    # Drop location data
    op.drop_column('transactions', 'location_lon')
    op.drop_column('transactions', 'location_lat')
    op.drop_column('transactions', 'location_postal_code')
    op.drop_column('transactions', 'location_country')
    op.drop_column('transactions', 'location_city')
    
    # Drop transaction characteristics
    op.drop_column('transactions', 'is_recurring')
    op.drop_column('transactions', 'is_contactless')
    op.drop_column('transactions', 'is_international')
    op.drop_column('transactions', 'is_online')
    
    # Drop merchant fields
    op.drop_column('transactions', 'merchant_country')
    op.drop_column('transactions', 'merchant_id')
    
    # Note: Cannot remove enum value in downgrade, as it might be in use
