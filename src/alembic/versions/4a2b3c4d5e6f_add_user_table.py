"""add_user_table_and_session_link

Revision ID: 4a2b3c4d5e6f
Revises: 07b6dca5c13d
Create Date: 2026-03-02 11:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '4a2b3c4d5e6f'
down_revision: Union[str, Sequence[str], None] = '07b6dca5c13d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create 'users' table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # 2. Add 'user_id' to 'usersession'
    # For SQLite, adding a FK often requires recreation or batch mode.
    # However, since we are adding a column, we can try simple add.
    with op.batch_alter_table('usersession', schema=None) as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_usersession_user_id', 'users', ['user_id'], ['id'], ondelete='CASCADE')

def downgrade() -> None:
    with op.batch_alter_table('usersession', schema=None) as batch_op:
        batch_op.drop_constraint('fk_usersession_user_id', type_='foreignkey')
        batch_op.drop_column('user_id')
    
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
