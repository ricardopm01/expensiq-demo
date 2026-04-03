# ExpensIQ — Sistema Inteligente de Gestión de Gastos

Sistema de gestión de gastos con IA que automatiza la extracción de datos de recibos (OCR), conciliación bancaria y detección de anomalías.

## Inicio rápido

```bash
# 1. Configurar variables de entorno
cp .env.example .env

# 2. Arrancar todos los servicios (Mac ARM64: usa start.sh, gestiona Colima automáticamente)
./start.sh

# En otros sistemas:
docker compose up --build

# 3. Abrir el frontend
open http://localhost:3000
```

## Servicios

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Frontend** | http://localhost:3000 | Interfaz Next.js 14 |
| **Backend API** | http://localhost:8000 | FastAPI + Swagger |
| **API Docs** | http://localhost:8000/docs | Documentación Swagger |
| **MinIO Console** | http://localhost:9001 | Almacenamiento de archivos |
| **Metabase** | http://localhost:3100 | Business Intelligence |

## Uso de la demo

1. Abre http://localhost:3000
2. Introduce el email de cualquier usuario demo y pulsa **Entrar** (sin contraseña)
3. Explora las páginas: Recibos, Transacciones, Alertas, Empleados, Quincenas

Usuarios disponibles:

| Email | Rol |
|---|---|
| `miguel@empresa.com` | Administrador |
| `carlos@empresa.com` | Manager |
| `ana@empresa.com` | Empleada |

Para cambiar de usuario: botón de cierre de sesión abajo a la izquierda en la barra lateral.

## Arquitectura

```
Next.js 14 Frontend (:3000) → FastAPI Backend (:8000) → PostgreSQL
                                                       → MinIO (S3)
                                                       → Metabase (BI)
```

## Stack técnico

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Recharts, Lucide React
- **Backend**: Python 3.11, FastAPI, SQLAlchemy, Pydantic
- **Base de datos**: PostgreSQL 15
- **Almacenamiento**: MinIO (compatible S3)
- **OCR**: Mock (demo) / Claude Vision (activar con `OCR_PROVIDER=claude`)
- **Infraestructura**: Docker Compose (5 servicios)

## Desarrollo

```bash
# Frontend (desarrollo local)
cd frontend && npm install && npm run dev

# Backend (via Docker)
docker compose up backend db minio
```

Ver `CLAUDE.md` para documentación completa y `PARTNER_GUIDE.md` para onboarding.
