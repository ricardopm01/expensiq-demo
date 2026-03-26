"""Add approval workflow fields to receipts

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("receipts", sa.Column("approval_level", sa.String(20)))
    op.add_column("receipts", sa.Column("approved_by", UUID(as_uuid=True)))
    op.add_column("receipts", sa.Column("approved_at", sa.DateTime(timezone=True)))
    op.create_foreign_key(
        "fk_receipts_approved_by",
        "receipts", "employees",
        ["approved_by"], ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_receipts_approved_by", "receipts", type_="foreignkey")
    op.drop_column("receipts", "approved_at")
    op.drop_column("receipts", "approved_by")
    op.drop_column("receipts", "approval_level")
