# Handoff Fase D — Para Marcos

> Resumen del estado actual y lo necesario para continuar con la Fase D.
> Fecha: 26 marzo 2026

---

## Estado actual del proyecto

### Fases completadas

| Fase | Descripcion |
|------|-------------|
| 1 | Backend completo: 14+ endpoints, OCR mock, reconciliacion fuzzy, anomaly detection |
| A | Frontend Next.js 14 + TypeScript + Tailwind + Recharts (6 paginas) |
| B | Claude Vision OCR, AI anomaly detection, approve/reject, edicion inline, export CSV, severity badges |
| C | **Workflow aprobacion multinivel**, dashboard enriquecido, selector de rol |

### Lo nuevo en Fase C (tu punto de partida)

1. **Workflow aprobacion multinivel**:
   - `auto` (<100 EUR) — cualquier rol aprueba
   - `manager` (100-500 EUR) — solo gerente o director
   - `director` (>500 EUR) — solo director
   - Validacion via header `X-User-Role` en backend

2. **Selector de rol** en el header (Empleado / Gerente / Director):
   - React context en `frontend/src/lib/role-context.tsx`
   - Se inyecta como header en todas las API calls (`frontend/src/lib/api.ts`)

3. **Pagina /approvals**:
   - KPIs por nivel, cola filtrable, aprobacion batch, botones role-gated

4. **Dashboard enriquecido**:
   - AreaChart tendencia mensual (6 meses)
   - Grid empleados con barra gasto vs presupuesto
   - Panel resumen aprobaciones pendientes

5. **Nuevos endpoints backend**:
   - `GET /analytics/approval-summary` — conteos por nivel
   - `GET /analytics/monthly-trend` — gasto mensual con meses en espanol
   - `POST /receipts/{id}/approve` — ahora valida rol via `X-User-Role`

6. **Migracion Alembic 0003**: campos `approval_level`, `approved_by`, `approved_at` en receipts

---

## Fase D — Que hay que hacer

### D1: Import CSV bancario
- Endpoint `POST /transactions/import-csv` que reciba un archivo CSV
- Parser que detecte el formato del banco y extraiga: fecha, comercio, importe, moneda
- Crear transacciones bancarias a partir del CSV

### D2: Prediccion presupuesto con IA
- Endpoint que analice historico de gastos por empleado/departamento
- Usar Claude para generar forecast del proximo mes
- Mostrar prediccion en el dashboard o perfil del empleado

### D3: UI drag-and-drop para CSV
- Componente de upload con zona drag-and-drop en la pagina de transacciones
- Preview de las filas antes de confirmar importacion
- Feedback visual del progreso

---

## PREGUNTAS PARA EL CLIENTE (antes de implementar)

Estas preguntas son **criticas** para no perder tiempo implementando parsers que no se van a usar:

### 1. Banco principal
> Con que banco trabaja la empresa? (BBVA, Santander, CaixaBank, Sabadell, otro?)
>
> Necesitamos saber el formato exacto del CSV que exportan desde su banca online para crear el parser correcto.

### 2. Formato del extracto
> Puede compartir un CSV de ejemplo (con datos ficticios o anonimizados)?
>
> Cada banco tiene columnas y formatos de fecha diferentes. Un ejemplo real nos ahorra dias de trabajo.

### 3. Moneda
> Trabajan solo en EUR o tambien manejan otras monedas?

### 4. Periodo de datos
> Cada cuanto importarian extractos? (diario, semanal, mensual?)
> Esto afecta si necesitamos deteccion de duplicados en la importacion.

### 5. Presupuestos
> Los presupuestos mensuales por empleado son fijos o varian?
> Esto afecta la prediccion IA — necesitamos saber si hay un budget real contra el que comparar.

---

## Como arrancar

```bash
git pull origin main
./start.sh
python demo_data_loader.py   # para sembrar datos demo con approval_level
```

Abre http://localhost:3000 y prueba:
- Cambiar de rol en el header (Director/Gerente/Empleado)
- Ir a /approvals y ver como cambian los permisos
- Dashboard con tendencia mensual y panel aprobaciones

---

## Archivos clave para Fase D

| Archivo | Para que |
|---------|----------|
| `backend/app/routes/transactions.py` | Aqui va el endpoint de import CSV |
| `backend/app/models/models.py` | Modelo BankTransaction (ya existe) |
| `frontend/src/app/transactions/page.tsx` | Aqui va el drag-and-drop |
| `backend/app/services/ai_anomaly.py` | Referencia para integracion IA (prediccion) |
| `demo_data_loader.py` | Actualizar con datos de ejemplo del banco real |

---

## Nota importante

El build del frontend debe pasar siempre antes de pushear:
```bash
cd frontend && npx next build
```

Si tienes dudas, abre Claude Code en la carpeta del proyecto — leera CLAUDE.md automaticamente y tendra todo el contexto.
