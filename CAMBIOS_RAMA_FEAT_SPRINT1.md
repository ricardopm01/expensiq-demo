# Rama `feat/sprint1-auto-approval-real`

**Fecha**: 2026-04-17
**Autor**: Ricardo (orquestado con Claude)
**Sprint**: 1 del roadmap `AUDITORIA_PLAN_MEJORA_2026-04-17.md`
**Objetivo**: activar el flujo de aprobación multinivel real — fix del bug crítico C1 (auto-aprobación declarada pero nunca aplicada), implementación de 3 niveles (auto/manager/director) y captura de `approved_by` para auditoría.

## Resumen de cambios

### Backend

**`backend/app/core/auth.py`**
- Añadido `get_current_user_optional`: variante de `get_current_user` que devuelve `None` en lugar de lanzar 401 cuando falta o es inválido el token JWT.
- Permite que endpoints con auth opcional (como aprobación) sigan funcionando en DEV_MODE y con llamadas legacy que usan solo `X-User-Role`.

**`backend/app/routes/receipts.py`**
- **Fix C1 crítico (línea ~599)**: en `_process_receipt_ocr`, tras calcular `approval_level`, si el nivel es `"auto"` el recibo queda `status="approved"` y `approved_at=now()` en lugar de forzar siempre `"pending"`. Los niveles `manager` y `director` siguen cayendo en pending y aparecen en la cola `/approvals`.
- Mismo fix aplicado al import Excel (`/import-expense-excel`).
- **3 niveles de aprobación** en `_calculate_approval_level()`:
  - `< 100€` → `auto`
  - `100-500€` → `manager`
  - `≥ 500€` → `director`
  - Umbrales como constantes `APPROVAL_THRESHOLD_AUTO` y `APPROVAL_THRESHOLD_MANAGER` (futura fase los migrará a tabla `settings` editable).
- Nuevo helper `_approval_reason(amount, level)` que genera una descripción humana ("Importe 150.00€ entre 100€ y 500€ — requiere manager") para mostrar en la UI.
- `_ROLE_CAN_APPROVE` ampliado con roles `manager` y `director` (de momento solo `admin` los usa en DB, pero la matriz queda lista).
- `approve_receipt` endpoint:
  - Ahora acepta `current_user` opcional vía JWT (dependencia `get_current_user_optional`). Cuando hay usuario autenticado, se graba `receipt.approved_by = current_user.id` para trazabilidad real.
  - `X-User-Role` header sigue funcionando como fallback.
  - Rol efectivo = rol del JWT si existe, si no el del header.
  - Si había `Match`, el recibo queda `"matched"`; si no, `"approved"` (nuevo estado para auto-aprobados sin conciliación bancaria).
- `list_receipts` y `get_receipt` ahora usan `joinedload(Receipt.approver)` para que `approver_name` se popule en la respuesta sin N+1.

**`backend/app/models/models.py`**
- Nueva propiedad `Receipt.approval_reason` — genera el texto de motivo a partir de `approval_level` + `amount`. Expuesto vía Pydantic `from_attributes`.

**`backend/app/schemas/schemas.py`**
- `ReceiptOut.approval_reason: Optional[str]`.

**`backend/app/routes/analytics.py`**
- `/analytics/approval-summary` ahora devuelve tres contadores: `pending_auto`, `pending_manager`, `pending_director`, además de `pending_admin` (legacy = manager + director + filas antiguas con nivel "admin") para compatibilidad con frontend no actualizado.

### Frontend

**`frontend/src/types/index.ts`**
- `Receipt.approval_reason: string | null` añadido.
- `ApprovalSummary` ampliado con `pending_manager` y `pending_director`.
- `APPROVAL_LEVEL_CONFIG` con 3 niveles distintos + bucket `admin` legacy.
- `STATUS_CONFIG` incluye nuevo estado `"approved"` (badge verde).

**`frontend/src/app/approvals/page.tsx`**
- 4 KPIs: auto, manager, director, aprobados hoy (antes eran 3 agrupados).
- Filtro nivel ampliado: auto / manager / director / admin (legacy).
- Pill de nivel con tooltip mostrando `approval_reason` cuando existe.

**`frontend/src/components/receipt-detail-modal.tsx`**
- Distinción visual entre aprobado automáticamente y aprobado por persona:
  - Con `approver_name` → "Aprobado por {nombre} el {fecha}"
  - Sin `approver_name` → "Aprobado automaticamente el {fecha}"
- Muestra `approval_reason` bajo la pill cuando el recibo está pending.

**`frontend/src/app/receipts/page.tsx`**
- Nueva pestaña `Aprobado` entre Pendiente y Conciliado.

## Fuera del alcance de este sprint

- Página `/settings` con umbrales editables desde UI: bloqueado hasta migración que cree tabla `settings`. Se trata como **Sprint 1 fase B** (siguiente PR).
- Sprint 2+: ver documento de auditoría.

## Cómo verificar localmente

1. Subir un recibo mock con importe < 100€: tras OCR debe aparecer con estado **Aprobado** (verde) en `/receipts`, sin pasar por la cola de aprobaciones.
2. Subir un recibo con importe entre 100-500€: queda en **Pendiente** con pill "Manager (100-500€)".
3. Subir un recibo con importe ≥ 500€: queda en **Pendiente** con pill "Director (≥500€)".
4. En `/approvals`, los 4 KPIs arriba deben diferenciar correctamente los buckets.
5. Al aprobar manualmente un recibo estando logado (no DEV_MODE), el modal detalle debe mostrar "Aprobado por {tu nombre} el ...".
6. Al auto-aprobar, el modal debe mostrar "Aprobado automaticamente el ...".

## Archivos modificados

```
backend/app/core/auth.py
backend/app/models/models.py
backend/app/routes/analytics.py
backend/app/routes/receipts.py
backend/app/schemas/schemas.py
frontend/src/app/approvals/page.tsx
frontend/src/app/receipts/page.tsx
frontend/src/components/receipt-detail-modal.tsx
frontend/src/types/index.ts
CAMBIOS_RAMA_FEAT_SPRINT1.md   (este archivo)
```

## Consideraciones para el revisor

- El nuevo estado `"approved"` es distinto de `"matched"` a propósito: `approved` = aprobado sin match bancario (p.ej. café en efectivo); `matched` = aprobado + match con transacción. Ambos se consideran "cerrados" en los filtros y KPIs.
- Los recibos históricos con `approval_level="admin"` (pre-Sprint1) siguen funcionando: la matriz los trata como el bucket manager/director y la pill los muestra como "Admin (legacy)".
- Si `OCR_PROVIDER=mock` genera importes aleatorios, al seedear nuevos recibos deberían aparecer los 3 niveles mezclados. Útil para demo.
- **No se modifican migraciones Alembic** en este sprint — los campos `approval_level`, `approved_by`, `approved_at` ya existían desde Fase C.

---

**Siguiente PR esperado**: fase B de Sprint 1 — migración Alembic 0006 para tabla `settings`, endpoint `GET/PUT /settings/approval-thresholds`, y página admin `/settings`. Lo abriré tras merge de este.
