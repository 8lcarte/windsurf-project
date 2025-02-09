"""add category spending limits

Revision ID: 0007
Revises: 0006
Create Date: 2025-02-08 19:47:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None

def upgrade():
    # Add new columns for category-specific spending limits
    op.add_column('virtual_cards', sa.Column('category_spending_limits', postgresql.JSON(astext_type=sa.Text()), server_default='{}'))
    op.add_column('virtual_cards', sa.Column('category_current_spend', postgresql.JSON(astext_type=sa.Text()), server_default='{}'))
    op.add_column('virtual_cards', sa.Column('category_last_spend_reset', postgresql.JSON(astext_type=sa.Text()), server_default='{}'))
    
    # Add new columns for subcategory-specific spending limits
    op.add_column('virtual_cards', sa.Column('subcategory_spending_limits', postgresql.JSON(astext_type=sa.Text()), server_default='{}'))
    op.add_column('virtual_cards', sa.Column('subcategory_current_spend', postgresql.JSON(astext_type=sa.Text()), server_default='{}'))
    op.add_column('virtual_cards', sa.Column('subcategory_last_spend_reset', postgresql.JSON(astext_type=sa.Text()), server_default='{}'))
    
    # Add columns for transaction tracking
    op.add_column('virtual_cards', sa.Column('category_transaction_counts', postgresql.JSON(astext_type=sa.Text()), server_default='{}'))
    op.add_column('virtual_cards', sa.Column('subcategory_transaction_counts', postgresql.JSON(astext_type=sa.Text()), server_default='{}'))

def downgrade():
    # Remove category-specific columns
    op.drop_column('virtual_cards', 'category_spending_limits')
    op.drop_column('virtual_cards', 'category_current_spend')
    op.drop_column('virtual_cards', 'category_last_spend_reset')
    
    # Remove subcategory-specific columns
    op.drop_column('virtual_cards', 'subcategory_spending_limits')
    op.drop_column('virtual_cards', 'subcategory_current_spend')
    op.drop_column('virtual_cards', 'subcategory_last_spend_reset')
    
    # Remove transaction tracking columns
    op.drop_column('virtual_cards', 'category_transaction_counts')
    op.drop_column('virtual_cards', 'subcategory_transaction_counts')
