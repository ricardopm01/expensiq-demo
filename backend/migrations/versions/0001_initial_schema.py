"""Initial schema — baseline from Phase 1

Revision ID: 0001
Revises:
Create Date: 2026-03-23

This migration represents the initial database state created by schema.sql.
All tables already exist; this file serves as the Alembic baseline.
"""
from typing import Sequence, Union

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tables already created by schema.sql on first Docker startup.
    pass


def downgrade() -> None:
    pass
