"""Add nif column to employees.

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-27

Sprint 5B — Export CSV preliminar para SAP.

Añade `nif` (String(20), nullable) en `employees`. El NIF es necesario
en el CSV de importación a SAP, pero hasta que Lezama nos pase los NIF
reales de los empleados (ver pregunta 16 del audit doc) la columna queda
nullable y el CSV exporta vacío en esa celda.

No es breaking change: ningún código asume que el NIF está poblado.
"""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("employees", sa.Column("nif", sa.String(20), nullable=True))


def downgrade():
    op.drop_column("employees", "nif")
