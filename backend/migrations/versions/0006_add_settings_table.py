"""Add settings table for configurable approval thresholds.

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-17

Sprint 1 fase B — tabla key/value para umbrales editables desde /settings.
Sustituye las constantes APPROVAL_THRESHOLD_AUTO/MANAGER hardcodeadas en
routes/receipts.py por valores persistidos que el admin puede modificar
sin redeploy.

Se siembran las filas iniciales con los defaults actuales (100 y 500 EUR)
para que el comportamiento no cambie al aplicar la migración.
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "settings",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("value_type", sa.String(20), nullable=False, server_default="string"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_by",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employees.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    op.bulk_insert(
        sa.table(
            "settings",
            sa.column("key", sa.String),
            sa.column("value", sa.Text),
            sa.column("value_type", sa.String),
            sa.column("description", sa.Text),
        ),
        [
            {
                "key": "approval.threshold_auto",
                "value": "100",
                "value_type": "number",
                "description": "Recibos por debajo de este importe (EUR) se aprueban automaticamente tras el OCR",
            },
            {
                "key": "approval.threshold_manager",
                "value": "500",
                "value_type": "number",
                "description": "Recibos por encima de este importe (EUR) requieren aprobacion de director",
            },
            {
                "key": "approval.auto_enabled",
                "value": "true",
                "value_type": "bool",
                "description": "Activa/desactiva la auto-aprobacion global. Si esta desactivado todos los recibos quedan pending.",
            },
        ],
    )


def downgrade():
    op.drop_table("settings")
