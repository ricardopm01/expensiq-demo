# PARTNER GUIDE — ExpensIQ Demo

> Guía de onboarding para el socio de desarrollo. Cubre setup de entorno, flujo de trabajo y colaboración.

---

## El proyecto en 2 minutos

**ExpensIQ** es una demo para cliente de un sistema de gestión de gastos con IA.

**Stack**: FastAPI (Python) + PostgreSQL + MinIO + Metabase + React 18 (SPA en un solo HTML)
**Infra**: Docker Compose (4 servicios)
**Ramas activas**: `main` (producción demo), feature branches para cambios

---

## Setup inicial (una sola vez)

### 1. Clonar el repositorio

```bash
git clone git@github.com:edrai-solutions/expensiq-demo.git
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
curl http://localhost:8000/health
# → {"status":"ok"}
```

Abre http://localhost:8000 en el navegador.

### 6. Sembrar datos demo

```bash
python demo_data_loader.py
```

---

## URLs del proyecto

| Servicio | URL | Credenciales |
|---|---|---|
| Dashboard | http://localhost:8000 | — |
| API Docs (Swagger) | http://localhost:8000/docs | — |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| Metabase BI | http://localhost:3100 | (configurar en primera visita) |

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
docker compose logs -f backend   # solo backend
docker compose logs -f           # todos los servicios
```

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

### Regla 3 — Editar siempre `backend/dashboard.html`

El frontend es un solo archivo React. La ubicación canónica es `backend/dashboard.html`.
Tras cada cambio, copiar:

```bash
cp backend/dashboard.html dashboard.html
```

(El `start.sh` no lo hace automáticamente, es responsabilidad del dev.)

---

## Compartir tu trabajo con Ricardo (o con el cliente)

Para que Ricardo vea tu estado sin hacer deploy:

```bash
# Instalar cloudflared
curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz" \
  -o /tmp/cloudflared.tgz && tar -xzf /tmp/cloudflared.tgz -C /tmp && \
  mv /tmp/cloudflared ~/.local/bin/ && chmod +x ~/.local/bin/cloudflared

# Abrir tunnel (mientras el stack esté corriendo)
cloudflared tunnel --url http://localhost:8000
# → genera una URL tipo https://xxxx.trycloudflare.com
# Comparte esa URL por WhatsApp/Slack y podrá ver tu dashboard en tiempo real
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
- Para aplicar cambios al frontend: Claude edita `backend/dashboard.html` y copia al root

---

## Estructura de fases

| Fase | Estado | Descripción |
|---|---|---|
| 1 | **COMPLETADA** | Perfiles empleado, modal recibo, filtros, charts clickables |
| 2 | Pendiente | Approve/reject, edición OCR, export CSV, donut charts por empleado |
| 3 | Pendiente | n8n workflows, Google Vision OCR, Salt Edge banco |
| 4 | Pendiente | JWT auth, RBAC, migración a Vite+TypeScript |
| 5 | Pendiente | Producción (HTTPS, backups, monitorización) |

---

## Problemas frecuentes

**El dashboard no refleja mis cambios:**
→ Asegúrate de haber editado `backend/dashboard.html` y haber copiado al root.
→ Hard refresh en el navegador: Cmd+Shift+R

**Docker no arranca:**
→ Si usas Colima: `export LIMA_DATA_HOME="$HOME/.local/share" && colima start ...`
→ Si usas Docker Desktop: abre la app y espera a que el daemon esté listo

**Error "exec format error" en contenedor:**
→ Asegúrate de que `DOCKER_DEFAULT_PLATFORM=linux/amd64` está en tu `.env`
→ O ejecuta: `export DOCKER_DEFAULT_PLATFORM=linux/amd64 && docker compose up -d`

**La API no responde:**
→ `docker compose logs backend` para ver el error
→ `docker compose restart backend` para reiniciar solo el backend
