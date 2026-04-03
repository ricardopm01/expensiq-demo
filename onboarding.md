    1 # ExpensIQ — Guía de Onboarding Técnico
    2
    3 > Documento de incorporación para nuevos miembros del equipo técnico.
    4 > Objetivo: que puedas entender la arquitectura completa y empezar a trabajar sin depender de nadie.
    5
    6 ---
    7
    8 ## 1. ¿Qué es ExpensIQ?
    9
   10 ExpensIQ es un sistema de gestión de gastos con IA para empresas. Resuelve un problema muy concreto: una empleada recibe facturas físicas, las f   
      otografía, las organiza en Excel y verifica manualmente contra extractos bancarios. ExpensIQ automatiza ese flujo completo:
   11
   12 ```
   13 Fotografía factura → OCR extrae datos → Categorización automática
   14 → Conciliación contra banco → Alertas si hay anomalías → Aprobación por nivel
   15 ```
   16
   17 Es una **demo para cliente**, no un producto en producción. Está diseñada para mostrar el flujo completo de forma convincente.
   18
   19 ---
   20
   21 ## 2. Vista general de la arquitectura
   22
   23 ```
   24 ┌─────────────────────────────────────────────────────────────┐
   25 │                    USUARIO (navegador)                      │
   26 └───────────────────────────┬─────────────────────────────────┘
   27                             │ HTTP (puerto 3000)
   28                             ▼
   29 ┌─────────────────────────────────────────────────────────────┐
   30 │              FRONTEND  Next.js 14 + TypeScript              │
   31 │                    (frontend/ → puerto 3000)                │
   32 │  Reescribe /api/v1/* → http://backend:8000/api/v1/*         │
   33 └───────────────────────────┬─────────────────────────────────┘
   34                             │ HTTP (puerto 8000)
   35                             ▼
   36 ┌─────────────────────────────────────────────────────────────┐
   37 │              BACKEND  FastAPI + Python 3.11                 │
   38 │                   (backend/ → puerto 8000)                  │
   39 │  • OCR (mock o Claude Vision)                               │
   40 │  • Motor de conciliación fuzzy                              │
   41 │  • Detección de anomalías con IA                            │
   42 │  • Predicción de gastos por empleado                        │
   43 └──────────┬────────────────┬────────────────────────────────┘
   44            │                │
   45            ▼                ▼
   46 ┌──────────────────┐  ┌────────────────────────────────────┐
   47 │  PostgreSQL 15   │  │  MinIO (almacenamiento S3-local)   │
   48 │  (puerto 5432)   │  │  (puerto 9000 API / 9001 consola)  │
   49 │  Base de datos   │  │  Imágenes de recibos subidas       │
   50 └──────────────────┘  └────────────────────────────────────┘
   51
   52 ┌─────────────────────────────────────────────────────────────┐
   53 │              Metabase  (BI / dashboards)                    │
   54 │                       puerto 3100                           │
   55 │  Se conecta directo a PostgreSQL                            │
   56 └─────────────────────────────────────────────────────────────┘
   57 ```
   58
   59 ---
   60
   61 ## 3. Stack tecnológico — por qué se eligió cada cosa
   62
   63 | Capa | Tecnología | Por qué |
   64 |---|---|---|
   65 | Frontend | Next.js 14 + TypeScript | Framework React con routing, proxy API integrado, build optimizado |
   66 | Estilos | Tailwind CSS | Utility-first, rápido de prototipar sin CSS custom |
   67 | Iconos | Lucide React | Librería de iconos consistente, tree-shakeable |
   68 | Gráficas | Recharts | Charts React-native, fácil de componer |
   69 | Backend | FastAPI (Python) | Async, documentación automática (Swagger), muy rápido de desarrollar |
   70 | ORM | SQLAlchemy | ORM maduro para Python, compatible con Alembic para migraciones |
   71 | Validación API | Pydantic | Schemas tipados en Python, genera documentación OpenAPI automáticamente |
   72 | Base de datos | PostgreSQL 15 | Relacional robusto, soporte UUID nativo, usado en producción real |
   73 | Almacenamiento | MinIO | Compatible con S3 de AWS pero corre local, sin coste en demo |
   74 | BI | Metabase | Dashboards sin código, se conecta directo a PostgreSQL |
   75 | OCR | Mock (demo) / Claude Vision (prod) | Mock para velocidad en demo, Claude Vision para producción real |
   76 | IA | Claude (Anthropic) | Detección anomalías, predicción gastos, OCR real |
   77 | Contenedores | Docker + Docker Compose | Todo el stack levanta con un comando, reproducible en cualquier máquina |
   78
   79 ---
   80
   81 ## 4. Docker — qué es y cómo funciona aquí
   82
   83 ### ¿Qué es Docker?
   84
   85 En un backend convencional, instalas Python, PostgreSQL, etc. directamente en tu máquina. El problema: "en mi máquina funciona" — versiones dist   
      intas, dependencias que chocan, configuraciones diferentes.
   86
   87 **Docker resuelve esto con contenedores**: paquetes aislados que incluyen el código + todas sus dependencias + el sistema operativo mínimo neces   
      ario. Son como mini-máquinas virtuales, pero mucho más ligeras.
   88
   89 ```
   90 Sin Docker:                          Con Docker:
   91 Tu máquina                           Tu máquina
   92 ├── Python 3.9 (para otro proyecto)  ├── Docker Engine
   93 ├── Python 3.11 (para ExpensIQ)      │   ├── contenedor: backend (Python 3.11 aislado)
   94 ├── PostgreSQL 14 (instalado)        │   ├── contenedor: db (PostgreSQL 15 aislado)
   95 └── conflictos, configuración manual └── contenedor: frontend (Node.js aislado)
   96 ```
   97
   98 ### Docker Compose
   99
  100 Si Docker gestiona un contenedor, **Docker Compose** gestiona múltiples contenedores como un sistema coordinado. ExpensIQ tiene 5 servicios defi   
      nidos en `docker-compose.yml`:
  101
  102 ```yaml
  103 services:
  104   db:        # PostgreSQL 15 — base de datos
  105   minio:     # MinIO — almacenamiento de imágenes
  106   backend:   # FastAPI — API Python
  107   frontend:  # Next.js — interfaz web
  108   metabase:  # Metabase — dashboards BI
  109 ```
  110
  111 Cada servicio tiene:
  112 - **`image`** o **`build`**: usa una imagen pública (db, minio, metabase) o construye desde un Dockerfile (backend, frontend)
  113 - **`ports`**: `"8000:8000"` = puerto_host:puerto_contenedor
  114 - **`volumes`**: monta carpetas del host dentro del contenedor (permite hot-reload)
  115 - **`depends_on`**: define el orden de arranque y espera healthchecks
  116 - **`environment`**: variables de entorno para configurar el servicio
  117
  118 ### Diferencia clave con un backend convencional
  119
  120 ```
  121 Backend convencional (Flask/Django local):
  122   python app.py → corre en tu máquina directamente
  123   PostgreSQL instalado en localhost:5432
  124   → Problema: funciona solo en tu máquina con tu configuración
  125
  126 Backend con Docker (ExpensIQ):
  127   docker compose up → levanta TODOS los servicios automáticamente
  128   El backend ve PostgreSQL en db:5432 (hostname del contenedor)
  129   → Funciona igual en cualquier máquina del equipo
  130 ```
  131
  132 ### Comandos Docker esenciales para este proyecto
  133
  134 ```bash
  135 # Levantar todo (primera vez o tras cambios en Dockerfile)
  136 docker compose up --build
  137
  138 # Levantar todo (sin reconstruir imágenes)
  139 docker compose up
  140
  141 # Parar todo
  142 docker compose down
  143
  144 # Ver logs en tiempo real
  145 docker compose logs -f backend
  146 docker compose logs -f frontend
  147
  148 # Entrar a un contenedor (como SSH)
  149 docker compose exec backend bash
  150 docker compose exec db psql -U postgres expensiq
  151
  152 # Ver estado de los contenedores
  153 docker compose ps
  154
  155 # Reconstruir solo un servicio
  156 docker compose up --build backend
  157 ```
  158
  159 ### Nota importante sobre este proyecto (Windows)
  160
  161 El proyecto fue desarrollado originalmente en Mac con **Colima** como runtime Docker. En Windows se usa **Docker Desktop** directamente — los co   
      mandos `docker compose` son idénticos. Si ves referencias a `colima` o `LIMA_DATA_HOME` en los scripts, son específicas de Mac y puedes ignorarl   
      as.
  162
  163 ---
  164
  165 ## 5. Estructura completa del proyecto
  166
  167 ```
  168 expensiq-demo/
  169 │
  170 ├── docker-compose.yml          ← Orquesta los 5 servicios
  171 ├── .env.example                ← Plantilla de variables de entorno
  172 ├── .env                        ← Variables locales (no commitear)
  173 ├── start.sh                    ← Script arranque (Mac/Colima específico)
  174 ├── demo_data_loader.py         ← Carga datos demo en la BD
  175 ├── CLAUDE.md                   ← Instrucciones para la IA del equipo
  176 ├── DEMO_SCRIPT.md              ← Guion demo para cliente (7 actos, ~18 min)
  177 │
  178 ├── backend/                    ← FastAPI Python
  179 │   ├── Dockerfile
  180 │   ├── requirements.txt
  181 │   ├── schema.sql              ← DDL completo (se aplica automáticamente al arrancar DB)
  182 │   └── app/
  183 │       ├── main.py             ← Entry point: registra rutas, CORS, lifespan
  184 │       ├── core/
  185 │       │   ├── config.py       ← Settings desde variables de entorno
  186 │       │   └── auth.py         ← Google OAuth + JWT
  187 │       ├── db/
  188 │       │   └── session.py      ← SQLAlchemy engine + SessionLocal
  189 │       ├── models/
  190 │       │   └── models.py       ← Modelos ORM (tablas de la BD)
  191 │       ├── schemas/
  192 │       │   └── schemas.py      ← Pydantic schemas (request/response de la API)
  193 │       ├── routes/
  194 │       │   ├── auth.py         ← GET/POST /api/v1/auth/*
  195 │       │   ├── employees.py    ← CRUD /api/v1/employees
  196 │       │   ├── receipts.py     ← Upload, filtros, aprobación /api/v1/receipts
  197 │       │   ├── transactions.py ← Sync banco, conciliación /api/v1/transactions
  198 │       │   ├── alerts.py       ← Alertas, AI scan /api/v1/alerts
  199 │       │   ├── analytics.py    ← KPIs, tendencias, forecast /api/v1/analytics
  200 │       │   └── periods.py      ← Quincenas /api/v1/periods
  201 │       ├── services/
  202 │       │   ├── categorizer.py      ← Categorización de gastos + AnomalyDetector
  203 │       │   ├── reconciliation.py   ← Motor fuzzy matching recibo ↔ banco
  204 │       │   ├── ai_anomaly.py       ← Detección anomalías con Claude
  205 │       │   ├── ai_forecast.py      ← Predicción gasto próximo mes con Claude
  206 │       │   ├── storage.py          ← Interface MinIO/S3
  207 │       │   └── email_service.py    ← Recordatorios quincenales por email
  208 │       └── ocr/
  209 │           ├── processor.py        ← Router OCR: despacha a mock o claude
  210 │           ├── mock_provider.py    ← OCR simulado para demo
  211 │           └── claude_provider.py  ← OCR real con Claude Vision (OCR_PROVIDER=claude)
  212 │
  213 └── frontend/                   ← Next.js 14 TypeScript
  214     ├── Dockerfile
  215     ├── package.json
  216     ├── next.config.mjs         ← Proxy /api/v1/* → backend:8000
  217     ├── tailwind.config.ts
  218     └── src/
  219         ├── app/                ← Páginas (App Router de Next.js)
  220         │   ├── layout.tsx      ← Layout global (sidebar + header + footer)
  221         │   ├── page.tsx        ← Dashboard principal (KPIs, gráficas)
  222         │   ├── receipts/       ← Gestión de recibos
  223         │   ├── transactions/   ← Transacciones bancarias
  224         │   ├── alerts/         ← Alertas del sistema
  225         │   ├── employees/      ← Directorio + perfil por empleado
  226         │   ├── approvals/      ← Cola de aprobaciones
  227         │   └── profile/        ← Vista empleado (vista personal)
  228         ├── components/
  229         │   ├── ui.tsx          ← Componentes reutilizables (Card, KPICard, Btn...)
  230         │   ├── sidebar.tsx     ← Navegación lateral
  231         │   ├── header.tsx      ← Cabecera + selector de rol
  232         │   ├── toast.tsx       ← Notificaciones toast
  233         │   └── receipt-detail-modal.tsx ← Modal detalle recibo
  234         ├── lib/
  235         │   ├── api.ts          ← Fetch wrapper tipado (api.get, api.post, etc.)
  236         │   └── format.ts       ← Helpers de formato (moneda, fecha, %)
  237         └── types/
  238             └── index.ts        ← Interfaces TypeScript + lookup maps UI
  239 ```
  240
  241 ---
  242
  243 ## 6. Base de datos — modelos y relaciones
  244
  245 La base de datos es PostgreSQL 15. El schema se aplica automáticamente desde `backend/schema.sql` al arrancar el contenedor `db` por primera vez   
      .
  246
  247 ### Modelos (tablas)
  248
  249 ```
  250 employees ──────────────────────────────────────────────────────
  251   id (UUID PK)     name           email (unique)
  252   department       role           monthly_budget
  253   google_id        is_active      last_login
  254
  255 receipts ───────────────────────────────────────────────────────
  256   id (UUID PK)     employee_id (FK→employees)
  257   merchant         date           amount         currency
  258   tax              category       status
  259   ocr_confidence   ocr_raw_text   ocr_provider
  260   payment_method   line_items     notes
  261   approval_level   approved_by (FK→employees)   approved_at
  262   image_url        upload_timestamp
  263
  264 bank_transactions ──────────────────────────────────────────────
  265   id (UUID PK)     employee_id (FK→employees)
  266   external_id      date           merchant
  267   amount           currency       account_id
  268
  269 matches ────────────────────────────────────────────────────────
  270   id (UUID PK)
  271   receipt_id (FK→receipts)
  272   transaction_id (FK→bank_transactions)
  273   confidence       match_method
  274   UNIQUE(receipt_id, transaction_id)
  275
  276 alerts ─────────────────────────────────────────────────────────
  277   id (UUID PK)     employee_id (FK→employees)
  278   receipt_id (FK→receipts)
  279   alert_type       description    severity
  280   is_read          resolved       resolved_at
  281
  282 periods ────────────────────────────────────────────────────────
  283   id (UUID PK)     start_date     end_date
  284   status (open|closed)            closed_at
  285
  286 employee_period_status ─────────────────────────────────────────
  287   employee_id (FK)  period_id (FK)
  288   status (open|closed|reopened)   reopened_at
  289   UNIQUE(employee_id, period_id)
  290 ```
  291
  292 ### Diagrama de relaciones simplificado
  293
  294 ```
  295 employees (1) ──< receipts (many)       -- un empleado tiene muchos recibos
  296 receipts (1)  ──< matches (many)        -- un recibo puede tener varios matches
  297 bank_transactions (1) ──< matches       -- una transacción puede matchear varios recibos
  298 employees (1) ──< alerts                -- alertas vinculadas a un empleado
  299 receipts (1)  ──< alerts                -- alertas vinculadas a un recibo
  300 periods (1) ──< employee_period_status  -- estado por empleado en cada quincena
  301 ```
  302
  303 ### Valores de `status` en `receipts`
  304
  305 | Valor | Significado |
  306 |---|---|
  307 | `pending` | Recién subido, esperando OCR |
  308 | `processing` | OCR en proceso |
  309 | `matched` | Conciliado con transacción bancaria (confianza ≥ 0.6) |
  310 | `review` | Match encontrado pero baja confianza (0.4-0.6) |
  311 | `flagged` | Marcado como sospechoso por IA |
  312 | `rejected` | Rechazado en flujo de aprobación |
  313
  314 ### Workflow de aprobación (por importe)
  315
  316 ```
  317 < 100€  → approval_level: "auto"     → se aprueba automáticamente
  318 ≥ 100€  → approval_level: "admin"    → requiere usuario con role=admin
  319 ```
  320
  321 ---
  322
  323 ## 7. Backend — cómo funciona FastAPI
  324
  325 ### Entry point (`backend/app/main.py`)
  326
  327 FastAPI registra todos los routers al arrancar:
  328
  329 ```python
  330 app.include_router(receipts.router, prefix="/api/v1/receipts")
  331 app.include_router(employees.router, prefix="/api/v1/employees")
  332 # ... etc.
  333 ```
  334
  335 También ejecuta código de arranque (`lifespan`): crea el bucket en MinIO y arranca el scheduler de recordatorios de quincenas.
  336
  337 ### Patrón de un endpoint típico
  338
  339 ```python
  340 # backend/app/routes/receipts.py
  341 @router.get("/", response_model=List[ReceiptOut])
  342 def list_receipts(
  343     employee_id: Optional[str] = None,
  344     category: Optional[str] = None,
  345     db: Session = Depends(get_db),          # inyección de sesión BD
  346     current_user: Employee = Depends(get_current_user),  # auth JWT
  347 ):
  348     query = db.query(Receipt)
  349     if employee_id:
  350         query = query.filter(Receipt.employee_id == employee_id)
  351     if category:
  352         query = query.filter(Receipt.category == category)
  353     return query.all()
  354 ```
  355
  356 - **`Depends(get_db)`**: inyecta una sesión de base de datos (se cierra automáticamente al terminar)
  357 - **`Depends(get_current_user)`**: verifica el JWT Bearer token y devuelve el usuario autenticado
  358 - **`response_model`**: Pydantic serializa automáticamente el resultado al schema definido
  359
  360 ### Documentación automática
  361
  362 FastAPI genera Swagger UI automáticamente en `http://localhost:8000/docs`. Puedes probar todos los endpoints desde el navegador sin necesidad de   
       Postman.
  363
  364 ### Motor de conciliación fuzzy (`backend/app/services/reconciliation.py`)
  365
  366 El algoritmo calcula una puntuación de confianza entre un recibo y una transacción bancaria:
  367
  368 ```
  369 confianza = (50% × score_importe) + (30% × score_fecha) + (20% × score_merchant)
  370
  371 score_importe:  1.0 si diferencia < 5%, 0.0 si diferencia ≥ 5%
  372 score_fecha:    1.0 si mismo día, 0.0 si diferencia > 3 días
  373 score_merchant: fuzzy string matching (fuzzywuzzy) entre nombres de comercio
  374
  375 confianza ≥ 0.6  → status = "matched"
  376 confianza 0.4-0.6 → status = "review"
  377 confianza < 0.4  → sin match
  378 ```
  379
  380 ---
  381
  382 ## 8. Frontend — cómo funciona Next.js 14
  383
  384 ### App Router
  385
  386 Next.js 14 usa el **App Router**: cada carpeta dentro de `src/app/` con un `page.tsx` se convierte en una ruta automáticamente:
  387
  388 ```
  389 src/app/page.tsx              → http://localhost:3000/
  390 src/app/receipts/page.tsx     → http://localhost:3000/receipts
  391 src/app/employees/[id]/page.tsx → http://localhost:3000/employees/abc-123
  392 ```
  393
  394 ### `'use client'` — todas las páginas son client-side
  395
  396 En este proyecto, **todas las páginas tienen `'use client'`** arriba. Esto significa que se renderizan en el navegador (como React tradicional),   
       no en el servidor. Se tomó esta decisión porque la app es muy interactiva y usa muchos hooks de estado.
  397
  398 ### Proxy API (`next.config.mjs`)
  399
  400 El frontend no llama al backend directamente con `http://localhost:8000`. En su lugar, usa rutas relativas `/api/v1/*` que Next.js redirige al b   
      ackend:
  401
  402 ```javascript
  403 // next.config.mjs
  404 rewrites: async () => [{
  405   source: '/api/v1/:path*',
  406   destination: 'http://backend:8000/api/v1/:path*'
  407 }]
  408 ```
  409
  410 Esto permite que el frontend y el backend sean independientes — el navegador solo habla con el frontend en el puerto 3000.
  411
  412 ### Cómo hacer una llamada a la API
  413
  414 ```typescript
  415 // Siempre usar el wrapper tipado de @/lib/api
  416 import { api } from '@/lib/api';
  417 import { Receipt } from '@/types';
  418
  419 // GET
  420 const receipts = await api.get<Receipt[]>('/receipts');
  421
  422 // POST
  423 const result = await api.post<Receipt>('/receipts', { merchant: 'Repsol', amount: 45.0 });
  424
  425 // PATCH
  426 await api.patch('/receipts/abc-123', { status: 'review' });
  427
  428 // Upload archivo
  429 const formData = new FormData();
  430 formData.append('file', imageFile);
  431 const receipt = await api.upload<Receipt>('/receipts/upload', formData);
  432 ```
  433
  434 ### Tipos TypeScript
  435
  436 Los tipos en `src/types/index.ts` son mirrors exactos de los schemas Pydantic del backend. Si se añade un campo en el backend, hay que añadirlo    
      también aquí.
  437
  438 ---
  439
  440 ## 9. Variables de entorno
  441
  442 Copia `.env.example` a `.env` antes de arrancar:
  443
  444 ```bash
  445 cp .env.example .env
  446 ```
  447
  448 Variables clave:
  449
  450 | Variable | Valor por defecto | Descripción |
  451 |---|---|---|
  452 | `DATABASE_URL` | `postgresql://postgres:postgres@db:5432/expensiq` | Conexión PostgreSQL |
  453 | `OCR_PROVIDER` | `mock` | `mock` para demo, `claude` para producción real |
  454 | `ANTHROPIC_API_KEY` | vacío | Necesario si `OCR_PROVIDER=claude` o para funciones IA |
  455 | `S3_ENDPOINT` | `http://minio:9000` | MinIO local |
  456 | `AWS_ACCESS_KEY_ID` | `minioadmin` | Credenciales MinIO |
  457 | `AWS_SECRET_ACCESS_KEY` | `minioadmin` | Credenciales MinIO |
  458 | `CORS_ORIGINS` | `["*"]` | En producción, cambiar a dominio específico |
  459
  460 ---
  461
  462 ## 10. URLs del sistema
  463
  464 | Servicio | URL | Descripción |
  465 |---|---|---|
  466 | Frontend | http://localhost:3000 | Interfaz principal |
  467 | Backend API | http://localhost:8000 | API REST |
  468 | Swagger / Docs | http://localhost:8000/docs | Documentación interactiva de la API |
  469 | MinIO Console | http://localhost:9001 | Gestión de archivos (user: minioadmin) |
  470 | Metabase | http://localhost:3100 | Dashboards BI |
  471
  472 ---
  473
  474 ## 11. Cómo arrancar el proyecto (Windows)
  475
  476 ```bash
  477 # 1. Clonar e ir al directorio
  478 git clone <repo-url>
  479 cd expensiq-demo
  480
  481 # 2. Configurar variables de entorno
  482 cp .env.example .env
  483
  484 # 3. Levantar todo con Docker
  485 docker compose up --build
  486
  487 # Esperar ~2-3 minutos a que todos los servicios estén healthy
  488 # Verificar que el backend responde:
  489 curl http://localhost:8000/health
  490 # → {"status": "ok"}
  491
  492 # 4. Cargar datos demo
  493 python demo_data_loader.py
  494
  495 # 5. Abrir el frontend
  496 # http://localhost:3000
  497 ```
  498
  499 Para desarrollo del **frontend sin Docker** (hot-reload más rápido):
  500
  501 ```bash
  502 cd frontend
  503 npm install
  504 npm run dev
  505 # → http://localhost:3000
  506 # El backend sigue corriendo en Docker
  507 ```
  508
  509 ---
  510
  511 ## 12. Flujo de trabajo con Git
  512
  513 El proyecto usa feature branches:
  514
  515 ```bash
  516 # Crear rama para tu feature
  517 git checkout -b feat/mi-feature
  518
  519 # Desarrollar...
  520 git add <archivos específicos>
  521 git commit -m "feat: descripción del cambio"
  522 git push origin feat/mi-feature
  523
  524 # Abrir PR en GitHub → review → merge a main
  525 ```
  526
  527 Para sincronizar con lo que han hecho los otros:
  528
  529 ```bash
  530 git pull origin main
  531 ```
  532
  533 ---
  534
  535 ## 13. Fases del proyecto (historial de lo construido)
  536
  537 El proyecto se construyó en fases incrementales. Todo está completado:
  538
  539 | Fase | Lo que se hizo |
  540 |---|---|
  541 | **Fase 1** | Backend completo: 14+ endpoints, OCR mock, conciliación fuzzy, anomaly detection |
  542 | **Fase A** | Migración frontend a Next.js 14 + TypeScript + Tailwind (reemplaza SPA legacy) |
  543 | **Fase B** | Claude Vision OCR real, detección anomalías IA, severidad en alertas, line items |
  544 | **Fase C** | Workflow aprobación multinivel, dashboard enriquecido, selector de rol, /approvals |
  545 | **Fase D** | Vistas empleado vs admin, import CSV/Excel bancario Rural Kutxa, drag-and-drop |
  546 | **Fase E** | Responsive mobile, skeleton screens, datos demo definitivos españoles |
  547 | **Fase F** | Comparativa por departamento, predicción IA por empleado, alertas de presupuesto |
  548
  549 ---
  550
  551 ## 14. Puntos de atención para el desarrollo
  552
  553 1. **NO editar** `backend/dashboard.html` — es legacy y está deprecated. Todo el trabajo va en `frontend/src/`.
  554
  555 2. **Tipos sincronizados**: cuando añadas campos en el backend (SQLAlchemy model + Pydantic schema), actualiza también `frontend/src/types/index   
      .ts`.
  556
  557 3. **OCR en demo**: por defecto usa mock (datos falsos simulados). Para activar Claude Vision real: `OCR_PROVIDER=claude` + `ANTHROPIC_API_KEY=s   
      k-ant-...` en `.env`.
  558
  559 4. **Datos demo**: si necesitas datos frescos, ejecuta:
  560    ```bash
  561    # Limpiar todo y sembrar de nuevo
  562    curl -X DELETE http://localhost:8000/api/v1/demo/reset
  563    python demo_data_loader.py
  564    ```
  565
  566 5. **Migraciones de BD**: el proyecto usa Alembic para cambios de schema. Si modificas `models.py`, necesitas generar una migración.
  567
  568 6. **Auth en producción**: el sistema tiene Google OAuth + JWT implementado (Fase 1 backend). En el frontend hay un selector de rol simulado par   
      a la demo. Para un cliente real, habría que activar el flujo OAuth completo.
  569
  570 ---
  571
  572 ## 15. Acceso rápido a los archivos más importantes
  573
  574 | Si necesitas... | Mira aquí |
  575 |---|---|
  576 | Añadir un endpoint | `backend/app/routes/<nombre>.py` |
  577 | Cambiar la BD | `backend/app/models/models.py` + `backend/schema.sql` |
  578 | Validación request/response API | `backend/app/schemas/schemas.py` |
  579 | Lógica de negocio | `backend/app/services/` |
  580 | Nueva página frontend | `frontend/src/app/<ruta>/page.tsx` |
  581 | Componente reutilizable | `frontend/src/components/ui.tsx` |
  582 | Tipos TypeScript | `frontend/src/types/index.ts` |
  583 | Llamadas a la API | `frontend/src/lib/api.ts` |
  584 | Configuración Docker | `docker-compose.yml` |
  585 | Variables de entorno | `.env` (local) / `.env.example` (template) |