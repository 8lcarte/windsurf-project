"""Initial migration

Revision ID: ab67cb520665
Revises: 
Create Date: 2025-02-08 18:41:20.221668

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab67cb520665'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('hashed_password', sa.String(), nullable=False),
    sa.Column('full_name', sa.String(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('is_superuser', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_table('payment_methods',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('type', sa.String(), nullable=False),
    sa.Column('provider', sa.String(), nullable=False),
    sa.Column('provider_payment_id', sa.String(), nullable=False),
    sa.Column('last_four', sa.String(length=4), nullable=True),
    sa.Column('is_default', sa.Boolean(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('provider_payment_id')
    )
    op.create_index(op.f('ix_payment_methods_id'), 'payment_methods', ['id'], unique=False)
    op.create_table('virtual_cards',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('card_number', sa.String(), nullable=False),
    sa.Column('expiry_month', sa.Integer(), nullable=False),
    sa.Column('expiry_year', sa.Integer(), nullable=False),
    sa.Column('cvv', sa.String(), nullable=False),
    sa.Column('cardholder_name', sa.String(), nullable=False),
    sa.Column('balance', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('currency', sa.String(length=3), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('stripe_card_id', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('card_number'),
    sa.UniqueConstraint('stripe_card_id')
    )
    op.create_index(op.f('ix_virtual_cards_id'), 'virtual_cards', ['id'], unique=False)
    op.create_table('transactions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('virtual_card_id', sa.Integer(), nullable=True),
    sa.Column('payment_method_id', sa.Integer(), nullable=True),
    sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('currency', sa.String(length=3), nullable=True),
    sa.Column('type', sa.Enum('FUNDING', 'PURCHASE', 'REFUND', name='transactiontype'), nullable=False),
    sa.Column('status', sa.Enum('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', name='transactionstatus'), nullable=False),
    sa.Column('description', sa.String(), nullable=True),
    sa.Column('merchant_name', sa.String(), nullable=True),
    sa.Column('merchant_category', sa.String(), nullable=True),
    sa.Column('provider_transaction_id', sa.String(), nullable=True),
    sa.Column('provider', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('completed_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['payment_method_id'], ['payment_methods.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['virtual_card_id'], ['virtual_cards.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('provider_transaction_id')
    )
    op.create_index(op.f('ix_transactions_id'), 'transactions', ['id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_transactions_id'), table_name='transactions')
    op.drop_table('transactions')
    op.drop_index(op.f('ix_virtual_cards_id'), table_name='virtual_cards')
    op.drop_table('virtual_cards')
    op.drop_index(op.f('ix_payment_methods_id'), table_name='payment_methods')
    op.drop_table('payment_methods')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    # ### end Alembic commands ###
