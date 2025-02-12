"""add agent function registry

Revision ID: 0009
Revises: 0008
Create Date: 2024-02-10 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None

def upgrade():
    # Create agent_functions table
    op.create_table(
        'agent_functions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('parameters_schema', sa.JSON(), nullable=False),
        sa.Column('return_schema', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('requires_approval', sa.Boolean(), default=False),
        sa.Column('required_permissions', sa.JSON(), default=list),
        sa.Column('version', sa.Integer(), default=1),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_agent_functions_id'), 'agent_functions', ['id'], unique=False)
    op.create_index(op.f('ix_agent_functions_name'), 'agent_functions', ['name'], unique=True)

    # Create function_permissions table
    op.create_table(
        'function_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('function_id', sa.Integer(), nullable=False),
        sa.Column('agent_type', sa.String(), nullable=False),
        sa.Column('permission_level', sa.String(), nullable=False),
        sa.Column('conditions', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['function_id'], ['agent_functions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_function_permissions_id'), 'function_permissions', ['id'], unique=False)

    # Create function_usage_stats table
    op.create_table(
        'function_usage_stats',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('function_id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('call_count', sa.Integer(), default=0),
        sa.Column('success_count', sa.Integer(), default=0),
        sa.Column('failure_count', sa.Integer(), default=0),
        sa.Column('average_response_time', sa.Integer()),
        sa.Column('last_called_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['agent_id'], ['ai_agents.id'], ),
        sa.ForeignKeyConstraint(['function_id'], ['agent_functions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_function_usage_stats_id'), 'function_usage_stats', ['id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_function_usage_stats_id'), table_name='function_usage_stats')
    op.drop_table('function_usage_stats')
    op.drop_index(op.f('ix_function_permissions_id'), table_name='function_permissions')
    op.drop_table('function_permissions')
    op.drop_index(op.f('ix_agent_functions_name'), table_name='agent_functions')
    op.drop_index(op.f('ix_agent_functions_id'), table_name='agent_functions')
    op.drop_table('agent_functions') 