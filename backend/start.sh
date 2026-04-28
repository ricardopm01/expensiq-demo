#!/bin/bash
set -e

echo "==> Applying database schema (create_all + column patches)..."
python -c "
from app.db.session import engine, Base
import app.models.models
from sqlalchemy import text, inspect

# Create any missing tables (idempotent, safe on existing DBs)
Base.metadata.create_all(bind=engine)
print('Tables created/verified')

# Patch any columns that create_all cannot add to existing tables.
# Each statement uses IF NOT EXISTS so it is safe to run on any DB state.
patches = [
    # 0004 — auth fields (already in schema.sql but safe to repeat)
    'ALTER TABLE employees ADD COLUMN IF NOT EXISTS google_id  VARCHAR(255) UNIQUE',
    'ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT TRUE',
    'ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ',
    # 0007
    'ALTER TABLE receipts ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL',
    # 0008
    'ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tax_base   NUMERIC(10,2)',
    'ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tax_rate   NUMERIC(5,2)',
    'ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2)',
    # 0009
    'ALTER TABLE alerts ADD COLUMN IF NOT EXISTS suggested_action TEXT',
    # 0010
    'ALTER TABLE employees ADD COLUMN IF NOT EXISTS nif VARCHAR(20)',
]

with engine.begin() as conn:
    for sql in patches:
        try:
            conn.execute(text(sql))
        except Exception as e:
            # e.g. unique constraint already named differently — skip silently
            print(f'  patch skipped ({e.__class__.__name__}): {sql[:60]}')

print('Column patches applied')

# Seed default settings rows if missing
with engine.begin() as conn:
    conn.execute(text('''
        INSERT INTO settings (key, value, value_type, description) VALUES
          (:k1, :v1, :t1, :d1),
          (:k2, :v2, :t2, :d2),
          (:k3, :v3, :t3, :d3)
        ON CONFLICT (key) DO NOTHING
    '''), {
        'k1': 'approval.threshold_auto',    'v1': '100',  't1': 'number', 'd1': 'Recibos por debajo de este importe se aprueban automaticamente',
        'k2': 'approval.threshold_manager', 'v2': '500',  't2': 'number', 'd2': 'Recibos por encima de este importe requieren director',
        'k3': 'approval.auto_enabled',      'v3': 'true', 't3': 'bool',   'd3': 'Activa/desactiva auto-aprobacion global',
    })
print('Settings seeded')
"

echo "==> Stamping Alembic at head..."
python -m alembic stamp head 2>/dev/null || true

echo "==> Starting ExpensIQ API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips=*
