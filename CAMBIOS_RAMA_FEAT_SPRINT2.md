# Sprint 2 — "Acción Hoy" y reconciliación visible

Rama: `feat/sprint2-accion-hoy-y-reconciliacion`
Base: `main`
Referencia: sección 5 y hallazgos C4/C5 de `AUDITORIA_PLAN_MEJORA_2026-04-17.md`

## Qué resuelve este PR

La admin de Lezama, al abrir el dashboard, no ve en 2 segundos qué tiene que hacer hoy. Además la auditoría flageó dos puntos críticos:

- **C4** — el PDF quincenal existía pero no tenía enlace visible desde el dashboard admin.
- **C5** — la tabla `/transactions` no mostraba el estado de conciliación, el flujo era opaco.

## Cambios incluidos

### Backend

1. **`GET /analytics/action-today`** (nuevo endpoint consolidado).
   - Un único endpoint devuelve los 4 contadores del banner "Acción Hoy":
     - `receipts_pending_approval`: recibos en estados `pending`/`review`/`flagged` con `approval_level` ∈ {manager, director, admin}.
     - `transactions_unmatched`: transacciones bancarias sin `Match` asociado.
     - `period_pending_employees`: contextual al estado del periodo:
       - Si `period.status == "open"` → empleados activos sin recibos en la quincena (`period_pending_label = "sin enviar recibos"`).
       - Si `period.status == "closed"` → empleados sin revisar (`review_status` ∉ {approved, flagged}, label = `"sin revisar"`).
       - Si no hay periodo → 0 y label vacío.
     - `alerts_urgent`: alertas activas con severity ∈ {high, critical}.
   - Evita 4 fetches separados en el frontend y centraliza la lógica "qué es urgente".

2. **`TransactionOut` enriquecido con match_status**
   - Nuevos campos: `match_status` (`matched` | `low_confidence` | `unmatched`), `match_confidence`, `matched_receipt_id`.
   - `GET /transactions` hace un batch-fetch de `Match` por `transaction_id` (evita N+1), coge el de mayor confidence, clasifica:
     - `confidence >= 0.6` → `matched`.
     - `confidence < 0.6` → `low_confidence`.
     - Sin match → `unmatched`.
   - Soporte opcional de filtro: `GET /transactions?match_status=unmatched|matched|low_confidence`.

3. **Nuevo schema `ActionTodayOut`** en `schemas.py`.

No hay migración Alembic nueva: sólo campos computados en schemas, sin cambios en la base de datos.

### Frontend

1. **`AccionHoyBanner`** (`components/accion-hoy-banner.tsx`, nuevo).
   - Grid de 4 tiles clicables en lo alto del dashboard admin.
   - Tonos semánticos: indigo (aprobaciones), amber (conciliación), purple (periodo), red (alertas).
   - Si un contador es 0, muestra check verde y número apagado (estado "tranquilo").
   - La tarjeta de periodo se oculta si no hay periodo vigente.
   - Cada tile navega al destino correspondiente:
     - `X recibos por aprobar` → `/approvals`.
     - `Y transacciones sin recibo` → `/transactions?filter=unmatched`.
     - `Z empleados {label}` → `/periods`.
     - `W alertas urgentes` → `/alerts?severity=high`.

2. **Dashboard admin reorganizado** (`app/page.tsx`).
   - Nuevo orden (prioridad arriba → detalle abajo):
     1. `AccionHoyBanner` (lo más importante).
     2. KPIs globales (sin cambios).
     3. Progreso de conciliación (sin cambios).
     4. **`PeriodSummaryCard`** (nuevo): rango de quincena + estado (abierta/cerrada) + botón "Informe PDF". Deshabilitado con mensaje "PDF (al cerrar)" si la quincena está abierta. Resuelve **C4**.
     5. Tendencia mensual + Alertas recientes.
     6. **Acordeón "Análisis detallado"** (plegado por defecto; estado persistido en `localStorage` con clave `expensiq.dashboardAnalyticsOpen`). Dentro: Top Gastadores + Por Categoría, panel Aprobaciones, Grid Empleados, Comparativa Departamentos.
   - Motivo: la auditoría pedía bajar al acordeón la información secundaria (análisis detallado) para que "qué hay que hacer hoy" sea lo primero visible sin scroll.

3. **`/transactions` — match_status visible (resuelve C5)** (`app/transactions/page.tsx`).
   - Tabs arriba de la tabla: `Todas` / `Conciliadas` / `Sin conciliar` / `Baja confianza` con contadores.
   - Nueva columna "Estado" con badges:
     - 🟢 **Conciliada** (+ confidence como `%`) — tooltip "Conciliada con N% de confianza".
     - 🟡 **Baja confianza** (+ %) — tooltip "Posible match con N% de confianza (<60%)".
     - ⚫ **Sin conciliar** — tooltip "Sin recibo asociado".
   - Lee `?filter=unmatched` de la URL al llegar desde el banner y aplica el tab automáticamente.

4. **Tipos TypeScript** (`types/index.ts`).
   - `Transaction` extendido con `match_status`, `match_confidence`, `matched_receipt_id`.
   - Nueva `ActionToday` alineada con `ActionTodayOut` del backend.

## Fuera de alcance

- Responsive móvil profundo del banner — usa `grid-cols-2 lg:grid-cols-4`, suficiente para tablet/desktop.
- Refactor semántico del panel "Aprobaciones" — se mantiene pero baja al acordeón (redundante con el tile del banner). Sprint 4 lo revisará.
- Preguntas abiertas de la sección 7 de la auditoría (16 decisiones pendientes de Lezama). Ninguna tarea de Sprint 2 depende de esas respuestas.

## Verificación local

Backend:

```bash
python3 -c "import ast; [ast.parse(open(f).read()) for f in ['backend/app/routes/analytics.py','backend/app/routes/transactions.py','backend/app/schemas/schemas.py']]"
# → exit 0
```

Frontend:

```bash
cd frontend && node_modules/.bin/tsc --noEmit
# → exit 0, sin errores
```

Manual (requiere stack arriba con `./start.sh`):

- [ ] Abrir `http://localhost:3000` como admin. El `AccionHoyBanner` aparece con 4 contadores y cuadran con los de `/analytics/summary`, `/analytics/approval-summary` y `/alerts`.
- [ ] Click en `X recibos por aprobar` → navega a `/approvals` con los pendientes visibles.
- [ ] Click en `Y transacciones sin recibo` → navega a `/transactions?filter=unmatched`; el tab "Sin conciliar" queda seleccionado.
- [ ] En `/transactions`, los badges por fila cuadran: recibos seed → "Conciliada"; las 4 txns huérfanas (`Tienda Desconocida`, `Transferencia Recibida`, `Retirada Cajero`, `Google Workspace`) → "Sin conciliar".
- [ ] Acordeón "Análisis detallado": plegado por defecto; al expandir y recargar, el estado persiste.
- [ ] `PeriodSummaryCard`: si la quincena está abierta, el botón PDF queda disabled con label "PDF (al cerrar)". Si está cerrada, descarga el archivo.

## Archivos tocados

| Tipo | Ruta |
|---|---|
| Modificado | `backend/app/routes/analytics.py` |
| Modificado | `backend/app/routes/transactions.py` |
| Modificado | `backend/app/schemas/schemas.py` |
| Modificado | `frontend/src/app/page.tsx` |
| Modificado | `frontend/src/app/transactions/page.tsx` |
| Modificado | `frontend/src/types/index.ts` |
| Nuevo | `frontend/src/components/accion-hoy-banner.tsx` |
| Nuevo | `CAMBIOS_RAMA_FEAT_SPRINT2.md` |

## Próximos pasos sugeridos (fuera de este PR)

- Sprint 3 del roadmap: detalles de la conciliación (modal lateral con texto libre, notas del admin).
- Resolver preguntas abiertas con Lezama (sección 7 de la auditoría).
