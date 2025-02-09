"""enhance virtual cards

Revision ID: 0004
Revises: ab67cb520665
Create Date: 2025-02-08 19:26:14.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None

def upgrade():
    # Create CardStatus enum type
    card_status = postgresql.ENUM('active', 'frozen', 'cancelled', 'expired', name='cardstatus')
    card_status.create(op.get_bind())
    
    # Remove is_active column and add status column
    op.drop_column('virtual_cards', 'is_active')
    op.add_column('virtual_cards', sa.Column('status', sa.Enum('active', 'frozen', 'cancelled', 'expired', name='cardstatus'), nullable=False, server_default='active'))
    
    # Add spending limits and current spend
    op.add_column('virtual_cards', sa.Column('spending_limits', postgresql.JSONB, nullable=False, server_default='{}'))
    op.add_column('virtual_cards', sa.Column('current_spend', postgresql.JSONB, nullable=False, server_default='{}'))
    op.add_column('virtual_cards', sa.Column('last_spend_reset', postgresql.JSONB, nullable=False, server_default='{}'))
    
    # Add merchant controls
    op.add_column('virtual_cards', sa.Column('allowed_merchant_categories', postgresql.JSONB, nullable=False, server_default='[]'))
    op.add_column('virtual_cards', sa.Column('blocked_merchant_categories', postgresql.JSONB, nullable=False, server_default='[]'))
    op.add_column('virtual_cards', sa.Column('allowed_merchants', postgresql.JSONB, nullable=False, server_default='[]'))
    op.add_column('virtual_cards', sa.Column('blocked_merchants', postgresql.JSONB, nullable=False, server_default='[]'))
    
    # Add geographic controls
    op.add_column('virtual_cards', sa.Column('allowed_countries', postgresql.JSONB, nullable=False, server_default='[]'))
    op.add_column('virtual_cards', sa.Column('blocked_countries', postgresql.JSONB, nullable=False, server_default='[]'))
    
    # Add transaction controls
    op.add_column('virtual_cards', sa.Column('allow_online_transactions', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('virtual_cards', sa.Column('allow_contactless_transactions', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('virtual_cards', sa.Column('allow_cash_withdrawals', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('virtual_cards', sa.Column('allow_international_transactions', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add card usage statistics
    op.add_column('virtual_cards', sa.Column('last_transaction_at', sa.DateTime(), nullable=True))
    op.add_column('virtual_cards', sa.Column('failed_transaction_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('virtual_cards', sa.Column('total_transaction_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('virtual_cards', sa.Column('total_spend', sa.Numeric(10, 2), nullable=False, server_default='0'))

def downgrade():
    # Remove card usage statistics
    op.drop_column('virtual_cards', 'total_spend')
    op.drop_column('virtual_cards', 'total_transaction_count')
    op.drop_column('virtual_cards', 'failed_transaction_count')
    op.drop_column('virtual_cards', 'last_transaction_at')
    
    # Remove transaction controls
    op.drop_column('virtual_cards', 'allow_international_transactions')
    op.drop_column('virtual_cards', 'allow_cash_withdrawals')
    op.drop_column('virtual_cards', 'allow_contactless_transactions')
    op.drop_column('virtual_cards', 'allow_online_transactions')
    
    # Remove geographic controls
    op.drop_column('virtual_cards', 'blocked_countries')
    op.drop_column('virtual_cards', 'allowed_countries')
    
    # Remove merchant controls
    op.drop_column('virtual_cards', 'blocked_merchants')
    op.drop_column('virtual_cards', 'allowed_merchants')
    op.drop_column('virtual_cards', 'blocked_merchant_categories')
    op.drop_column('virtual_cards', 'allowed_merchant_categories')
    
    # Remove spending limits and current spend
    op.drop_column('virtual_cards', 'last_spend_reset')
    op.drop_column('virtual_cards', 'current_spend')
    op.drop_column('virtual_cards', 'spending_limits')
    
    # Remove status and add back is_active
    op.drop_column('virtual_cards', 'status')
    op.add_column('virtual_cards', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    
    # Drop CardStatus enum type
    op.execute('DROP TYPE cardstatus')
