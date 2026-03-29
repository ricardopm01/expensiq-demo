"""Auth fields in employees + periods tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-29
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Auth fields on employees
    op.add_column("employees", sa.Column("google_id", sa.String(255), nullable=True))
    op.add_column("employees", sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("employees", sa.Column("last_login", sa.DateTime(timezone=True), nullable=True))
    op.create_unique_constraint("uq_employees_google_id", "employees", ["google_id"])

    # Periods table
    op.create_table(
        "periods",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="open"),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Employee period status table
    op.create_table(
        "employee_period_status",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("employee_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("period_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("periods.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="open"),
        sa.Column("reopened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reopened_by", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.UniqueConstraint("employee_id", "period_id", name="uq_employee_period"),
    )


def downgrade() -> None:
    op.drop_table("employee_period_status")
    op.drop_table("periods")
    op.drop_constraint("uq_employees_google_id", "employees", type_="unique")
    op.drop_column("employees", "last_login")
    op.drop_column("employees", "is_active")
    op.drop_column("employees", "google_id")
