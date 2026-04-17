# Sprint 1 — Fase B: Umbrales de aprobación configurables

**Rama**: `feat/sprint1b-settings-thresholds`
**Apilada sobre**: `feat/sprint1-auto-approval-real` (Sprint 1 Fase A — auto-aprobación real).
**Merge**: Mergear primero Fase A, luego esta Fase B.

---

## Por qué

En la auditoría 2026-04-17 (`AUDITORIA_PLAN_MEJORA_2026-04-17.md`, Sprint 1) quedó pendiente mover los umbrales de aprobación de constantes hardcodeadas en `receipts.py` a valores editables por el admin sin redeploy. Lezama va a necesitar tocar estos importes sin avisarnos.

Pregunta 8 a Lezama (en el documento de auditoría) es precisamente "¿qué umbrales quieren por defecto?" — con esta UI dejan de depender de nosotros para cambiarlos.

---

## Qué hace esta rama

1. **Persistencia**: nueva tabla `settings` (key/value/type) con 3 filas semilla (`approval.threshold_auto=100`, `approval.threshold_manager=500`, `approval.auto_enabled=true`).
2. **Servicio con caché**: `settings_service` con caché en proceso (TTL 30s) para no golpear la DB en cada upload. Invalidación explícita al hacer `PUT`.
3. **Endpoints**: `GET/PUT /api/v1/settings/approval-thresholds`, admin-only (JWT o header `X-User-Role` en DEV_MODE). Valida `threshold_auto < threshold_manager` antes de devolver 200.
4. **Cambio de lógica**: `_calculate_approval_level` y `_approval_reason` leen ahora desde `settings_service`; si `auto_enabled=false`, ningún recibo pasa a `auto` (todos entran en cola).
5. **UI**: nueva página `/settings` (solo admin) con toggle, dos inputs de importe, preview del efecto, validación inline y save/discard.
6. **Sidebar**: entrada "Ajustes" en el nav admin.

---

## Archivos

### Backend

- **NEW** `backend/migrations/versions/0006_add_settings_table.py` — tabla `settings` + seeds.
- **NEW** `backend/app/services/settings_service.py` — cache en memoria + coerce por tipo + `get_approval_thresholds`.
- **NEW** `backend/app/routes/settings.py` — GET/PUT con validaciones.
- `backend/app/models/models.py` — clase `Setting`.
- `backend/app/routes/receipts.py` — `_calculate_approval_level(amount, db=None)` y `_approval_reason(amount, level, db=None)` cargan desde `settings_service` cuando se les pasa `db`. Todas las llamadas en el router ahora pasan `db=db`.
- `backend/app/main.py` — registra `settings_routes` en `/api/v1/settings`.

### Frontend

- **NEW** `frontend/src/app/settings/page.tsx` — UI admin.
- `frontend/src/components/sidebar.tsx` — item "Ajustes" en `ADMIN_NAV`.
- `frontend/src/lib/api.ts` — añadido `api.put<T>(path, body)` y parseo de `detail` en errores para que los 403/422 del backend lleguen al toast con el mensaje correcto.

---

## Verificación

1. `alembic upgrade head` aplica migración 0006 limpio; `SELECT * FROM settings;` devuelve 3 filas.
2. Como admin en `/settings`: subir `threshold_auto` a 200, guardar → toast "Umbrales actualizados".
3. Subir un recibo de 150€: antes quedaba pending, ahora queda `auto-approved` (porque 150 < 200).
4. Intentar guardar `threshold_auto=500, threshold_manager=300` → toast con mensaje del backend ("threshold_auto debe ser menor...").
5. Desactivar el toggle → subir recibo de 50€ → queda pending (no auto).
6. Como empleado (no admin) navegar a `/settings` → EmptyState "Acceso restringido".
7. `./node_modules/.bin/tsc --noEmit` en `frontend/` → sin errores.
8. `python3 -c "import ast; ast.parse(open('...').read())"` sobre los 5 archivos backend editados → OK.

---

## Fuera de alcance (se queda para Sprint 2 y siguientes)

- Preguntar a Lezama por los umbrales definitivos (sigue en `AUDITORIA_PLAN_MEJORA_2026-04-17.md` sección 7, pregunta 8).
- Umbrales diferenciados por categoría o departamento.
- Histórico de cambios (auditoría de quién cambió qué y cuándo más allá del `updated_by` último).
- Dashboard "Acción hoy" (Sprint 2).
