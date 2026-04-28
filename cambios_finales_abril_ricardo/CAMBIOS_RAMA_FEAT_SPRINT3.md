# Sprint 3 — Obra/proyecto y desglose IVA

Rama: `feat/sprint3-obra-proyecto-iva`
Base: `main`
Referencia: sección 5 y sección 7 (Q6, Q7, Q11, Q12) de `AUDITORIA_PLAN_MEJORA_2026-04-17.md`

## Qué resuelve este PR

Lezama gestiona hasta 4 obras simultáneas (demolición industrial). Los gastos deben imputarse a la obra correspondiente para que la admin sepa cuánto está costando cada proyecto. Además, la gestoría necesita el desglose IVA (base / tipo / cuota) de las facturas.

## Supuesto documentado

**Modelo 1:1** (1 recibo → 1 obra). Confirmado por Marcos el 2026-04-20: cada gasto pertenece a una obra y el desglose por tipo de gasto lo maneja la categoría ya existente. Si Lezama necesita split de obra en el futuro, se creará migración 0009 con join table `receipt_projects`.

**Código de obra libre.** Sin regex fijo — la admin escribe el código manualmente (p.ej. `OBR-2026-001`). OCR automático descartado hasta confirmar el formato con Lezama (Q6 de sección 7, aún abierta).

## Cambios incluidos

### Backend

1. **Migración 0007** (`backend/migrations/versions/0007_add_projects_table.py`).
   - Tabla `projects`: `id`, `code` (unique), `name`, `description`, `active`, `created_at`.
   - Columna `project_id` (nullable FK `SET NULL`) en `receipts`.
   - Nota: la auditoría hablaba de migraciones 0006/0007 para Sprint 3, pero Sprint 1b ya usó 0006. Se renumera a 0007/0008.

2. **Migración 0008** (`backend/migrations/versions/0008_add_tax_fields_receipts.py`).
   - Columnas `tax_base`, `tax_rate` (p.ej. 21.00), `tax_amount` en `receipts` (todas nullable).
   - El campo `tax` heredado de Fase 1 se mantiene para compatibilidad con datos seed.

3. **Modelo `Project`** (`backend/app/models/models.py`).
   - Clase ORM `Project` nueva.
   - `Receipt` extendido con `tax_base`, `tax_rate`, `tax_amount`, `project_id`.
   - Propiedades `project_code` y `project_name` en `Receipt` para que Pydantic las serialice via `from_attributes`.

4. **Schemas** (`backend/app/schemas/schemas.py`).
   - `ProjectCreate`, `ProjectUpdate`, `ProjectOut`.
   - `ReceiptOut` extendido con `tax_base`, `tax_rate`, `tax_amount`, `project_id`, `project_code`, `project_name`.
   - `ReceiptUpdate` extendido con los mismos campos + `project_id` (string UUID).
   - `SpendingByProjectOut` para el endpoint de analytics.

5. **Ruta `/api/v1/projects`** (`backend/app/routes/projects.py`, nuevo).
   - `GET /projects` — lista todas; `?active_only=true` para filtrar.
   - `POST /projects` — crea obra, valida unicidad de `code`.
   - `PATCH /projects/{id}` — edita nombre, descripción, activo.
   - `DELETE /projects/{id}` — soft-delete (marca `active=False`; los recibos referenciados no se pierden).

6. **Ruta `/api/v1/analytics/spending-by-project`** (`backend/app/routes/analytics.py`).
   - GROUP BY project, devuelve `total_spending` y `receipt_count` ordenado por gasto desc.
   - Solo obras activas.

7. **Receipts actualizados** (`backend/app/routes/receipts.py`).
   - `GET /receipts?project_id=` — filtro nuevo.
   - `joinedload(Receipt.project)` en list, get y update para evitar N+1.
   - `POST /receipts/upload` acepta `project_id` como campo de formulario opcional.
   - `PATCH /receipts/{id}` maneja `project_id` como UUID string (convierte + valida).
   - CSV export añade columnas: `obra`, `base_imponible`, `tipo_iva`, `cuota_iva`, `tax_legacy`.

### Frontend

1. **Tipos** (`frontend/src/types/index.ts`).
   - Interface `Project`.
   - `Receipt` extendido con `tax_base`, `tax_rate`, `tax_amount`, `project_id`, `project_code`, `project_name`.
   - Interface `SpendingByProject`.

2. **Página `/projects`** (`frontend/src/app/projects/page.tsx`, nueva).
   - Solo accesible a admin.
   - Tabla de obras con badges activa/inactiva.
   - Formulario inline alta + edición.
   - Botón activar/desactivar por fila.

3. **Sidebar** (`frontend/src/components/sidebar.tsx`).
   - Enlace "Obras" con icono `FolderKanban` en el nav admin, entre Quincenas y Ajustes.

4. **Upload recibo** (`frontend/src/app/receipts/page.tsx`).
   - Combobox "Obra (opcional)" en el formulario de subida (solo si hay obras activas).
   - Filtro por obra en los filtros avanzados.
   - Columna "Obra" en la tabla con badge `font-mono` indigo.
   - `project_id` enviado en el FormData del upload.

5. **Modal detalle recibo** (`frontend/src/components/receipt-detail-modal.tsx`).
   - Campo "Obra" editable (select de obras activas) en modo edición; display con code + name en modo lectura.
   - Sección "Desglose IVA": tabla 3 filas (Base / IVA % / Total) con edición inline de `tax_base`, `tax_rate`, `tax_amount`. Se muestra si alguno de los tres campos tiene valor o si se está editando.

6. **Dashboard — Gasto por obra** (`frontend/src/app/page.tsx`).
   - Fetch de `GET /analytics/spending-by-project` al cargar el admin dashboard.
   - `BarChart` horizontal dentro del acordeón "Análisis detallado" (antes de la comparativa por departamento).
   - Solo visible si hay obras con gasto > 0.
   - Clic en barra → navega a `/receipts?project_id=`.

## Fuera de alcance

- OCR automático para extraer código de obra del texto del recibo (pendiente Q6 — formato de códigos a confirmar con Lezama).
- Formato de export libro de IVA soportado (pendiente Q11).
- Distinción automática factura/ticket (pendiente Q12).
- Metadatos adicionales de obra: fechas inicio/fin, responsable, presupuesto (pendiente Q6 completa).

## Verificación local

Backend:

```bash
python3 -c "import ast; [ast.parse(open(f).read()) for f in [
  'backend/app/routes/projects.py',
  'backend/app/routes/receipts.py',
  'backend/app/routes/analytics.py',
  'backend/app/schemas/schemas.py',
  'backend/app/models/models.py',
  'backend/app/main.py',
]]"
# → exit 0
```

Frontend:

```bash
cd frontend && node_modules/.bin/tsc --noEmit
# → exit 0, sin errores
```

Manual (requiere stack arriba con `./start.sh` y `alembic upgrade head` dentro del backend):

- [ ] Ir a `/projects` → crear obra `OBR-2026-001 Demolición Bilbao Centro`.
- [ ] Subir un recibo en `/receipts` → seleccionar la obra en el combobox.
- [ ] Tabla `/receipts` muestra badge indigo `OBR-2026-001` en la columna Obra.
- [ ] Modal del recibo → modo edición → campo Obra muestra select; asignar a otra obra y guardar.
- [ ] Modal → sección "Desglose IVA" visible; editar `tax_base`, `tax_rate`, `tax_amount` y guardar.
- [ ] Filtro avanzado `?project_id=` en `/receipts` devuelve solo recibos de esa obra.
- [ ] Dashboard (acordeón "Análisis detallado") → sección "Gasto por Obra" aparece con barra para `OBR-2026-001`.
- [ ] Clic en la barra → navega a `/receipts?project_id=<uuid>`.
- [ ] Export CSV → columnas `obra`, `base_imponible`, `tipo_iva`, `cuota_iva` presentes.

## Archivos tocados

| Tipo | Ruta |
|---|---|
| Nuevo | `backend/migrations/versions/0007_add_projects_table.py` |
| Nuevo | `backend/migrations/versions/0008_add_tax_fields_receipts.py` |
| Modificado | `backend/app/models/models.py` |
| Modificado | `backend/app/schemas/schemas.py` |
| Nuevo | `backend/app/routes/projects.py` |
| Modificado | `backend/app/routes/receipts.py` |
| Modificado | `backend/app/routes/analytics.py` |
| Modificado | `backend/app/main.py` |
| Modificado | `frontend/src/types/index.ts` |
| Nuevo | `frontend/src/app/projects/page.tsx` |
| Modificado | `frontend/src/app/receipts/page.tsx` |
| Modificado | `frontend/src/components/receipt-detail-modal.tsx` |
| Modificado | `frontend/src/components/sidebar.tsx` |
| Modificado | `frontend/src/app/page.tsx` |
| Nuevo | `CAMBIOS_RAMA_FEAT_SPRINT3.md` |

## Próximos pasos (Sprint 4)

- Alertas accionables con `suggested_action` y batch approve inteligente.
- Resolver preguntas Q6, Q7, Q11, Q12 con Lezama antes de añadir OCR de obra y libro de IVA.
