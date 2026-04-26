"""Add suggested_action to alerts.

Revision ID: 0009
Revises: 0008
Create Date: 2026-04-26

Sprint 4 — Alertas accionables y batch approve inteligente.

Añade `suggested_action` (Text, nullable) en `alerts`. Lo rellena el
backend al crear la alerta, según el tipo: el detector de anomalías IA
incluye la acción sugerida en su respuesta JSON; el escaneo de
presupuesto la genera con un f-string que menciona al empleado.

El campo es nullable porque las alertas anteriores a esta migración
no lo tienen, y el FE simplemente no renderiza la línea italic cuando
está vacío. Sin breaking change.
"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("alerts", sa.Column("suggested_action", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("alerts", "suggested_action")
