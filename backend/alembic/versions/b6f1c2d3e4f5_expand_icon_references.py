"""expand icon references for custom uploads

Revision ID: b6f1c2d3e4f5
Revises: 7c4a8d1e9f10
Create Date: 2026-07-07 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "b6f1c2d3e4f5"
down_revision = "7c4a8d1e9f10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("workspaces") as batch_op:
        batch_op.alter_column("icon", existing_type=sa.String(length=32), type_=sa.String(length=512), existing_nullable=True)
    with op.batch_alter_table("resources") as batch_op:
        batch_op.alter_column("icon", existing_type=sa.String(length=32), type_=sa.String(length=512), existing_nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("workspaces") as batch_op:
        batch_op.alter_column("icon", existing_type=sa.String(length=512), type_=sa.String(length=32), existing_nullable=True)
    with op.batch_alter_table("resources") as batch_op:
        batch_op.alter_column("icon", existing_type=sa.String(length=512), type_=sa.String(length=32), existing_nullable=True)
