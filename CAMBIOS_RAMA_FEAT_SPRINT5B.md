# Sprint 5B — Export CSV preliminar para SAP + campo NIF

> Documento humano de la rama `feat/sprint5b-export-sap-csv` para Alejandro y Marcos.

## Por qué este cambio

Lezama necesita poder importar los gastos aprobados en SAP. Hoy contabilidad lo hace manualmente desde un Excel; el objetivo es producir un CSV en el formato que SAP espera para que la admin pueda probar el flujo end-to-end. Sin embargo, **3 piezas siguen pendientes de Lezama** (preguntas 1, 2, 3 y 16 del audit doc): el mapeo de centro de coste y cuenta contable, los NIF reales de los empleados, y la confirmación del orden exacto de columnas.

Sprint 5B entrega lo que se puede entregar sin esas respuestas: la infraestructura completa (schema + endpoint + UI), con placeholders vacíos en los campos pendientes. Cuando Lezama responda, completar es trivial — sólo poblar los datos.

## Qué se ha cambiado

### Migración Alembic — `backend/migrations/versions/0010_add_employee_nif.py`

```sql
ALTER TABLE employees ADD COLUMN nif VARCHAR(20) NULL;
```

Nullable para no romper empleados existentes. Sin index todavía (se añadirá cuando haya volumen de datos reales).

### Modelo — `backend/app/models/models.py:32`

Añadido `nif = Column(String(20))` al modelo `Employee`.

### Schemas Pydantic — `backend/app/schemas/schemas.py`

`EmployeeCreate`, `EmployeeUpdate`, `EmployeeOut`, `EmployeeDetailOut` ahora aceptan/devuelven `nif: Optional[str]`.

### Backend — nuevo endpoint `GET /api/v1/receipts/export/csv-sap`

En `backend/app/routes/receipts.py`. Devuelve CSV con BOM UTF-8 y separador `;` (estándar Excel español).

Columnas en este orden (audit doc línea 193):

| # | Columna | Origen | Notas |
|---|---|---|---|
| 1 | Fecha | `receipt.date` | Formato dd/mm/yyyy |
| 2 | NIF empleado | `employee.nif` | Vacío hasta que Lezama dé los NIF (Q16) |
| 3 | Obra | `project.code` | Sprint 3 |
| 4 | Comercio | `receipt.merchant` | |
| 5 | Base imponible | `receipt.tax_base` | Decimales con coma (formato ES) |
| 6 | Tipo IVA | `receipt.tax_rate` | |
| 7 | Cuota IVA | `receipt.tax_amount` | |
| 8 | Total | `receipt.amount` | |
| 9 | Categoría | `receipt.category` | |
| 10 | Estado | `receipt.status` | |
| 11 | Aprobado por | `receipt.approver_name` (property) | |
| 12 | Centro de coste | **vacío** | Pendiente Lezama (Q1) |
| 13 | Cuenta contable | **vacío** | Pendiente Lezama (Q1) |

Reusa los mismos filtros del endpoint `/export/csv` existente (status, employee_id, category, project_id, date range, search). El endpoint `/export/csv` original queda **sin cambios** — sigue siendo el export genérico para análisis interno.

### Backend — `bulk-import` empleados acepta NIF

En `backend/app/routes/employees.py`, el endpoint `POST /employees/bulk-import` ahora lee la columna `nif` del CSV (opcional, se normaliza a uppercase). La plantilla actualizada en frontend incluye la columna.

### Frontend

- **`frontend/src/types/index.ts`** — `Employee.nif: string | null` añadido.
- **`frontend/src/app/employees/page.tsx`** — `AddEmployeeModal` tiene nuevo input "NIF (para export SAP)" con max 20 chars y auto-uppercase. Plantilla CSV de bulk-import actualizada con la columna.
- **`frontend/src/app/receipts/page.tsx`** — nuevo botón **"Exportar SAP"** (azul, sólo visible para admin/manager/director, no para empleado normal) junto al botón "Exportar CSV" existente. Llama al nuevo endpoint con los mismos filtros activos.

## Cómo probarlo

1. `docker compose up -d --build` y aplicar migraciones: `docker compose exec backend alembic upgrade head` (verificar que sube hasta `0010`).
2. `python3 demo_data_loader.py` (los empleados existentes saldrán con NIF=null).
3. Como admin, ir a `/employees` → "Nuevo empleado" → rellenar NIF (ej. `12345678A`) → guardar.
4. Como admin, ir a `/receipts` → click en **"Exportar SAP"** → descarga `sap_gastos_YYYYMMDD.csv`.
5. Abrir el CSV en Excel (o LibreOffice) → verificar:
   - 13 columnas en el orden esperado, headers en español.
   - Acentos correctos (BOM UTF-8 + separador `;`).
   - Decimales con coma (1234,56 no 1234.56).
   - Centro de coste y Cuenta contable vacíos en todas las filas.
   - NIF vacío salvo el del empleado que añadiste arriba.
6. Como empleado normal: el botón "Exportar SAP" no aparece (sólo "Exportar CSV").

## Verificación técnica

- `npx tsc --noEmit` en frontend → limpio.
- Sintaxis Python OK en los 4 archivos modificados + migración nueva.

## Lo que NO incluye

- Mapeo de centro de coste por empleado/recibo (Q1 abierta).
- Integración API directa con SAP (Q2 abierta — depende de qué interfaz tenga su SAP).
- Importación de NIFs reales en bulk (esperando que Lezama nos pase un Excel con los empleados).
- Libro IVA exportable para gestoría (Q11 abierta).

## Para Alejandro (revisión)

- Migración `0010_add_employee_nif.py`: nullable=True confirmado, sin index. ¿Te parece bien sin index? Vamos a tener máx 160 empleados, no merece la pena.
- `backend/app/routes/receipts.py:147-227` — endpoint nuevo. Verificar que los joinedloads (`employee`, `project`, `approver`) no causan N+1 y que el filtro replica exactamente el de `/export/csv`.
- Decisión de UX: el botón "Exportar SAP" sólo se muestra a no-empleados. ¿Estás de acuerdo? La alternativa era mostrar siempre y restringir en backend, pero parece innecesario duplicar checks.
