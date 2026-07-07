"""add workspace types and resource icons

Revision ID: 7c4a8d1e9f10
Revises: abaa25333f94
Create Date: 2026-07-07 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "7c4a8d1e9f10"
down_revision: Union[str, None] = "abaa25333f94"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("workspaces", sa.Column("type", sa.String(length=64), nullable=True, server_default="website"))
    op.add_column("resources", sa.Column("icon", sa.String(length=32), nullable=True))
    with op.batch_alter_table("resources") as batch_op:
        batch_op.alter_column("type", existing_type=sa.String(length=32), type_=sa.String(length=64), existing_nullable=False)

    type_map = {
        "PFSENSE": "pfsense",
        "UNRAID": "unraid",
        "MIKROTIK": "mikrotik",
        "GITHUB": "github",
        "CLOUDFLARE": "cloudflare",
        "HOME_ASSISTANT": "home_assistant",
        "DOCKER_HOST": "docker_host",
        "NAS": "nas",
        "ROUTER": "router",
        "SERVER": "server",
        "CUSTOM": "custom",
    }
    for old, new in type_map.items():
        op.execute(sa.text("UPDATE resources SET type = :new WHERE type = :old").bindparams(old=old, new=new))


def downgrade() -> None:
    with op.batch_alter_table("resources") as batch_op:
        batch_op.alter_column("type", existing_type=sa.String(length=64), type_=sa.String(length=32), existing_nullable=False)
    op.drop_column("resources", "icon")
    op.drop_column("workspaces", "type")
