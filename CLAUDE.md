# CLAUDE.md — ExpensIQ Demo

## Qué es este proyecto

**ExpensIQ** es una demo para cliente de un sistema de gestión de gastos con IA.
Dos desarrolladores colaboran en él: Ricardo Pichardo (Edrai Solutions) y su socio.

**Problema de negocio**: Una empleada recibe facturas físicas, las fotografía, las organiza en Excel y verifica manualmente contra extractos bancarios. ExpensIQ automatiza ese flujo completo: OCR → conciliación automática → alertas → aprobación.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Backend | Python 3.11 + FastAPI + SQLAlchemy |
| Base de datos | PostgreSQL 15 |
| Almacenamiento | MinIO (S3-compatible) |
| BI | Metabase |
| Frontend | React 18 SPA (CDN) + Tailwind CSS (CDN) + Chart.js — un solo `dashboard.html` |
| Infraestructura | Docker Compose |
| Proveedor OCR | Mock (demo) — Google Vision en Fase 3 |
| Banco | Mock (demo) — Salt Edge en Fase 3 |

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
- Dashboard: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
- Metabase: http://localhost:3100

---

## Regla crítica: dashboard.html tiene DOS ubicaciones

El bind mount de Docker no sincroniza la raíz del proyecto con el contenedor.

**Siempre edita:** `backend/dashboard.html`
**Copia tras cada cambio:** `cp backend/dashboard.html dashboard.html`

O en sentido contrario (si editas el root): `cp dashboard.html backend/dashboard.html`

El `main.py` sirve desde `/app/dashboard.html` → que mapea a `backend/dashboard.html`.

---

## Estructura de archivos clave

```
demo IA EXPENSE/
├── CLAUDE.md                    ← este archivo
├── PARTNER_GUIDE.md             ← onboarding del socio
├── start.sh                     ← arranque en un comando
├── docker-compose.yml
├── .env.example                 ← plantilla (nunca el .env real)
├── dashboard.html               ← COPIA del frontend (no editar aquí)
├── backend/
│   ├── dashboard.html           ← FUENTE DEL FRONTEND (editar aquí)
│   ├── app/
│   │   ├── main.py              ← entry point FastAPI
│   │   ├── models/models.py     ← SQLAlchemy models
│   │   ├── schemas/schemas.py   ← Pydantic schemas
│   │   ├── routes/              ← endpoints por entidad
│   │   │   ├── receipts.py
│   │   │   ├── transactions.py
│   │   │   ├── employees.py
│   │   │   ├── analytics.py
│   │   │   └── alerts.py
│   │   ├── services/
│   │   │   ├── categorizer.py   ← IA categorización gastos
│   │   │   ├── reconciliation.py← conciliación bancaria
│   │   │   └── storage.py       ← MinIO interface
│   │   └── ocr/
│   │       ├── mock_provider.py
│   │       └── tesseract_provider.py
│   ├── schema.sql               ← DDL completo (auto-aplicado en docker)
│   └── requirements.txt
└── demo_data_loader.py          ← script para sembrar datos demo
```

---

## Estado de fases

### Fase 1 — COMPLETADA

**Backend:**
- `GET /employees/{id}` — Perfil con desglose por categoría y recibos anidados
- `GET /analytics/employee/{id}/categories` — Breakdown categorías por empleado
- `GET /receipts/{id}/matches` — Transacciones matcheadas con confianza
- Filtros avanzados en receipts: `category`, `date_from`, `date_to`, `search`, `sort_by`, `sort_order`

**Frontend:**
- EmployeeProfilePage — KPIs + barra presupuesto + accordion categorías + recibos individuales
- ReceiptDetailModal — imagen + OCR + comparación lado a lado con banco
- Filtros avanzados ReceiptsPage — empleado, categoría, fechas, búsqueda merchant
- Charts clickables — donut → filtro categoría, barras → perfil empleado
- Navegación con params entre páginas

**Infraestructura:**
- Git repo inicializado (rama `main`)
- Colima (runtime Docker, reemplaza Docker Desktop) + cloudflared instalados
- docker-compose cross-platform (sin ARM64 hardcodeado)

### Fase 2 — PENDIENTE (próxima)
- `PATCH /receipts/{id}` — Editar datos OCR
- Approve/reject recibos con flujo de aprobación
- Exportar CSV de gastos
- Migraciones con Alembic
- Donut chart individual por empleado en EmployeeProfilePage
- Limpieza de emojis antiprofesionales → reemplazar con iconos SVG

### Fase 3 — PENDIENTE
- Webhooks para n8n (6 workflows automáticos)
- Google Vision OCR (real)
- Salt Edge (conciliación bancaria real)

### Fase 4 — PENDIENTE
- JWT login, RBAC (employee / manager / admin)
- Migración frontend a Vite + React + TypeScript

### Fase 5 — PENDIENTE
- docker-compose.prod.yml, HTTPS, backups, monitorización

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
# URL temporal HTTPS (cambia al reiniciar)
cloudflared tunnel --url http://localhost:8000

# → https://xxxxx.trycloudflare.com  (compartir con cliente o socio)
```

---

## Flujo de trabajo colaborativo

Dos devs trabajan en ramas separadas:
```bash
git checkout -b feat/mi-feature
# ... cambios ...
git push origin feat/mi-feature
# → PR en GitHub → review → merge a main
```

Para sincronizar:
```bash
git pull origin main
```

Seedear datos demo tras clonar:
```bash
python demo_data_loader.py
```

---

## Decisiones de arquitectura confirmadas

- **Frontend**: mantener `dashboard.html` (React CDN) hasta Fase 4, entonces migrar a Vite
- **Auth**: no implementar hasta Fase 4 (demo no lo necesita)
- **OCR**: mock hasta Fase 3
- **Banco**: mock hasta Fase 3
- **Colima vs Docker Desktop**: usar Colima. Si falla, Docker Desktop como fallback
- **GitHub**: repo privado, rama principal `main`, feature branches para cambios

---

## Instrucciones para Claude

- **Siempre leer `backend/dashboard.html`** al trabajar en el frontend (no el root `dashboard.html`)
- **Siempre copiar** tras editar: `cp backend/dashboard.html dashboard.html`
- El frontend es un **SPA de archivo único** — toda la UI está en ese fichero
- Para cambios no triviales: usar modo plan antes de implementar
- Para explorar el código: usar subagentes Explore (mantener contexto limpio)
- Verificar que el backend responde antes de trabajar en frontend: `curl http://localhost:8000/health`
- Los datos demo se siembran con `python demo_data_loader.py` desde la raíz del proyecto
