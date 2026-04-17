# ExpensIQ — Plan de Producción v2.0
**Versión:** 2.0 | **Fecha:** 2026-03-30 | **Confidencial**

---

## 1. Situación actual y diagnóstico

### El cliente
Empresa de demolición industrial líder en España. ~150-160 empleados, facturación ~€38-50M, con hasta 4 grandes proyectos simultáneos activos (centrales térmicas, parques eólicos, industria pesada). Sede en Bizkaia (Hacienda Foral, no AEAT). Banco: Rural Kutxa (Ruralvía). Crecimiento interanual del +34%.

**Proceso actual:** Una empleada a tiempo completo recibe todos los tickets/recibos de los empleados, los introduce en Excel y reconcilia manualmente contra el extracto bancario de Ruralvía. Proceso completamente manual, sin visibilidad en tiempo real, sin control por proyecto, sin trazabilidad de auditoría.

### El producto
ExpensIQ es una demo funcional con el stack correcto (Next.js 14 + FastAPI + PostgreSQL) y funcionalidades core implementadas. El dominio `@lezama.es` ya está configurado en el sistema. La demo equivale al ~30% del camino hacia producción.

**Problemas críticos identificados:**
- Puerta trasera de desarrollo activa (`/auth/dev-login`)
- Credenciales en texto plano en el repositorio
- CORS abierto a todos los orígenes (`*`)
- 0 tests en toda la aplicación
- Sin audit trail (quién modificó qué, cuándo)
- Sin dimensión "proyecto" (gap funcional con el flujo real del cliente)
- Categorías de gasto genéricas (no adaptadas a construcción/demolición)

### El equipo
| Persona | Rol | Dedicación |
|---------|-----|------------|
| **Ricardo** | CEO, producto, comercial | Parcial |
| **Alejandro (CTO)** | Arquitectura, seguridad, desarrollo core | Principal |
| **Marcos** | Desarrollo (fases anteriores, disponible) | Según necesidad |
| **Claude Code** | Acelerador en todas las capas de desarrollo | Continuo |

---

## 2. Propuesta comercial y estructura de contrato

### Propuesta de valor

La empleada que hace el proceso manual cuesta aprox. €28.000-35.000/año (salario + SS). ExpensIQ elimina el 80% de ese trabajo en semanas. El ROI es positivo desde el primer mes.

**Argumento principal:** No es un gasto, es recuperar el tiempo de una persona para trabajo de más valor — o justificar no contratar a alguien nuevo cuando escalen.

**Argumento secundario:** Visibilidad en tiempo real del gasto por proyecto. Para una empresa que gestiona obras de €60M (As Pontes), saber cuánto llevan gastado en cada proyecto no es un lujo, es control operativo.

### Contexto de mercado (benchmarking)

Soluciones comparables para 150 usuarios en España/Europa:

| Solución | Coste anual aprox. (150 users) | Setup |
|----------|-------------------------------|-------|
| Expensify Control | ~€15.000 | €0 |
| Rydoo Pro | ~€18.000 | €0 |
| Pleo Essential | ~€20.000 | €0 |
| Captio Corporate (Emburse) | €18.000-27.000 | €3-10K |
| Tickelia | €14.000-27.000 | €5-15K |
| SAP Concur Professional | €16.000-27.000 | €5-20K |

Rango de mercado: **€14.000-25.000/año + setup de €3.000-20.000**. Las soluciones españolas nativas (Captio, Tickelia) cobran setup significativo por implementación. Las internacionales (Pleo, Rydoo) no cobran setup pero tienen suscripción más alta y menos personalización.

### Modelo de pricing recomendado

```
Opción A (recomendada):
  Setup:       €15.000 (fraccionable: 3 pagos de €5.000, meses 1-2-3)
  Mensual:     €990/mes
  Compromiso:  12 meses
  ──────────────────────────────
  Año 1:       €26.880
  Año 2+:      €11.880/año

Opción B (si el cliente prefiere simplicidad):
  Setup:       €0
  Mensual:     €1.500/mes
  Compromiso:  18 meses
  ──────────────────────────────
  Año 1:       €18.000
  18 meses:    €27.000
```

**Lógica del pricing:**

1. **Setup alto captura el valor de la personalización.** No es un SaaS genérico de autoservicio — incluye dimensión de proyectos para construcción, categorías del sector, migración de datos históricos, formación presencial, integración específica con Ruralvía. SAP Concur cobra €5-20K por esto. €15K es competitivo y justo.

2. **€990/mes sale de la comparación con salarios y entra en la de software.** A €6.60/usuario/mes, estamos por debajo de Rydoo (€10), Pleo (€11) y Captio (€10-15). La mensualidad ya no compite con la empleada manual — compite con Expensify.

3. **Año 2+ es muy competitivo.** €11.880/año frente a los €14.000-27.000 del mercado. El cliente siente que consigue un trato mejor cada año que permanece.

4. **Fraccionamiento del setup elimina la barrera** sin perder el valor percibido.

**Subvenciones potenciales (investigar):**
- **Kit Digital:** Empresas de 10-249 empleados pueden recibir hasta €12.000 para digitalización. Si Edrai se acredita como "Agente Digitalizador", el setup podría cubrirse con la subvención.
- **SPRI / Gobierno Vasco:** Programas adicionales de digitalización industrial en Bizkaia. La empresa, con certificación Zero Waste y sector de transición energética, podría cualificar.

### Documentos contractuales

Relación de confianza no excluye formalización. Tres documentos cortos protegen a ambas partes:

**1. Contrato de servicio (2-3 páginas)**
- Alcance: qué incluye (el SaaS, soporte, mantenimiento) y qué no (desarrollo a medida fuera de scope, hardware)
- Precio, forma de pago, renovación automática
- SLA: 99.5% uptime, <4h respuesta incidencia crítica en horario laboral
- Propiedad de datos: el cliente es propietario, puede exportar en cualquier momento
- Cláusula de salida: 30 días preaviso, entrega de datos en CSV/JSON
- Cláusula de confidencialidad mutua
- Responsabilidad limitada

**2. SLA detallado (1 página)**
- Definición de severidades (crítica/alta/normal)
- Tiempos de respuesta y resolución por severidad
- Backup diario, retención 30 días
- Ventana de mantenimiento: domingos 02:00-06:00 CET

**3. DPA — Data Processing Agreement (obligatorio GDPR)**
- Edrai Solutions = encargado del tratamiento
- Cliente = responsable del tratamiento
- Base legal: ejecución de contrato laboral + interés legítimo del responsable
- Datos tratados: datos identificativos de empleados, datos financieros (tickets, importes, transacciones bancarias)
- Subencargados explícitos: Railway (hosting), Google Cloud (OCR), Afterbanks (agregador bancario)
- Medidas de seguridad implementadas (ver sección 3 de este documento)
- Notificación de brechas: 48h al cliente, 72h a autoridad si aplica
- Ubicación de datos: UE (Railway EU region + Google Cloud europe-west)

**Nota Hacienda Foral:** El DPA debe referenciar la LOPD y la normativa foral de Bizkaia. Recomiendo revisión por abogado (~€500-800). No arrancar con datos reales sin DPA firmado.

---

## 3. Seguridad — Plan completo

Este es el componente más crítico del plan. Gestionamos datos financieros de empleados y transacciones bancarias reales. Un fallo de seguridad destruye la confianza del cliente y puede generar responsabilidad legal. **Alejandro es el responsable directo de toda esta sección.**

### 3.1 Estado actual de seguridad (diagnóstico)

| Área | Estado | Severidad |
|------|--------|-----------|
| Autenticación | Google OAuth + JWT funcional, pero existe `/auth/dev-login` que permite acceso sin credenciales | **CRÍTICA** |
| Secretos | DB password, MinIO keys, JWT secret hardcodeados en docker-compose y `.env.example` | **CRÍTICA** |
| CORS | Configurado como `*` (acepta peticiones de cualquier origen) | **ALTA** |
| Autorización | Roles existen pero algunos endpoints validan via header `X-User-Role` en vez de JWT claim | **ALTA** |
| Cifrado en tránsito | HTTPS solo si Railway lo provee; no forzado en backend | **MEDIA** |
| Cifrado en reposo | PostgreSQL sin cifrado de disco; MinIO sin server-side encryption | **MEDIA** |
| Audit trail | Inexistente — no hay registro de quién modificó un gasto ni cuándo | **ALTA** |
| Rate limiting | No existe — vulnerable a brute force y DDoS | **MEDIA** |
| Validación de input | Parcial — CSV upload sin validación de schema rigurosa | **MEDIA** |
| Logging | Básico, no estructurado, sin request IDs | **MEDIA** |
| Tests de seguridad | 0 tests de cualquier tipo | **CRÍTICA** |
| Dependencias | `fuzzywuzzy` sin actualizar desde 2017, `anthropic` desactualizado | **BAJA** |

### 3.2 Medidas de seguridad — Fase 0 (obligatorio antes del go-live)

**Delegado a: Alejandro (CTO)**

**Autenticación y autorización:**
- [ ] Eliminar completamente el endpoint `/auth/dev-login` del código
- [ ] Eliminar la variable `DEV_MODE` o asegurar que nunca se active en producción
- [ ] Migrar validación de roles de header `X-User-Role` a JWT claims verificados
- [ ] Implementar refresh tokens (el JWT actual expira en 8h sin renovación — UX mala)
- [ ] Añadir endpoint `/auth/logout` con blacklist de tokens (Redis o tabla PostgreSQL)
- [ ] Crear endpoint admin para gestión de roles (actualmente solo editable via BD directa)
- [ ] Configurar `ALLOWED_DOMAIN` como variable de entorno, no hardcodeado en código

**Gestión de secretos:**
- [ ] Mover TODOS los secretos a variables de entorno de Railway (nunca en código ni Docker Compose)
- [ ] Generar JWT_SECRET_KEY seguro (mínimo 256 bits, aleatorio)
- [ ] Rotar credenciales de PostgreSQL y MinIO (eliminar defaults `postgres/postgres` y `minioadmin/minioadmin`)
- [ ] Añadir `.env` al `.gitignore` si no está (verificar que no hay secretos commiteados en historial)
- [ ] Documentar en README qué variables de entorno son necesarias (sin valores reales)

**Protección de la API:**
- [ ] CORS: restringir a dominios explícitos (el dominio de producción + localhost para desarrollo)
- [ ] Rate limiting: implementar con `slowapi` o middleware custom (100 req/min por IP para API, 10/min para auth)
- [ ] Validar Content-Type en todos los endpoints que aceptan body
- [ ] Sanitizar nombres de archivo en upload de recibos (prevenir path traversal)
- [ ] Limitar tipos de archivo aceptados en upload (jpg, png, pdf solo)
- [ ] Validar schema de CSV antes de procesar import bancario (prevenir CSV injection)

**Cifrado:**
- [ ] Forzar HTTPS en producción (Railway lo provee, pero el backend debe redirigir HTTP→HTTPS)
- [ ] Habilitar server-side encryption en MinIO/S3 para imágenes de recibos
- [ ] Configurar `Secure`, `HttpOnly`, `SameSite=Strict` en cookies si se usan

**Audit trail (compliance):**
- [ ] Añadir campos `created_by`, `updated_by`, `updated_at` a tabla `receipts`
- [ ] Crear tabla `audit_log` para cambios sensibles: aprobaciones, rechazos, ediciones de importes, cambios de rol
- [ ] Cada entrada de audit: `timestamp`, `user_id`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `ip_address`
- [ ] Audit log inmutable — solo INSERT, nunca UPDATE ni DELETE

**Logging y monitoring:**
- [ ] Migrar a logs estructurados JSON (con `structlog` o `python-json-logger`)
- [ ] Incluir `request_id` único en cada petición (middleware) para trazabilidad
- [ ] Log de todos los eventos de auth: login, logout, login fallido, token expirado
- [ ] Sentry para captura de errores en producción (plan gratuito developer)
- [ ] Health check real: verificar conexión a DB y a MinIO, no solo devolver 200

### 3.3 Medidas de seguridad — Fase 2 (antes del rollout masivo)

**Delegado a: Alejandro (CTO)**

- [ ] Tests de seguridad automatizados en CI: dependency audit (`pip-audit`), secrets scanning (`trufflehog` o `detect-secrets`)
- [ ] Penetration testing básico: ejecutar OWASP ZAP contra la API de staging
- [ ] Backup automático de PostgreSQL: snapshots diarios en Railway, retención 30 días
- [ ] Backup de imágenes de recibos (MinIO → S3 cross-region o Railway backup)
- [ ] Plan de respuesta ante incidentes documentado (quién contactar, qué hacer, plazos legales)
- [ ] Revisión de dependencias: actualizar `fuzzywuzzy` a `thefuzz`, actualizar `anthropic`, eliminar `reportlab` si no se usa
- [ ] Política de rotación de secretos: JWT secret cada 90 días, DB password cada 180 días

### 3.4 Medidas de seguridad — Fase 3 (integración bancaria)

**Delegado a: Alejandro (CTO)**

La integración con Afterbanks introduce un vector de riesgo adicional: datos bancarios reales en tránsito.

- [ ] Afterbanks maneja la conexión PSD2 (su licencia AISP), pero los datos llegan a nuestro backend
- [ ] Cifrar tokens de acceso bancario en reposo (AES-256 o similar)
- [ ] No almacenar credenciales bancarias del usuario — Afterbanks gestiona el OAuth
- [ ] Log de cada sync bancario: timestamp, cuenta, nº de transacciones recibidas
- [ ] Validar integridad de datos recibidos de Afterbanks antes de insertar en BD
- [ ] Añadir Afterbanks como subencargado del tratamiento en el DPA

---

## 4. Gap crítico de producto: tracking por proyecto

**Descubrimiento clave del análisis.** La demo gestiona gastos por empleado y departamento. El cliente trabaja por **proyectos simultáneos** (As Pontes, parques eólicos, plantas industriales). Necesitan saber:

- ¿Cuánto se ha gastado en el Proyecto X este mes?
- ¿Qué empleados han imputado gastos al Proyecto Y?
- ¿Estamos dentro del presupuesto del Proyecto Z?

**Sin esto, la herramienta no encaja con su flujo real de trabajo.**

### Cambios necesarios

**Backend (Alejandro):**
- Nueva tabla `projects`: id, name, code, budget, status (active/completed/archived), start_date, end_date
- FK `project_id` en `receipts` y `bank_transactions`
- Endpoints CRUD de proyectos + dashboard de gastos por proyecto
- Endpoint de informe de cierre de proyecto

**Frontend (Alejandro):**
- Selector de proyecto en upload de recibo (obligatorio)
- Página `/projects` con listado y KPIs por proyecto
- Dashboard ejecutivo: barra de gasto vs presupuesto por proyecto activo
- Filtro por proyecto en todas las vistas (receipts, transactions, analytics)

**Estimación: 4-5 días con IA**

### Categorías de gasto para construcción/demolición

Las reglas de categorización actuales son genéricas. Actualizar para el sector:
- Maquinaria y equipos
- EPIs y seguridad laboral
- Combustible y transporte de obra
- Subcontratas
- Gestión de residuos / descontaminación
- Alojamiento en obra
- Dietas y manutención
- Material de oficina de obra
- Seguros y fianzas

---

## 5. Integración bancaria — decisión y hoja de ruta

### Diagnóstico de viabilidad

Ruralvía tiene API PSD2 activa vía Redsys (`market.apis-i.redsys.es/psd2/xs2a/nodos/cajarural`). Hay agregadores que ya la soportan.

| Opción | Tiempo | Coste mensual | Recomendación |
|--------|--------|---------------|---------------|
| CSV manual (actual) | Disponible ya | €0 | **Fase 1 — go-live inmediato** |
| Afterbanks (agregador PSD2 español, de Indra) | 2-4 semanas técnicas | ~€200-400 | **Fase 3 — mes 2-3** |
| Tink (Visa, alternativa europea) | 2-4 semanas técnicas | ~€0.50/user/mes | Backup si Afterbanks falla |
| AISP propio (licencia Banco de España) | 6-12 meses + €15-30K | €0 | **No viable ahora** |
| Scraping | — | — | **Descartado (ilegal PSD2)** |

**Estrategia definitiva:**
1. Go-live con CSV. La empleada ya exporta de Ruralvía. Solo cambia el destino.
2. Mes 2-3: Afterbanks. Sync diario automático, sin intervención manual.
3. Tink como plan B si Afterbanks no conecta bien con Ruralvía.
4. CSV como fallback permanente — nunca se elimina.

**Contacto Afterbanks:** `psd2.afterbanks.com` — registrar sandbox esta semana.
**Contacto RSI (soporte PSD2 Caja Rural):** `rsi_psd2@rsi.cajarural.com`

---

## 6. Roadmap técnico

### Principios
- Claude Code como acelerador en toda tarea de código (Alejandro lo usa activamente)
- No construir lo que no se necesita aún
- Cada merge a main pasa CI (tests + lint)
- Seguridad no es una fase, es un requisito continuo

---

### Fase 0 — Hardening y seguridad (Semana 1-2)
**Objetivo:** Código seguro y deployable. Sin esto no sale nada.
**Responsable principal: Alejandro**

| Tarea | Detalle | Días est. |
|-------|---------|-----------|
| Seguridad auth | Eliminar dev-login, migrar roles a JWT claims, refresh tokens | 2 |
| Secretos | Todo a variables Railway, rotar defaults, limpiar historial git | 1 |
| CORS + rate limiting + input validation | Ver sección 3.2 completa | 1.5 |
| Audit trail | Tabla audit_log + campos en receipts + middleware logging | 2 |
| Tests rutas críticas | OCR, reconciliación, anomaly detection, auth — mínimo 30 tests | 2.5 |
| CI/CD | GitHub Actions: tests en PR, deploy a Railway en merge a main | 1 |
| Logs estructurados + health checks | structlog JSON + request_id + health check real | 1 |

**Total: ~11 días con IA (~2 semanas)**

---

### Fase 1 — Adaptación al cliente y piloto (Semana 3-5)
**Objetivo:** Sistema en producción con datos reales. Piloto con la empleada administradora.

| Tarea | Responsable | Días est. |
|-------|-------------|-----------|
| Dimensión "proyecto" (modelo + API + frontend) | Alejandro | 4 |
| Categorías de gasto para construcción/demolición | Alejandro | 1 |
| Importar empleados reales desde CSV/listado de RRHH | Alejandro | 1 |
| Configurar proyectos activos y presupuestos | Ricardo + cliente | 1 |
| Formación de la empleada administradora (sesión presencial 2-3h) | Ricardo | 0.5 |
| Migrar 2-3 meses de datos históricos (recibos + extractos bancarios CSV) | Ricardo + empleada | 2 |
| Ajuste de alertas/umbrales según políticas reales de gastos del cliente | Ricardo + Alejandro | 1 |
| Deploy en Railway con dominio propio + SSL | Alejandro | 0.5 |

**Total: ~11 días (~2.5 semanas)**

**Hito:** Empleada trabajando en el sistema con datos reales. Periodo de validación de 2-3 semanas.

---

### Fase 2 — Rollout completo (Semana 6-9)
**Objetivo:** Todos los empleados activos. Sistema estable, monitorizado, útil.

| Tarea | Responsable | Días est. |
|-------|-------------|-----------|
| Onboarding empleados por lotes (email invitación + Google OAuth) | Ricardo | 1 |
| App móvil PWA: foto ticket desde móvil → OCR automático (Google Cloud Vision) | Alejandro | 4 |
| Informe mensual/quincenal PDF por proyecto (descargable) | Alejandro | 2 |
| Dashboard ejecutivo: vista resumen por proyecto activo | Alejandro | 2 |
| Security Fase 2: dependency audit en CI, backups automáticos, pen-test básico | Alejandro | 2 |
| Iteración sobre feedback de la empleada y primeros usuarios | Alejandro + Ricardo | 2 |

**Total: ~13 días (~2.5 semanas)**

**Hito:** Organización completa usando el sistema. Empleada administradora ya no toca Excel.

---

### Fase 3 — Integración bancaria automática (Semana 8-12, paralelo a Fase 2)
**Objetivo:** Eliminar el paso manual de exportar CSV del banco.

| Tarea | Responsable | Días est. |
|-------|-------------|-----------|
| Registrar sandbox Afterbanks, probar conexión Ruralvía | Alejandro | 1 |
| Conector Afterbanks → ExpensIQ (sync diario de transacciones) | Alejandro | 4 |
| UI para autorización bancaria (flujo OAuth del banco) | Alejandro | 2 |
| Security Fase 3: cifrado tokens bancarios, logging de syncs, DPA actualizado | Alejandro | 1.5 |
| Testing reconciliación con datos bancarios reales | Alejandro + empleada | 2 |
| CSV como fallback manual permanente | — | Ya existe |

**Total: ~10.5 días**

**Hito:** Las transacciones bancarias llegan solas. La empleada solo revisa y aprueba.

---

### Fase 4 — IA avanzada (Mes 4+, bajo demanda)
**Objetivo:** El sistema aprende del comportamiento real del cliente.

| Feature | Descripción |
|---------|-------------|
| Categorización adaptativa | Cuando la empleada corrige una categoría, el modelo aprende para tickets similares |
| Anomaly detection por proyecto | Alertas calibradas por historial real de cada proyecto, no reglas genéricas |
| Forecasting por proyecto | Predicción de gastos restantes según avance de obra |
| Alerta proactiva de presupuesto | Notificación cuando un proyecto supera el 80% del presupuesto |
| Detección de duplicados inteligente | ML para detectar mismo gasto subido por dos empleados diferentes |

---

## 7. Timeline consolidado

```
Semana 1-2:    Fase 0 — Seguridad + hardening        [Alejandro]
Semana 3-5:    Fase 1 — Adaptación + piloto           [Alejandro + Ricardo]
Semana 6-9:    Fase 2 — Rollout completo              [Alejandro + Ricardo]
Semana 8-12:   Fase 3 — Integración bancaria          [Alejandro] (paralelo)
Mes 4+:        Fase 4 — IA avanzada                   [Alejandro] (bajo demanda)
```

**Go-live con datos reales (piloto): semana 5**
**Rollout completo: semana 9**
**Banco automático: semana 12**

---

## 8. Infraestructura y costes operativos

### Hosting (Railway, región EU)
| Servicio | Coste estimado |
|----------|----------------|
| PostgreSQL (managed) | ~€15-25/mes |
| Backend (FastAPI) | ~€20-30/mes |
| Frontend (Next.js) | ~€15-20/mes |
| Redis (para token blacklist + cache) | ~€10-15/mes |
| **Subtotal hosting** | **~€60-90/mes** |

### APIs externas
| Servicio | Uso | Coste estimado |
|----------|-----|----------------|
| Google Cloud Vision (OCR) | 1.000 unidades/mes gratis, luego $1.50/1000 | **€0** (free tier cubre ~500 tickets/mes con margen) |
| Anthropic Claude (forecasting, categorización IA) | ~200-400 llamadas/mes | ~€15-30/mes |
| Afterbanks (a partir de Fase 3) | Sync diario Ruralvía | ~€100-300/mes |
| Google OAuth | Incluido en Google Workspace del cliente | €0 |
| Sentry (error monitoring) | Plan developer | €0 |
| GitHub Actions (CI/CD) | Free tier para repos privados | €0 |

### Resumen financiero mensual

```
Costes operativos (Fase 1-2):    ~€75-120/mes
Costes operativos (con banco):   ~€175-420/mes
Ingreso por suscripción:          €990/mes
────────────────────────────────────────────
Margen neto mensual (sin banco): ~€870-915/mes
Margen neto mensual (con banco): ~€570-815/mes
Margen neto anual:               ~€6.840-10.980/año
(+ €15.000 setup fee en año 1)
Total año 1:                     ~€21.840-25.980 neto
Año 2+:                          ~€6.840-10.980 neto
```

**Nota:** Los márgenes del año 1 son sanos gracias al setup fraccionado que cubre los costes de desarrollo de Fase 0-1. A partir del año 2, el negocio es recurrente con margen >50%. Cada cliente adicional que se sume al mismo producto multiplica el margen sin multiplicar el coste de desarrollo.

---

## 9. Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación | Responsable |
|--------|-------|---------|------------|-------------|
| La empleada rechaza el cambio de proceso | Media | Alto | Implicarla desde Fase 1 como "validadora", no como sujeto pasivo. Sesión presencial de formación. | Ricardo |
| Afterbanks no conecta bien con Ruralvía | Baja | Medio | Probar en sandbox antes de comprometerse. Tink como plan B. CSV permanente como fallback. | Alejandro |
| OCR falla con tickets de obra (sucios, arrugados, al sol) | Alta | Medio | Google Cloud Vision es robusto con imágenes de baja calidad. Permitir corrección manual fácil. | Alejandro |
| Datos históricos de mala calidad | Alta | Bajo | Migración histórica es best-effort. El valor está en los datos nuevos. | Ricardo |
| Brecha de seguridad antes de hardening | Media | Crítico | **No poner datos reales hasta completar Fase 0.** Sin excepciones. | Alejandro |
| Hacienda Foral requiere formato específico de justificantes | Media | Alto | Investigar requisitos de Bizkaia para justificantes de gastos antes de Fase 1. | Ricardo |
| El cliente pide features fuera de scope antes de pagar | Media | Medio | Contrato firmado antes de Fase 1 con scope claro. Features adicionales = nuevo presupuesto. | Ricardo |
| Railway tiene downtime prolongado | Baja | Alto | Railway EU tiene 99.95% SLA. Plan de contingencia: migración a Render/Fly.io en 1 día. | Alejandro |

---

## 10. Delegación a Alejandro (CTO) — resumen ejecutivo

### Qué necesita antes de empezar
1. Acceso al repositorio (ya lo tiene): `https://github.com/ricardopm01/expensiq-demo`
2. Leer todo el contexto del proyecto: `CLAUDE.md`, `PLAN_PRODUCCION.md`, `DEMO_SCRIPT.md`, `PARTNER_GUIDE.md`
3. Levantar el stack local con `./start.sh` y probar la demo completa
4. Revisar el código de auth (`backend/app/core/auth.py`) y entender las vulnerabilidades actuales

### Lo que se espera de él

**Fase 0 (semana 1-2):** Seguridad y hardening. Es la fase más crítica. Todo lo de la sección 3.2 de este documento. No se despliega con datos reales hasta que esté completo. Incluye montar CI/CD y tests mínimos.

**Fase 1 (semana 3-5):** Dimensión "proyecto" + categorías del sector + deploy producción. Trabaja con Ricardo para entender el flujo real del cliente.

**Fase 2 (semana 6-9):** PWA móvil (foto→OCR), informes PDF por proyecto, security hardening fase 2. Itera sobre feedback real de usuarios.

**Fase 3 (semana 8-12):** Integración Afterbanks. Puede empezar a registrar el sandbox en paralelo desde la semana 1.

### Lo que NO se espera de él
- Comercial ni comunicación con el cliente (eso es de Ricardo)
- Documentación legal ni contratos
- Decisiones de pricing

### Herramientas que debe usar
- **Claude Code** en todo momento — acelera x2-3 el desarrollo
- **GitHub Actions** para CI/CD (no deploy manual)
- **Railway** para hosting (ya configurado por Marcos)
- **Sentry** para monitoring de errores (free tier)

---

## 11. Próximos pasos inmediatos

### Esta semana (Ricardo)
- [ ] Enviar propuesta económica al cliente (Opción A: setup + mensual)
- [ ] Contactar abogado para DPA y contrato de servicio (~€500-800)
- [ ] Investigar requisitos de justificantes de gasto de Hacienda Foral de Bizkaia

### Esta semana (Alejandro)
- [ ] Leer contexto completo del proyecto (CLAUDE.md + este plan + código)
- [ ] Levantar stack local y probar la demo end-to-end
- [ ] Arrancar Fase 0: empezar por eliminar `/auth/dev-login` y mover secretos
- [ ] Registrar cuenta sandbox en Afterbanks (`psd2.afterbanks.com`) para explorar

### Semana que viene
- [ ] Sesión de kick-off con la empleada de Lezama (Ricardo) — entender su flujo exacto
- [ ] Alejandro avanza hardening + CI/CD
- [ ] Diseñar juntos el modelo de proyectos con las necesidades reales del cliente

### Antes de Fase 1 (bloqueo)
- [ ] DPA firmado (obligatorio antes de introducir datos reales de empleados)
- [ ] Contrato de servicio firmado
- [ ] Fase 0 completada al 100% (security checklist verde)

---

*Plan generado: 2026-03-30 | Próxima revisión: tras kick-off con cliente*
*Documento vivo — actualizar tras cada fase completada*
