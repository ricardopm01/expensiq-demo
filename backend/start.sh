#!/bin/bash
set -e

echo "==> Initializing database..."
python -c "
from app.db.session import engine, Base
import app.models.models  # register all models
Base.metadata.create_all(bind=engine)
print('Tables created/verified')
"

echo "==> Stamping Alembic migrations..."
python -m alembic stamp head 2>/dev/null || true

echo "==> Starting ExpensIQ API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips=*
