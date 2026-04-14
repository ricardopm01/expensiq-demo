"""Add review fields to employee_period_status.

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "employee_period_status",
        sa.Column("review_status", sa.String(20), nullable=False, server_default="pending"),
    )
    op.add_column(
        "employee_period_status",
        sa.Column("review_note", sa.Text(), nullable=True),
    )
    op.add_column(
        "employee_period_status",
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "employee_period_status",
        sa.Column(
            "reviewed_by",
            UUID(as_uuid=True),
            sa.ForeignKey("employees.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("employee_period_status", "reviewed_by")
    op.drop_column("employee_period_status", "reviewed_at")
    op.drop_column("employee_period_status", "review_note")
    op.drop_column("employee_period_status", "review_status")
