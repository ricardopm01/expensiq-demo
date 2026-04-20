"""Add tax breakdown fields to receipts.

Revision ID: 0008
Revises: 0007
Create Date: 2026-04-20

Sprint 3 — Obra/proyecto y desglose IVA.

Añade tax_base, tax_rate y tax_amount en `receipts`.  Todos nullable
para no romper recibos existentes.  El provider OCR (Claude Vision)
los intenta rellenar en facturas completas; si no los consigue quedan
NULL y el admin los puede editar desde el modal de detalle.

Nota: el campo `tax` (importe bruto heredado de Fase 1) se mantiene
para compatibilidad con datos seed existentes.  Los nuevos campos
ofrecen el desglose base / tipo / cuota requerido para libros de IVA.
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("receipts", sa.Column("tax_base", sa.Numeric(10, 2), nullable=True))
    op.add_column("receipts", sa.Column("tax_rate", sa.Numeric(5, 2), nullable=True))   # e.g. 21.00
    op.add_column("receipts", sa.Column("tax_amount", sa.Numeric(10, 2), nullable=True))


def downgrade():
    op.drop_column("receipts", "tax_amount")
    op.drop_column("receipts", "tax_rate")
    op.drop_column("receipts", "tax_base")
