# Sprint 6 — Obras: Detalle y Presupuesto

**Rama:** `feat/sprint6-obras-detalle`  
**Fecha:** 2026-04-28  
**Desarrollador:** Marcos

---

## Qué se ha cambiado y por qué

### Motivación

La sección de Obras estaba poco desarrollada: solo mostraba una tabla con código, nombre y estado.  
No había forma de ver cuánto se gastaba en cada obra, ni compararlo con un presupuesto asignado.

El objetivo de este sprint es dar a la administración visibilidad real sobre el estado económico de cada obra.

---

## Cambios por capa

### Base de datos

**`backend/migrations/versions/0011_add_project_budget.py`** (nueva migración)
- Añade columna `budget NUMERIC(12,2) NULL` a la tabla `projects`
- Nullable: las obras existentes no se bloquean. Sin presupuesto → la barra de progreso no se renderiza
- `revision = "0011"`, `down_revision = "0010"`

### Backend — Modelos y Schemas

**`backend/app/models/models.py`**
- `Project` model: añadida columna `budget = Column(Numeric(12, 2))`

**`backend/app/schemas/schemas.py`**
- `ProjectCreate`: añadido `budget: Optional[float] = None`
- `ProjectUpdate`: añadido `budget: Optional[float] = None`
- `ProjectOut`: añadido `budget: Optional[float] = None`
- `SpendingByProjectOut`: añadido `budget: Optional[float] = None`
- Nuevos schemas:
  - `ProjectCategoryBreakdown` — categoría + importe + nº recibos
  - `ProjectDetailOut` — KPIs completos de una obra (total_spending, receipt_count, approved_count, pending_count, utilization_pct, category_breakdown)

### Backend — Endpoints

**`backend/app/routes/analytics.py`**

1. **`GET /analytics/spending-by-project`** (modificado)
   - Ahora incluye `budget` en la consulta y en la respuesta
   - Útil para que el dashboard pinte barras con color por utilización

2. **`GET /analytics/projects/{project_id}`** (nuevo)
   - Devuelve KPIs completos de una obra:
     - `total_spending`, `receipt_count`, `approved_count`, `pending_count`
     - `utilization_pct` (% gasto / presupuesto, null si sin presupuesto)
     - `category_breakdown` — lista ordenada por importe descendente

### Frontend — Tipos

**`frontend/src/types/index.ts`**
- `Project`: añadido `budget: number | null`
- `SpendingByProject`: añadido `budget: number | null`
- Nuevos interfaces: `ProjectCategoryBreakdown`, `ProjectDetail`

### Frontend — Página `/projects` (lista)

**`frontend/src/app/projects/page.tsx`** (reescrito)

- Formulario de creación/edición: nuevo campo **Presupuesto (€)** (4ª columna en el grid)
- Tabla ampliada:
  - Columna **Gasto / Presupuesto**: importe gastado + barra de progreso coloreada
    - Verde (<80%), Naranja (80–100%), Rojo (≥100%), Gris (sin presupuesto)
  - Columna **Recibos**: conteo directo desde spending API
  - Nombre de la obra es enlace clicable a la página de detalle
  - Nuevo botón de acción: icono `ExternalLink` → navega a `/projects/[id]`
- Carga paralela de `/projects` y `/analytics/spending-by-project`

### Frontend — Página `/projects/[id]` (nueva)

**`frontend/src/app/projects/[id]/page.tsx`** (nueva página)

Estructura:
1. **Header** — código de obra (badge monospace) + nombre + descripción, botón volver
2. **Barra presupuestaria** — solo si tiene presupuesto asignado; coloreada por % ejecutado
3. **KPIs** — Gasto total · Recibos · Aprobados · Pendientes (con badge ámbar si hay pendientes)
4. **Donut de categorías** — gráfico circular + leyenda de importes
5. **Desglose por categoría** — barras de porcentaje por categoría
6. **Tabla de recibos** — todos los recibos de la obra, clicables (abre `ReceiptDetailModal`)

### Frontend — Dashboard

**`frontend/src/app/page.tsx`** (modificado)

- Chart "Gasto por Obra": las barras ahora se colorean por utilización presupuestaria
  - Sin presupuesto → indigo (comportamiento anterior)
  - <80% → verde
  - 80–100% → naranja
  - ≥100% → rojo
- Tooltip enriquecido: muestra importe gastado + presupuesto si lo tiene
- Click en barra navega a `/projects/[id]` (antes iba a `/receipts?project_id=`)

---

## Cómo aplicar en producción

```bash
# 1. Aplicar la migración
docker exec -it expensiq-backend alembic upgrade head

# 2. Verificar que la columna existe
docker exec -it expensiq-db psql -U postgres -d expensiq -c "\d projects"
```

No hay datos de seed que actualizar — `budget` es nullable y por defecto NULL.

---

## Build verificado

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (15/15)

/projects        ○  static
/projects/[id]   ƒ  dynamic (server-rendered on demand)
```
