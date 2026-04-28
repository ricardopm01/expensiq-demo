"""Add budget column to projects table.

Revision ID: 0011
Revises: 0010
Create Date: 2026-04-28

Sprint 6 — Obras detalle y presupuesto por obra.

Añade `budget NUMERIC(12,2) NULL` en `projects` para permitir comparar
gasto acumulado vs presupuesto asignado por la admin.

Nullable: las obras existentes no se bloquean al aplicar la migración.
La admin puede dejar el campo vacío y la UI simplemente no renderiza la
barra de progreso en esas obras.
"""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "projects",
        sa.Column("budget", sa.Numeric(12, 2), nullable=True),
    )


def downgrade():
    op.drop_column("projects", "budget")
