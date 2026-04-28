# Sprint 4 — Alertas accionables y batch approve inteligente

Rama: `feat/sprint4-alertas-accionables`
Base: `feat/sprint3-obra-proyecto-iva` (stack PR — depende del merge de Sprint 3 a `main` antes de mergear este)
Referencia: sección 5 del `AUDITORIA_PLAN_MEJORA_2026-04-17.md`, sprint 4

## Qué resuelve este PR

Dos problemas de la auditoría que la admin de Lezama encontraría en su día a día:

1. **Las alertas no son accionables** — describen el problema pero no qué hacer. La admin ve "duplicado detectado" pero no sabe si llamar al empleado, borrar uno de los dos recibos, o marcar como resuelta. Resultado: las alertas se acumulan sin resolverse.
2. **El batch approve es manual y ciego** — había que clicar uno a uno los checkboxes incluso cuando todos los recibos eran <100€ y no tenían alertas. La auto-aprobación de Sprint 1 cubre el OCR fresh, pero no el backlog ni los que llegan con `status=review` por anomalía OCR.

## Cambios incluidos

### Backend

1. **Migración Alembic 0009** — `add_alert_suggested_action.py`. Añade `suggested_action TEXT NULL` en `alerts`. Encadena con la 0008 (Sprint 3). No rompe alertas previas: el campo es nullable y el FE simplemente no renderiza la línea italic cuando viene vacío.

2. **`Alert` model y `AlertOut` schema** (`backend/app/models/models.py`, `backend/app/schemas/schemas.py`). Nuevo campo `suggested_action: Optional[str] = None`.

3. **`ai_anomaly_scan` ampliado** (`backend/app/routes/alerts.py:64-73`). Se pasa `suggested_action=a.get("suggested_action")` al constructor de `Alert`. El prompt de Claude (`backend/app/services/ai_anomaly.py`) se ha extendido: pide que cada anomalía incluya un `suggested_action` en español con el verbo en infinitivo, mencionando al empleado por nombre cuando aplique. Ejemplos en el prompt: *"Verificar con María si es un gasto duplicado..."*, *"Revisar política de gastos y contactar a Juan Pérez"*.

4. **`budget_alert_scan` con suggested_action programática** (`alerts.py:104-113,135`).
   - Severidad `high` (presupuesto superado): `Contactar a {nombre} — presupuesto del mes superado en X%`.
   - Severidad `medium` (≥80% del presupuesto): `Revisar gasto de {nombre} antes de fin de mes (X% del presupuesto)`.

5. **Orden por severidad real en `GET /alerts`** (`alerts.py:140-164`). PostgreSQL ordena strings alfabéticamente, lo que pone `low` antes que `high`. Se reemplaza el `order_by(Alert.created_at.desc())` por una expresión `case` explícita: `critical → 0, high → 1, medium → 2, low → 3, otros → 4`, seguida del fallback `created_at desc`. Las alertas urgentes ahora aparecen siempre arriba.

6. **Nuevo endpoint `GET /api/v1/approvals/auto-ready`** (`backend/app/routes/approvals.py`, registrado en `main.py`). Devuelve `{count, total_amount_eur, receipt_ids}` para los recibos que cumplen las 3 condiciones:
   - `approval_level == "auto"` (importe <100€ por defecto, o el umbral configurado en `/settings`).
   - `status` ∈ {`pending`, `review`, `flagged`}.
   - Sin `Alert` no resuelta apuntando a su `receipt_id`.
   
   Implementado con subquery `NOT IN`. Maneja el caso `Alert.receipt_id IS NULL` (alertas globales como `budget_exceeded` no bloquean recibos individuales).

### Frontend

7. **`Alert` interface y nueva `AutoReady` interface** (`frontend/src/types/index.ts`). `suggested_action?: string | null` añadido. `AutoReady` con `count`, `total_amount_eur`, `receipt_ids`.

8. **`/alerts` página** (`alerts/page.tsx`):
   - Render de `suggested_action` debajo de la descripción cuando está presente: *"→ Verificar con María..."* en italic gris.
   - Background **`bg-red-50` con `border-red-300`** cuando `severity ∈ {high, critical}` independientemente del `alert_type`. Las urgentes destacan visualmente sobre el resto.
   - El orden por severidad ya viene del backend, así que el FE no toca lógica de sort.

9. **`/approvals` página** (`approvals/page.tsx`):
   - **Banner verde Auto-ready** entre KPIs y la tabla, visible cuando `count > 0`. Muestra: *"N recibos listos para aprobar · Importe total Y€ · Auto-aprobables sin alertas asociadas"* + botón **Aprobar todos** que ejecuta `batchApprove(approvable_ids)` filtrando por rol que pueda aprobar.
   - **Tabs primarios** sustituyen a los selects: `Sin riesgo` (default, filtra a `auto_ready.receipt_ids`) · `Requieren revisión` (complemento) · `Todos`. Cada tab muestra contador.
   - **Smart preselect** en primer load: si hay auto-ready aprobables por el rol actual, se marcan los checkboxes automáticamente. La admin sólo tiene que clicar "Aprobar N". Idempotente: usa flag `didPreselect` para no sobrescribir selección manual posterior.
   - Los **selects de filtros legacy** (nivel, estado) se conservan bajo un acordeón "Filtros avanzados" plegado por defecto, para no romper UX a quien ya los conoce.

## Stack PR — dependencia con Sprint 3

Esta rama parte de `feat/sprint3-obra-proyecto-iva`, no de `main`. Razón: la migración 0009 encadena con la 0008 (`down_revision = "0008"`) introducida en Sprint 3, y los esquemas de Sprint 3 (`AlertOut` heredado, `ProjectOut` para la columna obra del query de receipts list) están en esa rama.

**Orden de merge correcto:**

1. PR Sprint 3 → `main`
2. Tras merge, rebase de esta rama: `git rebase main` desde `feat/sprint4-alertas-accionables`
3. Abrir PR Sprint 4 → `main`

No abrir el PR de Sprint 4 hasta que Sprint 3 esté mergeado: evita confusión en la cola de Alejandro y conflictos de migration ordering.

## Verificación local (sin Docker)

```bash
# Backend syntax
python3 -c "import ast; [ast.parse(open(f).read()) for f in [\
  'backend/app/routes/alerts.py', \
  'backend/app/routes/approvals.py', \
  'backend/app/services/ai_anomaly.py', \
  'backend/app/models/models.py', \
  'backend/app/schemas/schemas.py', \
  'backend/app/main.py']]"
# → exit 0

# Frontend types
cd frontend && ./node_modules/.bin/tsc --noEmit
# → exit 0
```

## Verificación manual (con stack arriba)

- [ ] `POST /alerts/ai-scan` (con `ANTHROPIC_API_KEY` configurada): las alertas creadas tienen `suggested_action` no nulo en español.
- [ ] `POST /alerts/budget-scan` con un empleado al 110% de presupuesto: alerta creada con `suggested_action = "Contactar a {nombre} — presupuesto del mes superado en 10%"`.
- [ ] `GET /alerts?resolved=false`: las `critical`/`high` aparecen primero, luego `medium`, luego `low`. Dentro de cada bucket, ordenado por fecha desc.
- [ ] `/alerts` UI: cards `high` con fondo rojo claro, `medium`/`low` con su color de alert_type. Línea italic gris bajo la descripción cuando hay `suggested_action`.
- [ ] `GET /approvals/auto-ready` (con seed cargado): devuelve `count > 0`, importe coherente con suma de amounts de los `receipt_ids` listados.
- [ ] `/approvals` UI: banner verde aparece arriba con N + Y €. Click "Aprobar todos" aprueba los que el rol actual puede, banner desaparece tras `load()`.
- [ ] Tab "Sin riesgo" muestra exactamente los `auto_ready.receipt_ids`. Tab "Requieren revisión" muestra el resto. Tab "Todos" muestra ambos. Contadores cuadran.
- [ ] Filtros avanzados plegados por defecto. Al expandir y cambiar `levelFilter`, se acumula sobre el tab activo.
- [ ] Smart preselect: en primer load del tab "Sin riesgo", los checkboxes de `auto_ready.receipt_ids` aparecen marcados.

## Fuera de alcance

- **Endpoint batch approve atómico** — el FE sigue haciendo loop `POST /receipts/{id}/approve`. Para 50 recibos esto son 50 requests; aceptable para la demo (Lezama tendrá <50 pendientes/quincena).
- **`suggested_action` editable** desde el modal de detalle. Solo lectura en este PR.
- **Migración con backfill** — no rellenamos retroactivamente las alertas existentes con `suggested_action`. Las viejas se muestran sin la línea italic, las nuevas la tendrán.
- **Severidad enum en DB** — sigue siendo string para no añadir más complejidad. Si hace falta, refactor en otro PR.

## Archivos tocados

| Tipo | Ruta |
|---|---|
| Nuevo | `backend/migrations/versions/0009_add_alert_suggested_action.py` |
| Nuevo | `backend/app/routes/approvals.py` |
| Modificado | `backend/app/main.py` (registra approvals router) |
| Modificado | `backend/app/models/models.py` (Alert.suggested_action) |
| Modificado | `backend/app/schemas/schemas.py` (AlertOut, AutoReadyOut) |
| Modificado | `backend/app/services/ai_anomaly.py` (prompt) |
| Modificado | `backend/app/routes/alerts.py` (suggested_action en 2 endpoints + sort severity) |
| Modificado | `frontend/src/types/index.ts` (Alert.suggested_action, AutoReady) |
| Modificado | `frontend/src/app/alerts/page.tsx` (render suggested_action + bg condicional) |
| Modificado | `frontend/src/app/approvals/page.tsx` (banner + tabs + smart preselect) |
| Nuevo | `CAMBIOS_RAMA_FEAT_SPRINT4.md` |
