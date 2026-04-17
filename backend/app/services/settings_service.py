"""Settings service — reads/writes key/value config from DB with a small cache.

Sprint 1 fase B — reemplaza las constantes hardcodeadas APPROVAL_THRESHOLD_*
por valores persistidos editables desde la UI admin.

Caché en memoria con TTL corto (30s) para no golpear la DB en cada upload de
recibo. La caché se invalida explícitamente al hacer PUT desde el endpoint
de settings.
"""
import logging
import time
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.models import Setting

logger = logging.getLogger("expensiq.settings")

# Defaults used if la BD aún no tiene la fila (p.ej. migración pendiente).
DEFAULTS: dict[str, Any] = {
    "approval.threshold_auto": 100.0,
    "approval.threshold_manager": 500.0,
    "approval.auto_enabled": True,
}

_CACHE_TTL_SECONDS = 30
_cache: dict[str, tuple[Any, float]] = {}


def _coerce(value: str, value_type: str) -> Any:
    if value_type == "number":
        try:
            return float(value)
        except ValueError:
            return None
    if value_type == "bool":
        return str(value).strip().lower() in ("true", "1", "yes", "on")
    return value


def _cache_get(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if not entry:
        return None
    value, expires_at = entry
    if expires_at < time.time():
        _cache.pop(key, None)
        return None
    return value


def _cache_set(key: str, value: Any) -> None:
    _cache[key] = (value, time.time() + _CACHE_TTL_SECONDS)


def invalidate_cache(key: Optional[str] = None) -> None:
    if key is None:
        _cache.clear()
    else:
        _cache.pop(key, None)


def get_setting(db: Session, key: str) -> Any:
    cached = _cache_get(key)
    if cached is not None:
        return cached
    row = db.query(Setting).filter(Setting.key == key).first()
    if row:
        value = _coerce(row.value, row.value_type)
    else:
        value = DEFAULTS.get(key)
    _cache_set(key, value)
    return value


def set_setting(
    db: Session,
    key: str,
    value: Any,
    value_type: str,
    updated_by: Optional[str] = None,
) -> Setting:
    from datetime import datetime

    row = db.query(Setting).filter(Setting.key == key).first()
    if not row:
        row = Setting(key=key, value=str(value), value_type=value_type)
        db.add(row)
    else:
        row.value = str(value)
        row.value_type = value_type
    row.updated_at = datetime.utcnow()
    row.updated_by = updated_by
    db.commit()
    invalidate_cache(key)
    return row


def get_approval_thresholds(db: Session) -> dict[str, Any]:
    return {
        "threshold_auto": get_setting(db, "approval.threshold_auto"),
        "threshold_manager": get_setting(db, "approval.threshold_manager"),
        "auto_enabled": get_setting(db, "approval.auto_enabled"),
    }
