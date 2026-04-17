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
| Auth | NextAuth + Google OAuth + JWT. DEV_MODE: email-only sin contraseña |
| Proveedor OCR | Mock por defecto — Claude Vision con `OCR_PROVIDER=claude` |
| Banco | Mock por defecto — CSV Rural Kutxa disponible (Fase D) |

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
│   │   ├── page.tsx                ← Dashboard admin+empleado (KPIs, charts, alertas, grid)
│   │   ├── login/page.tsx          ← Login con email (DEV_MODE) o Google OAuth
│   │   ├── receipts/page.tsx       ← Upload + filtros avanzados + tabla + modal detalle
│   │   ├── transactions/page.tsx   ← Sync banco + conciliación + tabla transacciones
│   │   ├── alerts/page.tsx         ← Lista alertas con resolve/markRead
│   │   ├── employees/page.tsx      ← Directorio empleados + KPIs
│   │   ├── employees/[id]/page.tsx ← Perfil: avatar, KPIs, budget bar, donut, accordion categorías
│   │   ├── approvals/page.tsx      ← Cola aprobaciones + batch approve (role-gated)
│   │   ├── periods/page.tsx        ← Panel quincenas: estado envíos, revisión admin, historial, PDF
│   │   ├── profile/page.tsx        ← Vista personal del empleado
│   │   └── api/auth/[...nextauth]/ ← NextAuth route handler
│   ├── components/
│   │   ├── ui.tsx                  ← Componentes reutilizables (Card, KPICard, Btn, StatusBadge, DataTable, etc.)
│   │   ├── sidebar.tsx             ← Navegación con Lucide icons (rutas distintas admin/empleado)
│   │   ├── header.tsx              ← Título de página + indicador estado sistema
│   │   ├── toast.tsx               ← Context provider + notificaciones toast
│   │   ├── receipt-detail-modal.tsx← Modal: imagen recibo + OCR datos + match bancario
│   │   ├── layout-shell.tsx        ← Responsive: hamburger mobile, overlay, transiciones
│   │   ├── period-banner.tsx       ← Banner quincena activa (estado + días restantes)
│   │   └── bank-import-dropzone.tsx← Drag-and-drop para extractos bancarios
│   ├── lib/
│   │   ├── api.ts                  ← Fetch wrapper tipado contra FastAPI (token via _backendToken)
│   │   ├── auth.ts                 ← NextAuth config (Credentials DEV_MODE / Google OAuth producción)
│   │   ├── role-context.tsx        ← React context: role, employeeId, token sync con NextAuth
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
- **Auth en páginas con carga automática**: guardar el `useEffect` de carga usando `backendToken` de `useRole()` — `if (!backendToken) return`. NO usar `status` de `useSession` ni `role`, porque en Next.js los efectos de hijos se ejecutan antes que los del padre (`RoleProvider`), y `status` puede ser `'authenticated'` antes de que el token esté disponible
- **Role**: el `role` en `useRole()` vale `'employee'` por defecto — no usar `!role` como guarda de auth

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
│   │   ├── analytics.py     ← Summary, categories, top-spenders, forecast, monthly-trend
│   │   ├── alerts.py        ← List, resolve, mark-read, ai-scan, budget-scan
│   │   ├── periods.py       ← Quincenas: current, list, close, reopen, review, PDF report
│   │   └── auth.py          ← Google OAuth exchange, dev-login (DEV_MODE), JWT
│   ├── core/
│   │   └── auth.py          ← JWT validation, get_current_user, require_admin, require_full_admin
│   ├── services/
│   │   ├── categorizer.py   ← Categorización gastos + AnomalyDetector
│   │   ├── reconciliation.py← Motor fuzzy matching (50% amount, 30% date, 20% merchant)
│   │   ├── storage.py       ← Interface MinIO S3
│   │   ├── ai_forecast.py   ← Claude AI: previsión gasto próximo mes por empleado
│   │   ├── ai_anomaly.py    ← Detección anomalías con IA
│   │   ├── pdf_report.py    ← Generación informe PDF quincenal (ReportLab)
│   │   └── email_service.py ← Recordatorios cierre quincena (APScheduler + SMTP)
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
| `/periods/current` | GET | Obtener/crear quincena actual (auto-crea si no existe) |
| `/periods/` | GET | Listar quincenas (últimas 12, solo admin) |
| `/periods/close-current` | POST | Cerrar quincena actual (solo full_admin) |
| `/periods/{id}/reopen-employee/{emp_id}` | POST | Reabrir para empleado concreto |
| `/periods/{id}/employee-statuses` | GET | Estado envíos + revisión por empleado |
| `/periods/{id}/review-employee/{emp_id}` | POST | Aprobar o señalar incidencia (acción: approve/flag) |
| `/periods/{id}/review-summary` | GET | Progreso de revisión: total/aprobados/flagged/pendientes |
| `/periods/{id}/report/pdf` | GET | Descargar informe PDF del periodo |
| `/periods/me/can-submit` | GET | ¿Puedo enviar recibos en la quincena actual? |
| `/auth/dev-login` | POST | Login por email sin contraseña (solo DEV_MODE) |
| `/auth/google` | POST | Intercambio token Google → JWT backend |

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

### Fase G — COMPLETADA (Alejandro + Marcos)
- **Auth**: Google OAuth + JWT (producción) / Credentials email sin contraseña (DEV_MODE)
- **NextAuth**: `frontend/src/lib/auth.ts` — providers, JWT callback, session callback
- **Backend JWT**: `backend/app/core/auth.py` — `get_current_user`, `require_admin`, `require_full_admin`
- **Quincenas (panel completo)**: `/periods` — apertura/cierre automático (1-15, 16-EOM), estado envíos por empleado
- **Revisión quincenal admin**: aprobar/señalar incidencia, progress bar, alerta automática al empleado con flag
- **Banner quincena**: `period-banner.tsx` — visible en layout con días restantes
- **Informe PDF**: descarga por admin (ReportLab, `backend/app/services/pdf_report.py`)
- **Email reminders**: `email_service.py` + APScheduler — avisos cierre de quincena (pendiente SMTP en producción)
- **Migración Alembic 0005**: `review_status`, `review_note`, `reviewed_at`, `reviewed_by` en `EmployeePeriodStatus`
- **DEV_MODE**: `NEXT_PUBLIC_DEV_MODE=true` — desactiva Google OAuth, activa login por email

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
- **Backend**: FastAPI se mantiene — ya tiene 20+ endpoints funcionando
- **Auth**: NextAuth + Google OAuth + JWT implementado en Fase G. DEV_MODE (`NEXT_PUBLIC_DEV_MODE=true`) para desarrollo local sin credenciales Google reales
- **OCR**: mock por defecto, Claude Vision con `OCR_PROVIDER=claude` (Fase B)
- **Banco**: mock por defecto, CSV import Rural Kutxa en Fase D
- **Colima vs Docker Desktop**: usar Colima. Si falla, Docker Desktop como fallback
- **GitHub**: repo privado, rama principal `main`, feature branches para cambios
- **Deployment desarrollo**: Docker Compose + localhost (actual)
- **Deployment producción**: Vercel (frontend, auto-deploy desde GitHub main) + Railway (backend + DB + MinIO). Variable a cambiar: `NEXT_PUBLIC_API_URL=https://[app].railway.app`. Ver `PLANNING_PROXIMOS_PASOS.md` para variables de entorno completas
- **Modelo de negocio objetivo**: SaaS — Edrai Solutions mantiene el deployment, Lezama paga suscripción mensual

### Auditoría UX CEO (2026-04-16)

Revisión del producto comparando con SAP Concur, Ramp, Expensify, Captio, Pleo y Spendesk. Decisiones:

- **Quincenas fuera del sidebar admin**: "Quincenas" es un concepto backend, no una sección de navegación. La encargada piensa en acciones (revisar, aprobar, cerrar), no en "ir a la página de quincenas". Eliminada del `ADMIN_NAV` en sidebar. La funcionalidad se accede desde el widget PeriodWidget del dashboard admin ("Gestionar" lleva a `/periods`). La ruta `/periods` sigue existiendo.
- **Pills de quincena eliminados**: Los botones "Esta quincena / Quincena anterior / Todo" en la página de Recibos no aportaban valor. Los filtros de fecha libre (Desde / Hasta) son suficientes. Eliminados `getFortnightRange()`, `activePeriodFilter`, `applyPeriodFilter()` y el bloque JSX de pills.
- **Prediccion IA reubicada**: En el perfil de empleado (`/employees/[id]`), la prediccion IA estaba demasiado prominente (justo despues del budget bar). Movida al final de la pagina, despues del desglose por categoria y antes del modal de detalle. Es informacion complementaria, no primaria.
- **Workflow de revision**: La encargada revisa por lotes (no individual). Mira el resumen, aprueba en bloque, solo entra al detalle si algo esta flaggeado.

**Sidebar admin actual (6 items)**: Dashboard, Recibos, Transacciones, Alertas, Aprobaciones, Empleados.

**Orden secciones perfil empleado**: Header, KPIs, Budget bar, Donut categorias, Accordion desglose, Prediccion IA.

---

## Instrucciones para Claude

- **Frontend**: editar archivos en `frontend/src/` — es una app Next.js 14 estándar
- **NO editar** `backend/dashboard.html` — es legacy, ya no se usa
- Para cambios no triviales: usar modo plan antes de implementar
- Para explorar el código: usar subagentes Explore (mantener contexto limpio)
- Verificar que el backend responde antes de trabajar: `curl http://localhost:8000/health`
- Verificar build del frontend: `cd frontend && npx next build`
- Los datos demo se siembran con `python demo_data_loader.py` desde la raíz del proyecto
- **Auth en dev**: `NEXT_PUBLIC_DEV_MODE=true` ya está en `.env`. Login con cualquier email de los 8 usuarios demo (no requiere contraseña). El backend token se guarda en la sesión NextAuth y el `RoleProvider` lo transfiere a `_backendToken` en `api.ts`
- **Race condition**: al añadir nuevas páginas con carga automática de datos, usar `const { status } = useSession()` y guardar el `useEffect` con `if (status !== 'authenticated') return;`
- **CLAUDE.md es la única fuente de verdad** para stack, arquitectura y convenciones. No crear documentos supletorios para actualizar el estado del proyecto — editar directamente este archivo. El **roadmap activo** vive en el documento de auditoría listado abajo en "Documentos vivos".

---

## Documentos vivos

- `AUDITORIA_PLAN_MEJORA_2026-04-17.md` — auditoría UX admin + roadmap de 5 sprints + **preguntas abiertas a Lezama**. Consultar antes de proponer nuevas features. Si el cliente responde a una de las preguntas, mover la respuesta a la sección `Respondidas` del documento con fecha.
