# ExpensIQ — Sistema Inteligente de Gestión de Gastos

Sistema de gestión de gastos con IA que automatiza la extracción de datos de recibos (OCR), conciliación bancaria y detección de anomalías.

## Inicio rápido

```bash
# 1. Configurar variables de entorno
cp .env.example .env

# 2. Arrancar todos los servicios
docker compose up --build

# 3. Abrir el dashboard
open http://localhost:8000
```

## Servicios

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Dashboard** | http://localhost:8000 | Interfaz principal |
| **API Docs** | http://localhost:8000/docs | Documentación Swagger |
| **MinIO Console** | http://localhost:9001 | Almacenamiento de archivos |
| **Metabase** | http://localhost:3100 | Business Intelligence |

## Uso de la demo

1. Abre http://localhost:8000
2. Verifica que el indicador de la sidebar muestre "API conectada" (verde)
3. Haz clic en **"Sincronizar banco y reconciliar"** en el Dashboard
4. Explora las páginas: Recibos, Transacciones, Alertas, Empleados

## Arquitectura

```
Frontend (React SPA) → FastAPI Backend → PostgreSQL
                                       → MinIO (S3)
                                       → Metabase (BI)
```

## Stack técnico

- **Backend**: Python 3.11, FastAPI, SQLAlchemy, Pydantic
- **Frontend**: React 18 (SPA servida por FastAPI)
- **Base de datos**: PostgreSQL 15
- **Almacenamiento**: MinIO (compatible S3)
- **OCR**: Tesseract (local) / Mock (demo)
- **Infraestructura**: Docker Compose
