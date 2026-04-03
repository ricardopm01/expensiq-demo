# ExpensIQ — Guía de Onboarding Técnico

> Documento de incorporación para nuevos miembros del equipo técnico.
> Objetivo: que puedas entender la arquitectura completa y empezar a trabajar sin depender de nadie.

---

## 1. ¿Qué es ExpensIQ?

ExpensIQ es un sistema de gestión de gastos con IA para empresas. Resuelve un problema muy concreto: una empleada recibe facturas físicas, las f   
      otografía, las organiza en Excel y verifica manualmente contra extractos bancarios. ExpensIQ automatiza ese flujo completo:

```
Fotografía factura → OCR extrae datos → Categorización automática
→ Conciliación contra banco → Alertas si hay anomalías → Aprobación por nivel
```

Es una **demo para cliente**, no un producto en producción. Está diseñada para mostrar el flujo completo de forma convincente.

---

## 2. Vista general de la arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO (navegador)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP (puerto 3000)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND  Next.js 14 + TypeScript              │
│                    (frontend/ → puerto 3000)                │
│  Reescribe /api/v1/* → http://backend:8000/api/v1/*         │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP (puerto 8000)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND  FastAPI + Python 3.11                 │
│                   (backend/ → puerto 8000)                  │
│  • OCR (mock o Claude Vision)                               │
│  • Motor de conciliación fuzzy                              │
│  • Detección de anomalías con IA                            │
│  • Predicción de gastos por empleado                        │
└──────────┬────────────────┬────────────────────────────────┘
           │                │
           ▼                ▼
┌──────────────────┐  ┌────────────────────────────────────┐
│  PostgreSQL 15   │  │  MinIO (almacenamiento S3-local)   │
│  (puerto 5432)   │  │  (puerto 9000 API / 9001 consola)  │
│  Base de datos   │  │  Imágenes de recibos subidas       │
└──────────────────┘  └────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Metabase  (BI / dashboards)                    │
│                       puerto 3100                           │
│  Se conecta directo a PostgreSQL                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Stack tecnológico — por qué se eligió cada cosa

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | Next.js 14 + TypeScript | Framework React con routing, proxy API integrado, build optimizado |
| Estilos | Tailwind CSS | Utility-first, rápido de prototipar sin CSS custom |
| Iconos | Lucide React | Librería de iconos consistente, tree-shakeable |
| Gráficas | Recharts | Charts React-native, fácil de componer |
| Backend | FastAPI (Python) | Async, documentación automática (Swagger), muy rápido de desarrollar |
| ORM | SQLAlchemy | ORM maduro para Python, compatible con Alembic para migraciones |
| Validación API | Pydantic | Schemas tipados en Python, genera documentación OpenAPI automáticamente |
| Base de datos | PostgreSQL 15 | Relacional robusto, soporte UUID nativo, usado en producción real |
| Almacenamiento | MinIO | Compatible con S3 de AWS pero corre local, sin coste en demo |
| BI | Metabase | Dashboards sin código, se conecta directo a PostgreSQL |
| OCR | Mock (demo) / Claude Vision (prod) | Mock para velocidad en demo, Claude Vision para producción real |
| IA | Claude (Anthropic) | Detección anomalías, predicción gastos, OCR real |
| Contenedores | Docker + Docker Compose | Todo el stack levanta con un comando, reproducible en cualquier máquina |

---

## 4. Docker — qué es y cómo funciona aquí

### ¿Qué es Docker?

En un backend convencional, instalas Python, PostgreSQL, etc. directamente en tu máquina. El problema: "en mi máquina funciona" — versiones dist   
      intas, dependencias que chocan, configuraciones diferentes.

**Docker resuelve esto con contenedores**: paquetes aislados que incluyen el código + todas sus dependencias + el sistema operativo mínimo neces   
      ario. Son como mini-máquinas virtuales, pero mucho más ligeras.

```
Sin Docker:                          Con Docker:
Tu máquina                           Tu máquina
├── Python 3.9 (para otro proyecto)  ├── Docker Engine
├── Python 3.11 (para ExpensIQ)      │   ├── contenedor: backend (Python 3.11 aislado)
├── PostgreSQL 14 (instalado)        │   ├── contenedor: db (PostgreSQL 15 aislado)
└── conflictos, configuración manual └── contenedor: frontend (Node.js aislado)
```

### Docker Compose

Si Docker gestiona un contenedor, **Docker Compose** gestiona múltiples contenedores como un sistema coordinado. ExpensIQ tiene 5 servicios defi   
      nidos en `docker-compose.yml`:

```yaml
services:
  db:        # PostgreSQL 15 — base de datos
  minio:     # MinIO — almacenamiento de imágenes
  backend:   # FastAPI — API Python
  frontend:  # Next.js — interfaz web
  metabase:  # Metabase — dashboards BI
```

Cada servicio tiene:
- **`image`** o **`build`**: usa una imagen pública (db, minio, metabase) o construye desde un Dockerfile (backend, frontend)
- **`ports`**: `"8000:8000"` = puerto_host:puerto_contenedor
- **`volumes`**: monta carpetas del host dentro del contenedor (permite hot-reload)
- **`depends_on`**: define el orden de arranque y espera healthchecks
- **`environment`**: variables de entorno para configurar el servicio

### Diferencia clave con un backend convencional

```
Backend convencional (Flask/Django local):
  python app.py → corre en tu máquina directamente
  PostgreSQL instalado en localhost:5432
  → Problema: funciona solo en tu máquina con tu configuración

Backend con Docker (ExpensIQ):
  docker compose up → levanta TODOS los servicios automáticamente
  El backend ve PostgreSQL en db:5432 (hostname del contenedor)
  → Funciona igual en cualquier máquina del equipo
```

### Comandos Docker esenciales para este proyecto

```bash
# Levantar todo (primera vez o tras cambios en Dockerfile)
docker compose up --build

# Levantar todo (sin reconstruir imágenes)
docker compose up

# Parar todo
docker compose down

# Ver logs en tiempo real
docker compose logs -f backend
docker compose logs -f frontend

# Entrar a un contenedor (como SSH)
docker compose exec backend bash
docker compose exec db psql -U postgres expensiq

# Ver estado de los contenedores
docker compose ps

# Reconstruir solo un servicio
docker compose up --build backend
```

### Nota importante sobre este proyecto (Windows)

El proyecto fue desarrollado originalmente en Mac con **Colima** como runtime Docker. En Windows se usa **Docker Desktop** directamente — los co   
      mandos `docker compose` son idénticos. Si ves referencias a `colima` o `LIMA_DATA_HOME` en los scripts, son específicas de Mac y puedes ignorarl   
      as.

---

## 5. Estructura completa del proyecto

```
expensiq-demo/
│
├── docker-compose.yml          ← Orquesta los 5 servicios
├── .env.example                ← Plantilla de variables de entorno
├── .env                        ← Variables locales (no commitear)
├── start.sh                    ← Script arranque (Mac/Colima específico)
├── demo_data_loader.py         ← Carga datos demo en la BD
├── CLAUDE.md                   ← Instrucciones para la IA del equipo
├── DEMO_SCRIPT.md              ← Guion demo para cliente (7 actos, ~18 min)
│
├── backend/                    ← FastAPI Python
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── schema.sql              ← DDL completo (se aplica automáticamente al arrancar DB)
│   └── app/
│       ├── main.py             ← Entry point: registra rutas, CORS, lifespan
│       ├── core/
│       │   ├── config.py       ← Settings desde variables de entorno
│       │   └── auth.py         ← Google OAuth + JWT
│       ├── db/
│       │   └── session.py      ← SQLAlchemy engine + SessionLocal
│       ├── models/
│       │   └── models.py       ← Modelos ORM (tablas de la BD)
│       ├── schemas/
│       │   └── schemas.py      ← Pydantic schemas (request/response de la API)
│       ├── routes/
│       │   ├── auth.py         ← GET/POST /api/v1/auth/*
│       │   ├── employees.py    ← CRUD /api/v1/employees
│       │   ├── receipts.py     ← Upload, filtros, aprobación /api/v1/receipts
│       │   ├── transactions.py ← Sync banco, conciliación /api/v1/transactions
│       │   ├── alerts.py       ← Alertas, AI scan /api/v1/alerts
│       │   ├── analytics.py    ← KPIs, tendencias, forecast /api/v1/analytics
│       │   └── periods.py      ← Quincenas /api/v1/periods
│       ├── services/
│       │   ├── categorizer.py      ← Categorización de gastos + AnomalyDetector
│       │   ├── reconciliation.py   ← Motor fuzzy matching recibo ↔ banco
│       │   ├── ai_anomaly.py       ← Detección anomalías con Claude
│       │   ├── ai_forecast.py      ← Predicción gasto próximo mes con Claude
│       │   ├── storage.py          ← Interface MinIO/S3
│       │   └── email_service.py    ← Recordatorios quincenales por email
│       └── ocr/
│           ├── processor.py        ← Router OCR: despacha a mock o claude
│           ├── mock_provider.py    ← OCR simulado para demo
│           └── claude_provider.py  ← OCR real con Claude Vision (OCR_PROVIDER=claude)
│
└── frontend/                   ← Next.js 14 TypeScript
    ├── Dockerfile
    ├── package.json
    ├── next.config.mjs         ← Proxy /api/v1/* → backend:8000
    ├── tailwind.config.ts
    └── src/
        ├── app/                ← Páginas (App Router de Next.js)
        │   ├── layout.tsx      ← Layout global (sidebar + header + footer)
        │   ├── page.tsx        ← Dashboard principal (KPIs, gráficas)
        │   ├── receipts/       ← Gestión de recibos
        │   ├── transactions/   ← Transacciones bancarias
        │   ├── alerts/         ← Alertas del sistema
        │   ├── employees/      ← Directorio + perfil por empleado
        │   ├── approvals/      ← Cola de aprobaciones
        │   └── profile/        ← Vista empleado (vista personal)
        ├── components/
        │   ├── ui.tsx          ← Componentes reutilizables (Card, KPICard, Btn...)
        │   ├── sidebar.tsx     ← Navegación lateral
        │   ├── header.tsx      ← Cabecera + selector de rol
        │   ├── toast.tsx       ← Notificaciones toast
        │   └── receipt-detail-modal.tsx ← Modal detalle recibo
        ├── lib/
        │   ├── api.ts          ← Fetch wrapper tipado (api.get, api.post, etc.)
        │   └── format.ts       ← Helpers de formato (moneda, fecha, %)
        └── types/
            └── index.ts        ← Interfaces TypeScript + lookup maps UI
```

---

## 6. Base de datos — modelos y relaciones

La base de datos es PostgreSQL 15. El schema se aplica automáticamente desde `backend/schema.sql` al arrancar el contenedor `db` por primera vez   
      .

### Modelos (tablas)

```
employees ──────────────────────────────────────────────────────
  id (UUID PK)     name           email (unique)
  department       role           monthly_budget
  google_id        is_active      last_login

receipts ───────────────────────────────────────────────────────
  id (UUID PK)     employee_id (FK→employees)
  merchant         date           amount         currency
  tax              category       status
  ocr_confidence   ocr_raw_text   ocr_provider
  payment_method   line_items     notes
  approval_level   approved_by (FK→employees)   approved_at
  image_url        upload_timestamp

bank_transactions ──────────────────────────────────────────────
  id (UUID PK)     employee_id (FK→employees)
  external_id      date           merchant
  amount           currency       account_id

matches ────────────────────────────────────────────────────────
  id (UUID PK)
  receipt_id (FK→receipts)
  transaction_id (FK→bank_transactions)
  confidence       match_method
  UNIQUE(receipt_id, transaction_id)

alerts ─────────────────────────────────────────────────────────
  id (UUID PK)     employee_id (FK→employees)
  receipt_id (FK→receipts)
  alert_type       description    severity
  is_read          resolved       resolved_at

periods ────────────────────────────────────────────────────────
  id (UUID PK)     start_date     end_date
  status (open|closed)            closed_at

employee_period_status ─────────────────────────────────────────
  employee_id (FK)  period_id (FK)
  status (open|closed|reopened)   reopened_at
  UNIQUE(employee_id, period_id)
```

### Diagrama de relaciones simplificado

```
employees (1) ──< receipts (many)       -- un empleado tiene muchos recibos
receipts (1)  ──< matches (many)        -- un recibo puede tener varios matches
bank_transactions (1) ──< matches       -- una transacción puede matchear varios recibos
employees (1) ──< alerts                -- alertas vinculadas a un empleado
receipts (1)  ──< alerts                -- alertas vinculadas a un recibo
periods (1) ──< employee_period_status  -- estado por empleado en cada quincena
```

### Valores de `status` en `receipts`

| Valor | Significado |
|---|---|
| `pending` | Recién subido, esperando OCR |
| `processing` | OCR en proceso |
| `matched` | Conciliado con transacción bancaria (confianza ≥ 0.6) |
| `review` | Match encontrado pero baja confianza (0.4-0.6) |
| `flagged` | Marcado como sospechoso por IA |
| `rejected` | Rechazado en flujo de aprobación |

### Workflow de aprobación (por importe)

```
< 100€  → approval_level: "auto"     → se aprueba automáticamente
≥ 100€  → approval_level: "admin"    → requiere usuario con role=admin
```

---

## 7. Backend — cómo funciona FastAPI

### Entry point (`backend/app/main.py`)

FastAPI registra todos los routers al arrancar:

```python
app.include_router(receipts.router, prefix="/api/v1/receipts")
app.include_router(employees.router, prefix="/api/v1/employees")
# ... etc.
```

También ejecuta código de arranque (`lifespan`): crea el bucket en MinIO y arranca el scheduler de recordatorios de quincenas.

### Patrón de un endpoint típico

```python
# backend/app/routes/receipts.py
@router.get("/", response_model=List[ReceiptOut])
def list_receipts(
    employee_id: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),          # inyección de sesión BD
    current_user: Employee = Depends(get_current_user),  # auth JWT
):
    query = db.query(Receipt)
    if employee_id:
        query = query.filter(Receipt.employee_id == employee_id)
    if category:
        query = query.filter(Receipt.category == category)
    return query.all()
```

- **`Depends(get_db)`**: inyecta una sesión de base de datos (se cierra automáticamente al terminar)
- **`Depends(get_current_user)`**: verifica el JWT Bearer token y devuelve el usuario autenticado
- **`response_model`**: Pydantic serializa automáticamente el resultado al schema definido

### Documentación automática

FastAPI genera Swagger UI automáticamente en `http://localhost:8000/docs`. Puedes probar todos los endpoints desde el navegador sin necesidad de   
       Postman.

### Motor de conciliación fuzzy (`backend/app/services/reconciliation.py`)

El algoritmo calcula una puntuación de confianza entre un recibo y una transacción bancaria:

```
confianza = (50% × score_importe) + (30% × score_fecha) + (20% × score_merchant)

score_importe:  1.0 si diferencia < 5%, 0.0 si diferencia ≥ 5%
score_fecha:    1.0 si mismo día, 0.0 si diferencia > 3 días
score_merchant: fuzzy string matching (fuzzywuzzy) entre nombres de comercio

confianza ≥ 0.6  → status = "matched"
confianza 0.4-0.6 → status = "review"
confianza < 0.4  → sin match
```

---

## 8. Frontend — cómo funciona Next.js 14

### App Router

Next.js 14 usa el **App Router**: cada carpeta dentro de `src/app/` con un `page.tsx` se convierte en una ruta automáticamente:

```
src/app/page.tsx              → http://localhost:3000/
src/app/receipts/page.tsx     → http://localhost:3000/receipts
src/app/employees/[id]/page.tsx → http://localhost:3000/employees/abc-123
```

### `'use client'` — todas las páginas son client-side

En este proyecto, **todas las páginas tienen `'use client'`** arriba. Esto significa que se renderizan en el navegador (como React tradicional),   
       no en el servidor. Se tomó esta decisión porque la app es muy interactiva y usa muchos hooks de estado.

### Proxy API (`next.config.mjs`)

El frontend no llama al backend directamente con `http://localhost:8000`. En su lugar, usa rutas relativas `/api/v1/*` que Next.js redirige al b   
      ackend:

```javascript
// next.config.mjs
rewrites: async () => [{
  source: '/api/v1/:path*',
  destination: 'http://backend:8000/api/v1/:path*'
}]
```

Esto permite que el frontend y el backend sean independientes — el navegador solo habla con el frontend en el puerto 3000.

### Cómo hacer una llamada a la API

```typescript
// Siempre usar el wrapper tipado de @/lib/api
import { api } from '@/lib/api';
import { Receipt } from '@/types';

// GET
const receipts = await api.get<Receipt[]>('/receipts');

// POST
const result = await api.post<Receipt>('/receipts', { merchant: 'Repsol', amount: 45.0 });

// PATCH
await api.patch('/receipts/abc-123', { status: 'review' });

// Upload archivo
const formData = new FormData();
formData.append('file', imageFile);
const receipt = await api.upload<Receipt>('/receipts/upload', formData);
```

### Tipos TypeScript

Los tipos en `src/types/index.ts` son mirrors exactos de los schemas Pydantic del backend. Si se añade un campo en el backend, hay que añadirlo    
      también aquí.

---

## 9. Variables de entorno

Copia `.env.example` a `.env` antes de arrancar:

```bash
cp .env.example .env
```

Variables clave:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@db:5432/expensiq` | Conexión PostgreSQL |
| `OCR_PROVIDER` | `mock` | `mock` para demo, `claude` para producción real |
| `ANTHROPIC_API_KEY` | vacío | Necesario si `OCR_PROVIDER=claude` o para funciones IA |
| `S3_ENDPOINT` | `http://minio:9000` | MinIO local |
| `AWS_ACCESS_KEY_ID` | `minioadmin` | Credenciales MinIO |
| `AWS_SECRET_ACCESS_KEY` | `minioadmin` | Credenciales MinIO |
| `CORS_ORIGINS` | `["*"]` | En producción, cambiar a dominio específico |

---

## 10. URLs del sistema

| Servicio | URL | Descripción |
|---|---|---|
| Frontend | http://localhost:3000 | Interfaz principal |
| Backend API | http://localhost:8000 | API REST |
| Swagger / Docs | http://localhost:8000/docs | Documentación interactiva de la API |
| MinIO Console | http://localhost:9001 | Gestión de archivos (user: minioadmin) |
| Metabase | http://localhost:3100 | Dashboards BI |

---

## 11. Cómo arrancar el proyecto (Windows)

```bash
# 1. Clonar e ir al directorio
git clone <repo-url>
cd expensiq-demo

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Levantar todo con Docker
docker compose up --build

# Esperar ~2-3 minutos a que todos los servicios estén healthy
# Verificar que el backend responde:
curl http://localhost:8000/health
# → {"status": "ok"}

# 4. Cargar datos demo
python demo_data_loader.py

# 5. Abrir el frontend
# http://localhost:3000
```

Para desarrollo del **frontend sin Docker** (hot-reload más rápido):

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
# El backend sigue corriendo en Docker
```

---

## 12. Flujo de trabajo con Git

El proyecto usa feature branches. Nunca se hace commit directo a `main`.

```bash
# 1. Crear rama nueva con nombre descriptivo
git checkout -b feat/mi-feature

# 2. Desarrollar y hacer commits
git add <archivos específicos>
git commit -m "feat: descripción del cambio"

# 3. Incluir un archivo .md en la rama explicando qué cambió y por qué
#    (para que el equipo y sus Claudes lo entiendan sin leer el código)

# 4. Subir y abrir PR en GitHub
git push origin feat/mi-feature
# → Alejandro revisa y aprueba → Ricardo hace merge
```

Para sincronizar con lo que han hecho los otros:

```bash
git checkout main
git pull origin main
```

### Equipo y roles en GitHub

| Persona | GitHub | Rol |
|---|---|---|
| Ricardo | `ricardopm01` | Admin — hace los merges |
| Alejandro | `alepm03` | Revisor — aprueba PRs antes del merge |
| Marcos | `marcospalocast` | Desarrollador — abre PRs con cambios |

---

## 13. Fases del proyecto (historial de lo construido)

El proyecto se construyó en fases incrementales. Todo está completado:

| Fase | Lo que se hizo |
|---|---|
| **Fase 1** | Backend completo: 14+ endpoints, OCR mock, conciliación fuzzy, anomaly detection |
| **Fase A** | Migración frontend a Next.js 14 + TypeScript + Tailwind (reemplaza SPA legacy) |
| **Fase B** | Claude Vision OCR real, detección anomalías IA, severidad en alertas, line items |
| **Fase C** | Workflow aprobación multinivel, dashboard enriquecido, selector de rol, /approvals |
| **Fase D** | Vistas empleado vs admin, import CSV/Excel bancario Rural Kutxa, drag-and-drop |
| **Fase E** | Responsive mobile, skeleton screens, datos demo definitivos españoles |
| **Fase F** | Comparativa por departamento, predicción IA por empleado, alertas de presupuesto |
| **Fase G** | Google OAuth + JWT, pantalla login por email, panel quincenas, recordatorios email |

---

## 14. Puntos de atención para el desarrollo

1. **NO editar** `backend/dashboard.html` — es legacy y está deprecated. Todo el trabajo va en `frontend/src/`.

2. **Tipos sincronizados**: cuando añadas campos en el backend (SQLAlchemy model + Pydantic schema), actualiza también `frontend/src/types/index   
      .ts`.

3. **OCR en demo**: por defecto usa mock (datos falsos simulados). Para activar Claude Vision real: `OCR_PROVIDER=claude` + `ANTHROPIC_API_KEY=s   
      k-ant-...` en `.env`.

4. **Datos demo**: si necesitas datos frescos, ejecuta:
   ```bash
   # Limpiar todo y sembrar de nuevo
   curl -X DELETE http://localhost:8000/api/v1/demo/reset
   python demo_data_loader.py
   ```

5. **Migraciones de BD**: el proyecto usa Alembic para cambios de schema. Si modificas `models.py`, necesitas generar una migración.

6. **Auth en producción**: el sistema tiene Google OAuth + JWT implementado (Fase 1 backend). En el frontend hay un selector de rol simulado par   
      a la demo. Para un cliente real, habría que activar el flujo OAuth completo.

---

## 15. Acceso rápido a los archivos más importantes

| Si necesitas... | Mira aquí |
|---|---|
| Añadir un endpoint | `backend/app/routes/<nombre>.py` |
| Cambiar la BD | `backend/app/models/models.py` + `backend/schema.sql` |
| Validación request/response API | `backend/app/schemas/schemas.py` |
| Lógica de negocio | `backend/app/services/` |
| Nueva página frontend | `frontend/src/app/<ruta>/page.tsx` |
| Componente reutilizable | `frontend/src/components/ui.tsx` |
| Tipos TypeScript | `frontend/src/types/index.ts` |
| Llamadas a la API | `frontend/src/lib/api.ts` |
| Configuración Docker | `docker-compose.yml` |
| Variables de entorno | `.env` (local) / `.env.example` (template) |