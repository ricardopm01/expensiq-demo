"""Add projects table and project_id FK on receipts.

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-20

Sprint 3 — Obra/proyecto y desglose IVA.

Crea la tabla `projects` (obras) y añade `project_id` nullable en
`receipts`.  Modelo 1 recibo → 1 obra (supuesto confirmado por Marcos
el 2026-04-20).  Si Lezama necesita split de obra en el futuro, se
creará migración 0009 con join table receipt_projects.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "projects",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("code", sa.String(100), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.add_column(
        "receipts",
        sa.Column(
            "project_id",
            UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("receipts", "project_id")
    op.drop_table("projects")
