# CLAUDE.md — ExpensIQ Demo

## Qué es este proyecto

**ExpensIQ** es una demo para cliente de un sistema de gestión de gastos con IA.
El equipo: Ricardo Pichardo (Edrai Solutions, propietario), Alejandro (técnico, revisor de PRs) y Marcos (desarrollador).

**Problema de negocio**: Una empleada recibe facturas físicas, las fotografía, las organiza en Excel y verifica manualmente contra extractos bancarios. ExpensIQ automatiza ese flujo completo: OCR → conciliación automática → alertas → aprobación.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Backend | Python 3.11 + FastAPI + SQLAlchemy |
| Base de datos | PostgreSQL 15 |
| Almacenamiento | MinIO (S3-compatible) |
| BI | Metabase |
| Frontend | Next.js 14 + TypeScript + Tailwind CSS + Recharts (en `frontend/`) |
| Frontend (legacy) | React 18 SPA (CDN) en `backend/dashboard.html` (deprecated, no editar) |
| Infraestructura | Docker Compose (5 servicios: db, minio, backend, frontend, metabase) |
| Proveedor OCR | Mock (demo) — Claude Vision en Fase B |
| Banco | Mock (demo) |

---

## Cómo arrancar el stack

```bash
# Primera vez: copiar variables de entorno
cp .env.example .env

# Arrancar todo (Colima como Docker runtime en Mac ARM64)
./start.sh

# O manualmente:
export LIMA_DATA_HOME="$HOME/.local/share"
colima start --arch aarch64 --vm-type vz --vz-rosetta --cpu 4 --memory 6
docker context use colima
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose up -d --build
```

**URLs:**
- Frontend (Next.js): http://localhost:3000
- Backend API / Legacy UI: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
- Metabase: http://localhost:3100

> **Marcos**: http://localhost:8000

---

## Frontend — Next.js 14

El frontend principal es una app Next.js 14 en `frontend/`. Reemplaza al antiguo SPA monolítico (`dashboard.html`).

### Desarrollo local (sin Docker)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

El proxy API está configurado en `next.config.mjs` — redirige `/api/*` a `http://localhost:8000/api/*`.

### Estructura del frontend

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← Layout global (sidebar + header + toast + footer)
│   │   ├── page.tsx                ← Dashboard (KPIs, donut categorías, barras top spenders, alertas)
│   │   ├── receipts/page.tsx       ← Upload + filtros avanzados + tabla + modal detalle
│   │   ├── transactions/page.tsx   ← Sync banco + conciliación + tabla transacciones
│   │   ├── alerts/page.tsx         ← Lista alertas con resolve/markRead
│   │   ├── employees/page.tsx      ← Directorio empleados + KPIs
│   │   └── employees/[id]/page.tsx ← Perfil: avatar, KPIs, budget bar, donut, accordion categorías
│   ├── components/
│   │   ├── ui.tsx                  ← Componentes reutilizables (Card, KPICard, Btn, StatusBadge, DataTable, etc.)
│   │   ├── sidebar.tsx             ← Navegación con Lucide icons
│   │   ├── header.tsx              ← Título de página + indicador estado sistema
│   │   ├── toast.tsx               ← Context provider + notificaciones toast
│   │   └── receipt-detail-modal.tsx← Modal: imagen recibo + OCR datos + match bancario
│   ├── lib/
│   │   ├── api.ts                  ← Fetch wrapper tipado contra FastAPI
│   │   └── format.ts              ← Formateo: money, date, rel, pct
│   └── types/
│       └── index.ts               ← Interfaces TypeScript + lookup maps (categorías, estados, alertas)
├── next.config.mjs                ← API proxy (rewrites /api/* → backend:8000)
├── Dockerfile                     ← Para docker-compose
├── tailwind.config.ts
└── package.json
```

### Convenciones del frontend

- **Todas las páginas son `'use client'`** — la app es interactiva, no usa server components
- **Iconos**: Lucide React (no emojis ni SVG paths inline)
- **Charts**: Recharts (PieChart, BarChart, ResponsiveContainer)
- **Estilos**: Tailwind CSS con paleta slate/indigo/emerald
- **API calls**: siempre via `api.get<Type>()`, `api.post<Type>()` desde `@/lib/api`
- **Tipos**: importar desde `@/types` — mirrors exacto de Pydantic schemas del backend

---

## Backend — FastAPI

### Estructura

```
backend/
├── app/
│   ├── main.py              ← Entry point FastAPI + routes registration
│   ├── models/models.py     ← SQLAlchemy models (Employee, Receipt, BankTransaction, Match, Alert)
│   ├── schemas/schemas.py   ← Pydantic schemas (request/response)
│   ├── routes/
│   │   ├── receipts.py      ← Upload, list, detail, matches, reconcile
│   │   ├── transactions.py  ← Bank transactions, sync, reconcile-all
│   │   ├── employees.py     ← CRUD + profile con category breakdown
│   │   ├── analytics.py     ← Summary, categories, top-spenders
│   │   └── alerts.py        ← List, resolve, mark-read
│   ├── services/
│   │   ├── categorizer.py   ← Categorización gastos + AnomalyDetector
│   │   ├── reconciliation.py← Motor fuzzy matching (50% amount, 30% date, 20% merchant)
│   │   └── storage.py       ← Interface MinIO S3
│   └── ocr/
│       ├── processor.py     ← Router OCR (despacha a mock o claude)
│       ├── mock_provider.py ← OCR simulado para demo
│       └── tesseract_provider.py ← OCR local (no usado en demo)
├── schema.sql               ← DDL completo (auto-aplicado en docker-entrypoint)
├── Dockerfile
└── requirements.txt
```

### Endpoints principales

| Endpoint | Método | Descripción |
|---|---|---|
| `/health` | GET | Health check |
| `/employees` | GET/POST | Listar/crear empleados |
| `/employees/{id}` | GET/PATCH/DELETE | Perfil con desglose categorías |
| `/receipts` | GET | Listar con filtros (employee, category, date, search, sort) |
| `/receipts/upload` | POST | Upload imagen → OCR background → categorización |
| `/receipts/{id}` | GET/DELETE | Detalle recibo individual |
| `/receipts/{id}/matches` | GET | Transacciones matcheadas con confidence |
| `/receipts/{id}/reconcile` | POST | Fuzzy match contra banco |
| `/transactions` | GET | Listar transacciones bancarias |
| `/transactions/sync-mock` | POST | Importar transacciones mock |
| `/transactions/reconcile-all` | POST | Conciliación masiva |
| `/analytics/summary` | GET | KPIs globales |
| `/analytics/categories` | GET | Desglose por categoría |
| `/analytics/top-spenders` | GET | Top 10 empleados por gasto |
| `/alerts` | GET | Alertas (filtro: resolved=false) |
| `/alerts/{id}/resolve` | PATCH | Resolver alerta |
| `/alerts/{id}/read` | PATCH | Marcar como leída |
| `/alerts/ai-scan` | POST | Detección anomalías con IA |
| `/analytics/approval-summary` | GET | Conteos pendientes por nivel aprobación |
| `/analytics/monthly-trend` | GET | Tendencia gasto mensual (6 meses) |
| `/receipts/{id}/approve` | POST | Aprobar (valida X-User-Role vs nivel) |
| `/receipts/{id}/reject` | POST | Rechazar recibo |

---

## Estado de fases

### Fase 1 — COMPLETADA
- Backend completo: 14+ endpoints, OCR mock, reconciliación fuzzy, anomaly detection
- Frontend legacy (`dashboard.html`): 6 páginas con charts y filtros

### Fase A — COMPLETADA (migración frontend)
- Next.js 14 + TypeScript + Tailwind CSS + Recharts
- 6 páginas portadas: Dashboard, Receipts, Transactions, Alerts, Employees, Employee Profile
- Componentes modulares, Lucide icons, toast notifications
- API proxy configurado, Docker service añadido
- Build verificado sin errores

### Fase B — COMPLETADA
- Claude Vision OCR real (`backend/app/ocr/claude_provider.py`) — activar con `OCR_PROVIDER=claude`
- Detección anomalías con IA (`backend/app/services/ai_anomaly.py`) + endpoint `POST /alerts/ai-scan`
- Schema updates: severity en alerts, payment_method y line_items en receipts
- Migración Alembic 0002 (severity, payment_method, line_items)
- Seed data mejorado: 8 empleados, 81 recibos, 6 meses, anomalías intencionales
- Frontend: approve/reject, edición inline, export CSV, severity badges, AI Scan button
- PATCH /receipts/{id} (edición OCR) — backend por Marcos, frontend integrado
- Line items y payment method en receipt detail modal

### Fase C — COMPLETADA
- Workflow aprobación multinivel (auto <100, manager 100-500, director 500+)
- Dashboard enriquecido (tendencia 6 meses AreaChart, grid empleados, panel aprobaciones)
- Selector de rol en header (Empleado/Gerente/Director) con React context
- Página /approvals: KPIs, cola filtrable, batch approve, role-gated
- Receipt modal: badge nivel, info aprobador, botones deshabilitados por rol
- Migración Alembic 0003 (approval_level, approved_by, approved_at)
- Endpoints: approval-summary, monthly-trend, approve con validación X-User-Role

### Fase D — COMPLETADA
- Vistas empleado vs admin: sidebar condicional, selector empleado, dashboard personal, filtro recibos
- Import CSV/Excel bancario Rural Kutxa (parser Ruralvía con auto-detección formato)
- Drag-and-drop UI para extractos bancarios con preview y confirmación
- Plantilla Excel de gastos del empleado (descarga + importación)
- Nueva página /profile para vista empleado
- Endpoint preview-import y import-bank-extract
- Endpoint template/expense-excel e import-expense-excel

### Fase E — COMPLETADA
- Responsive sidebar: hamburger mobile, overlay, transiciones (layout-shell.tsx nuevo)
- Skeleton screens: DashboardSkeleton, TablePageSkeleton en todas las páginas
- Empty state en Approvals con componente EmptyState
- Responsive tweaks: padding mobile en layout y header
- Datos demo definitivos: 8 empleados españoles, merchants ES, fechas relativas, budget overruns
- Mock transactions actualizados: Spanish merchants, fechas relativas, cuentas Rural Kutxa
- DEPT_BADGE actualizado: Dirección, Ingeniería (con/sin tildes), legacy English
- Script demo guiado: DEMO_SCRIPT.md con 7 actos (~18 min)

### Fase F — COMPLETADA (Marcos)
- Comparativa por departamento: dashboard admin con barra gasto vs presupuesto por dpto (verde/naranja/rojo)
- Predicción IA por empleado: `GET /analytics/forecast/{id}` con Claude + fallback estadístico
- Servicio `ai_forecast.py`: análisis histórico → previsión próximo mes, tendencia, confianza, insight en español
- Alertas automáticas de presupuesto: `POST /alerts/budget-scan` crea alertas al superar 80%/100%
- Polish: presupuesto real en employee grid, ALERT_LABEL con tipos nuevos, sidebar v3.0
- PR #1 creado en GitHub para merge a main

---

## Entorno de desarrollo — Setup Colima (Mac ARM64)

Colima es el runtime Docker recomendado (arranca en ~15s vs 60s+ de Docker Desktop).

Binarios instalados en `~/.local/bin/` (ya en PATH):
- `colima` v0.10.1
- `limactl` v2.1.0 (dependencia de Colima)
- `cloudflared` v2026.3.0 (para tunnels)
- `gh` v2.88.1 (GitHub CLI)

**Nota importante**: Colima VZ en macOS 15 tiene un bug con contenedores ARM64 nativos. Los contenedores corren en amd64 vía Rosetta (transparente, sin impacto real en la demo). `DOCKER_DEFAULT_PLATFORM=linux/amd64` está definido en `.env.example`.

**Colima necesita**: `export LIMA_DATA_HOME="$HOME/.local/share"` al invocar comandos colima directamente. El `start.sh` lo gestiona automáticamente.

---

## Compartir la demo (Cloudflare Tunnel)

```bash
# Para el frontend Next.js
cloudflared tunnel --url http://localhost:3000

# Para el backend API directo
cloudflared tunnel --url http://localhost:8000

# → https://xxxxx.trycloudflare.com  (compartir con cliente o socio)
```

---

## Flujo de trabajo colaborativo

### Equipo
- **Ricardo Pichardo** (`ricardopm01`) — propietario del repo, admin, hace los merges
- **Alejandro** (`alepm03`) — técnico, revisa y aprueba PRs
- **Marcos** (`marcospalocast`) — desarrollador, abre PRs con los cambios

### Flujo estándar

1. Crear rama nueva con nombre descriptivo:
```bash
git checkout -b feat/nombre-del-cambio
```

2. Al terminar los cambios, incluir un archivo `.md` en la rama que documente qué se ha cambiado y por qué (para que el resto del equipo y sus Claudes puedan entenderlo sin leer el código).

3. Subir la rama y abrir un PR hacia `main`:
```bash
git push origin feat/nombre-del-cambio
# → Abrir PR en GitHub con descripción clara
```

4. Alejandro revisa y aprueba el PR en GitHub.

5. Ricardo hace el merge desde GitHub.

6. Hacer pull a main para tener la versión actualizada:
```bash
git checkout main
git pull origin main
```

### Nombre del repositorio
- Remoto GitHub: `expensiq-demo`
- Local: `expensiq-demo` (en `Documents/IA/Clientes/expensiq-demo`)

### Seedear datos demo tras clonar
```bash
python demo_data_loader.py
```

---

## Decisiones de arquitectura confirmadas

- **Frontend**: Next.js 14 en `frontend/` (migrado desde SPA monolítico en Fase A)
- **Backend**: FastAPI se mantiene — ya tiene 14+ endpoints funcionando
- **Auth**: no implementar hasta que sea necesario (demo usa selector de rol simulado)
- **OCR**: mock por defecto, Claude Vision con `OCR_PROVIDER=claude` (Fase B)
- **Banco**: mock por defecto, CSV import en Fase D
- **Colima vs Docker Desktop**: usar Colima. Si falla, Docker Desktop como fallback
- **GitHub**: repo privado, rama principal `main`, feature branches para cambios

---

## Instrucciones para Claude

- **Frontend**: editar archivos en `frontend/src/` — es una app Next.js 14 estándar
- **NO editar** `backend/dashboard.html` — es legacy, ya no se usa
- Para cambios no triviales: usar modo plan antes de implementar
- Para explorar el código: usar subagentes Explore (mantener contexto limpio)
- Verificar que el backend responde antes de trabajar: `curl http://localhost:8000/health`
- Verificar build del frontend: `cd frontend && npx next build`
- Los datos demo se siembran con `python demo_data_loader.py` desde la raíz del proyecto

### OBLIGATORIO antes de cualquier push o PR con cambios de frontend

Siempre ejecutar el build de producción y confirmar que termina sin errores antes de hacer push:

```bash
cd frontend && npx next build
```

El despliegue en Vercel falla silenciosamente si el build local no se verifica primero. Un error típico es usar `useSearchParams()` sin envolverlo en un `<Suspense>` boundary — Next.js 14 lo requiere para el prerendering estático y no lo detecta en `dev`, solo en `build`.
