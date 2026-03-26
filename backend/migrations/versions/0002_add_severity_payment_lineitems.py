"""Add severity to alerts, payment_method and line_items to receipts

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("receipts", sa.Column("payment_method", sa.String(20)))
    op.add_column("receipts", sa.Column("line_items", sa.Text()))
    op.add_column("alerts", sa.Column("severity", sa.String(20), server_default="medium"))


def downgrade() -> None:
    op.drop_column("alerts", "severity")
    op.drop_column("receipts", "line_items")
    op.drop_column("receipts", "payment_method")
