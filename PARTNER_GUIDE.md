# PARTNER GUIDE — ExpensIQ Demo

> Guía de onboarding para el socio de desarrollo. Cubre setup de entorno, flujo de trabajo y colaboración.

---

## El proyecto en 2 minutos

**ExpensIQ** es una demo para cliente de un sistema de gestión de gastos con IA.

**Stack**:
- **Backend**: FastAPI (Python) + PostgreSQL + MinIO + Metabase
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + Recharts
- **Infra**: Docker Compose (5 servicios: db, minio, backend, frontend, metabase)

**Ramas activas**: `main` (producción demo), feature branches para cambios

---

## Setup inicial (una sola vez)

### 1. Clonar el repositorio

```bash
git clone git@github.com:ricardopm01/expensiq-demo.git
cd expensiq-demo
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# No necesitas cambiar nada para la demo local
```

### 3. Docker runtime

**Opción A — Colima** (recomendado, gratis, arranca en 15s):

```bash
# Instalar binarios (Mac ARM64)
mkdir -p ~/.local/bin

# Colima
curl -L "https://github.com/abiosoft/colima/releases/latest/download/colima-Darwin-arm64" \
  -o ~/.local/bin/colima && chmod +x ~/.local/bin/colima

# Lima (dependencia de Colima)
curl -L "https://github.com/lima-vm/lima/releases/download/v2.1.0/lima-2.1.0-Darwin-arm64.tar.gz" \
  -o /tmp/lima.tar.gz && mkdir -p /tmp/lima-extract && \
  tar -xzf /tmp/lima.tar.gz -C /tmp/lima-extract && \
  cp /tmp/lima-extract/bin/* ~/.local/bin/ && \
  mkdir -p ~/.local/share && cp -r /tmp/lima-extract/share/lima ~/.local/share/

# Añadir a PATH si no está
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

**Opción B — Docker Desktop**: Descarga desde docker.com. Más lento pero funciona igual.

### 4. Arrancar el proyecto

```bash
./start.sh
```

Eso es todo. Los servicios tardan ~30s en estar listos la primera vez (descarga de imágenes).

### 5. Verificar que funciona

```bash
# Backend
curl http://localhost:8000/health
# → {"status":"ok"}

# Frontend
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# → 200
```

Abre http://localhost:3000 en el navegador para el frontend Next.js.

### 6. Sembrar datos demo

```bash
python demo_data_loader.py
```

---

## URLs del proyecto

| Servicio | URL | Descripción |
|---|---|---|
| Frontend (Next.js) | http://localhost:3000 | Interfaz principal |
| Backend API | http://localhost:8000 | API + legacy dashboard |
| API Docs (Swagger) | http://localhost:8000/docs | Documentación interactiva |
| MinIO Console | http://localhost:9001 | Almacenamiento (minioadmin/minioadmin) |
| Metabase BI | http://localhost:3100 | Business Intelligence |

---

## Flujo de trabajo diario

### Arrancar

```bash
./start.sh
```

### Parar

```bash
docker compose down
```

### Ver logs

```bash
docker compose logs -f backend    # solo backend
docker compose logs -f frontend   # solo frontend
docker compose logs -f            # todos los servicios
```

### Desarrollo frontend (sin Docker)

Si prefieres trabajar directamente en el frontend sin Docker:

```bash
cd frontend
npm install    # solo la primera vez
npm run dev    # → http://localhost:3000
```

Requiere que el backend esté corriendo (via Docker o directamente).

---

## Cómo colaboramos

### Regla 1 — Feature branches

Nunca commits directos a `main`. Siempre rama propia:

```bash
git checkout -b feat/nombre-de-tu-feature
git add ...
git commit -m "feat: descripción del cambio"
git push origin feat/nombre-de-tu-feature
# → Crear PR en GitHub → Ricardo revisa → merge
```

### Regla 2 — Sincronizar antes de empezar

```bash
git pull origin main
```

### Regla 3 — Frontend en `frontend/`

El frontend es una app Next.js 14 en el directorio `frontend/`. Edita los archivos dentro de `frontend/src/`.

**NO editar** `backend/dashboard.html` — es el frontend legacy (deprecated).

Estructura principal:
- Páginas: `frontend/src/app/` (cada carpeta es una ruta)
- Componentes: `frontend/src/components/`
- API client: `frontend/src/lib/api.ts`
- Tipos: `frontend/src/types/index.ts`

---

## Compartir tu trabajo con Ricardo (o con el cliente)

Para que Ricardo vea tu estado sin hacer deploy:

```bash
# Instalar cloudflared (si no lo tienes)
curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz" \
  -o /tmp/cloudflared.tgz && tar -xzf /tmp/cloudflared.tgz -C /tmp && \
  mv /tmp/cloudflared ~/.local/bin/ && chmod +x ~/.local/bin/cloudflared

# Compartir el frontend
cloudflared tunnel --url http://localhost:3000
# → genera una URL tipo https://xxxx.trycloudflare.com
# Comparte esa URL por WhatsApp/Slack
```

---

## Trabajar con Claude en este proyecto

Abre Claude Code en la carpeta del proyecto:

```bash
cd expensiq-demo
claude
```

Claude leerá automáticamente el `CLAUDE.md` de la raíz y tendrá todo el contexto: fases del proyecto, decisiones de arquitectura, reglas de desarrollo y estado actual. No necesitas explicarle nada.

Comandos útiles al trabajar con Claude:
- Para tareas complejas (3+ pasos): Claude entra en modo plan automáticamente
- Para buscar código específico: Claude usa subagentes para no consumir contexto
- Para aplicar cambios al frontend: Claude edita archivos en `frontend/src/`

---

## Estructura de fases

| Fase | Estado | Descripción |
|---|---|---|
| 1 | **COMPLETADA** | Backend completo, 14+ endpoints, OCR mock, reconciliación |
| A | **COMPLETADA** | Frontend Next.js 14 (reemplaza SPA monolítico) |
| B | **COMPLETADA** | Claude Vision OCR + detección anomalías con IA |
| C | **COMPLETADA** | Workflow aprobación multinivel + dashboard enriquecido |
| D | **SIGUIENTE** | Import CSV bancario + predicción presupuesto IA (ver HANDOFF_FASE_D.md) |
| E | Pendiente | Pulido visual + datos demo definitivos |

---

## Problemas frecuentes

**El frontend no carga:**
→ Verifica que el servicio frontend está corriendo: `docker compose logs frontend`
→ Si trabajas sin Docker: `cd frontend && npm run dev`

**La API no responde desde el frontend:**
→ El proxy está en `frontend/next.config.mjs` — redirige `/api/*` a `localhost:8000`
→ Verifica: `curl http://localhost:8000/health`

**Docker no arranca:**
→ Si usas Colima: `export LIMA_DATA_HOME="$HOME/.local/share" && colima start ...`
→ Si usas Docker Desktop: abre la app y espera a que el daemon esté listo

**Error "exec format error" en contenedor:**
→ Asegúrate de que `DOCKER_DEFAULT_PLATFORM=linux/amd64` está en tu `.env`

**Error de tipos en el frontend:**
→ `cd frontend && npx next build` para ver errores de TypeScript
→ Los tipos del frontend deben coincidir con los schemas Pydantic del backend

**La API no responde:**
→ `docker compose logs backend` para ver el error
→ `docker compose restart backend` para reiniciar solo el backend
