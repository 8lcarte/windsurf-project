"""add merchant categories

Revision ID: 0006
Revises: 0005
Create Date: 2025-02-08 19:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None

def upgrade():
    # Create merchant_categories table
    op.create_table(
        'merchant_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('path', sa.String(), nullable=False),
        sa.Column('level', sa.Integer(), nullable=False),
        sa.Column('mcc_codes', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_high_risk', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('requires_additional_verification', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('allowed_card_schemes', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('keywords', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('similar_words', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('excluded_words', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('typical_amount_range', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('typical_frequency', sa.String(), nullable=True),
        sa.Column('common_payment_methods', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('restricted_jurisdictions', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('required_licenses', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('aml_risk_level', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['parent_id'], ['merchant_categories.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_merchant_categories_code'), 'merchant_categories', ['code'], unique=True)
    op.create_index(op.f('ix_merchant_categories_id'), 'merchant_categories', ['id'], unique=False)

    # Insert root categories
    op.execute("""
    INSERT INTO merchant_categories (code, name, description, path, level, keywords, mcc_codes)
    VALUES
    ('retail', 'Retail', 'Retail goods and services', 'retail', 0, 
     '["shop", "store", "retail", "market", "outlet"]'::jsonb, 
     '["5999"]'::jsonb),
    
    ('food_and_drink', 'Food & Drink', 'Food and beverage services', 'food_and_drink', 0,
     '["restaurant", "food", "cafe", "bar", "dining"]'::jsonb,
     '["5812", "5813", "5814"]'::jsonb),
    
    ('travel', 'Travel', 'Travel and transportation services', 'travel', 0,
     '["airline", "hotel", "travel", "transportation", "car rental"]'::jsonb,
     '["4511", "7011", "7512"]'::jsonb),
    
    ('entertainment', 'Entertainment', 'Entertainment and recreation', 'entertainment', 0,
     '["movie", "theater", "concert", "event", "game"]'::jsonb,
     '["7832", "7922", "7929"]'::jsonb),
    
    ('services', 'Services', 'Professional and personal services', 'services', 0,
     '["service", "professional", "consulting", "repair", "maintenance"]'::jsonb,
     '["7299"]'::jsonb),
    
    ('healthcare', 'Healthcare', 'Medical and healthcare services', 'healthcare', 0,
     '["medical", "doctor", "hospital", "clinic", "pharmacy"]'::jsonb,
     '["8011", "8021", "8031", "8041", "8042", "8043", "8049", "8062", "8071", "8099"]'::jsonb)
    """)

def downgrade():
    op.drop_index(op.f('ix_merchant_categories_id'), table_name='merchant_categories')
    op.drop_index(op.f('ix_merchant_categories_code'), table_name='merchant_categories')
    op.drop_table('merchant_categories')
