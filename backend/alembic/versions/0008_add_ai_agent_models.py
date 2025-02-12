"""add ai agent models

Revision ID: 0008
Revises: 0007
Create Date: 2024-02-09 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None

def upgrade():
    # Create enum types
    connection = op.get_bind()
    
    # Create agent_status enum if it doesn't exist
    connection.execute(text("""
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status') THEN
                CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'suspended');
            END IF;
        END $$;
    """))
    
    # Create transaction_status enum if it doesn't exist
    connection.execute(text("""
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
                CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected', 'failed', 'completed');
            END IF;
        END $$;
    """))
    
    # Create risk_level enum if it doesn't exist
    connection.execute(text("""
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
                CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
            END IF;
        END $$;
    """))
    
    # Create ai_agents table
    op.create_table(
        'ai_agents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('openai_assistant_id', sa.String(), nullable=True),
        sa.Column('status', postgresql.ENUM('active', 'inactive', 'suspended', name='agent_status', create_type=False), nullable=True),
        sa.Column('daily_spend_limit', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('monthly_spend_limit', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('current_daily_spend', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('current_monthly_spend', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('last_daily_reset', sa.DateTime(), nullable=True),
        sa.Column('last_monthly_reset', sa.DateTime(), nullable=True),
        sa.Column('allowed_merchant_categories', sa.JSON(), nullable=True),
        sa.Column('blocked_merchant_categories', sa.JSON(), nullable=True),
        sa.Column('allowed_merchants', sa.JSON(), nullable=True),
        sa.Column('blocked_merchants', sa.JSON(), nullable=True),
        sa.Column('max_transaction_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('require_approval_above', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('total_spend', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('total_transactions', sa.Integer(), nullable=True),
        sa.Column('last_transaction_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_agents_id'), 'ai_agents', ['id'], unique=False)
    op.create_index(op.f('ix_ai_agents_openai_assistant_id'), 'ai_agents', ['openai_assistant_id'], unique=True)
    
    # Create agent_transactions table
    op.create_table(
        'agent_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('virtual_card_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=True),
        sa.Column('merchant_name', sa.String(), nullable=True),
        sa.Column('merchant_category', sa.String(), nullable=True),
        sa.Column('merchant_id', sa.String(), nullable=True),
        sa.Column('status', postgresql.ENUM('pending', 'approved', 'rejected', 'failed', 'completed', name='transaction_status', create_type=False), nullable=True),
        sa.Column('external_transaction_id', sa.String(), nullable=True),
        sa.Column('conversation_context', sa.JSON(), nullable=True),
        sa.Column('decision_reasoning', sa.JSON(), nullable=True),
        sa.Column('user_intent', sa.String(), nullable=True),
        sa.Column('risk_score', sa.Integer(), nullable=True),
        sa.Column('risk_level', postgresql.ENUM('low', 'medium', 'high', 'critical', name='risk_level', create_type=False), nullable=True),
        sa.Column('risk_factors', sa.JSON(), nullable=True),
        sa.Column('validation_results', sa.JSON(), nullable=True),
        sa.Column('validation_errors', sa.JSON(), nullable=True),
        sa.Column('requires_manual_review', sa.Boolean(), nullable=True),
        sa.Column('manual_review_reason', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['agent_id'], ['ai_agents.id'], ),
        sa.ForeignKeyConstraint(['virtual_card_id'], ['virtual_cards.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_agent_transactions_id'), 'agent_transactions', ['id'], unique=False)
    
    # Create agent_virtual_cards association table
    op.create_table(
        'agent_virtual_cards',
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('virtual_card_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['agent_id'], ['ai_agents.id'], ),
        sa.ForeignKeyConstraint(['virtual_card_id'], ['virtual_cards.id'], ),
        sa.PrimaryKeyConstraint('agent_id', 'virtual_card_id')
    )

def downgrade():
    # Drop tables
    op.drop_table('agent_virtual_cards')
    op.drop_table('agent_transactions')
    op.drop_table('ai_agents')
    
    # Drop enum types if they exist
    connection = op.get_bind()
    connection.execute(text("""
        DO $$ 
        BEGIN 
            DROP TYPE IF EXISTS agent_status;
            DROP TYPE IF EXISTS transaction_status;
            DROP TYPE IF EXISTS risk_level;
        END $$;
    """)) 