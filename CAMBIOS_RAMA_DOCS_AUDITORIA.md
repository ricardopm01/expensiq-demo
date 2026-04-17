# Cambios en rama `docs/auditoria-admin-2026-04-17`

**Autor:** Ricardo Pichardo (con asistencia de Claude)
**Fecha:** 2026-04-17
**Tipo:** Documentación + cambios UX pendientes de commit + nuevo roadmap
**Estado:** Listo para revisión por Alejandro. Ricardo hace merge manual a `main`.

---

## Qué incluye esta rama

Esta rama agrupa cambios que estaban sin commitear en `main` desde la auditoría CEO del 2026-04-16, más el nuevo documento de auditoría admin del 2026-04-17. Se ha trabajado a propósito en una rama separada para que Alejandro pueda revisarlo antes de mezclarlo con `main`.

### 1. Auditoría CEO 2026-04-16 (ya explicada en CLAUDE.md, sin commit)

- **Sidebar admin**: "Quincenas" eliminado como ítem de navegación. Se accede al panel de quincenas desde el widget del dashboard. `frontend/src/components/sidebar.tsx`.
- **Pills de quincena en `/receipts`**: eliminados los botones "Esta quincena / Quincena anterior / Todo" porque los filtros de fecha ya cubren el caso. Código muerto (`getFortnightRange`, `applyPeriodFilter`, etc.) también retirado. `frontend/src/app/receipts/page.tsx` (via `page.tsx` del dashboard que sí entra en esta rama).
- **Predicción IA reubicada**: en `/employees/[id]`, la predicción se mueve al final de la página (tras el desglose por categoría). `frontend/src/app/employees/[id]/page.tsx`.
- **role-context**: ajustes menores para que el token espere al `status === 'authenticated'` antes de cargar datos en páginas hijas. `frontend/src/lib/role-context.tsx`.
- **periods/page.tsx**: fix de timing para la race condition documentada en CLAUDE.md.
- **demo_data.json**: re-generado con fechas relativas al 2026-04.
- **CLAUDE.md**: registra la decisión de quincenas fuera del sidebar y el nuevo orden de secciones en el perfil del empleado. Esta rama también añade una sección `Documentos vivos` que enlaza al nuevo documento de auditoría (ver abajo).

### 2. AUDITORIA_PLAN_MEJORA_2026-04-17.md (nuevo)

**Este es el entregable principal de esta rama.** Documento de auditoría UX admin y roadmap de 5 sprints, escrito desde la perspectiva de la admin de Lezama. Incluye:

- **5 hallazgos críticos** (bugs de comportamiento), el más importante: la auto-aprobación de recibos pequeños está declarada en Fase C pero **inactiva en el código** (`backend/app/routes/receipts.py:561` fija `status="pending"` sin consultar `approval_level`).
- **Hallazgos UX por sección** del panel admin (dashboard, recibos, transacciones, alertas, aprobaciones, empleados).
- **Roadmap de 5 sprints** (~3-4 semanas) con archivos clave por sprint.
- **Sección permanente "Preguntas abiertas a Lezama"** (16 preguntas en 6 categorías) — para usar en la primera reunión con el cliente tras la firma. No implementar features relacionadas antes de respuesta.
- **Corrección de datos del cliente**: 150-160 empleados (no 50-100 como se había dicho por error); hasta 4 proyectos simultáneos; Hacienda Foral Bizkaia.

### 3. PLAN_PRODUCCION.md (commit pendiente de 2026-03-30)

Documento que nunca llegó a commitearse en su momento. Es el plan de producción v2.0 con:
- Diagnóstico ejecutivo del cliente.
- Propuesta comercial (pricing: €15k setup + €990/mes, o €1.500/mes sin setup).
- Benchmarking de competidores (Expensify, Pleo, Captio, Tickelia, SAP Concur).
- Timeline de camino a producción.
- Problemas críticos de seguridad y código (puerta trasera `/auth/dev-login`, credenciales en plain text, CORS abierto, 0 tests, sin audit trail).

Lo incluimos aquí porque estaba sin versionar y tiene información comercial relevante.

### 4. Facturas ejemplo (archivos binarios)

`Factura Ejemplo.jpeg` y `Recibo Ejemplo.jpeg` — material real para pruebas del OCR. Útil en desarrollo local y en tests futuros.

### 5. CLAUDE.md — nueva sección "Documentos vivos"

Se ha añadido al final de `CLAUDE.md` una sección que enlaza al documento de auditoría nuevo y lo declara como **roadmap activo** del proyecto. `CLAUDE.md` sigue siendo fuente de verdad para stack, arquitectura y convenciones; el roadmap del día a día vive en `AUDITORIA_PLAN_MEJORA_2026-04-17.md` y se actualiza sprint a sprint.

---

## Qué **no** incluye esta rama

- **Cambios de código del Sprint 1 (fix auto-aprobación)**: van en rama separada `feat/sprint1-auto-approval-real`. Se abre en paralelo y depende de esta.
- **Archivos de la herramienta `graphify`** (`.graphifyignore`, `graphify-out/`): son salida de una herramienta personal, no parte del producto.

---

## Cómo revisar

1. Abrir `AUDITORIA_PLAN_MEJORA_2026-04-17.md` y leer entero. La sección 7 (Preguntas abiertas a Lezama) es la más importante — que Alejandro añada o corrija cualquier pregunta que falte.
2. Confirmar que el nuevo enlace en `CLAUDE.md` apunta correctamente al documento.
3. Revisar el diff de los archivos de la auditoría CEO (son cambios ya acordados el 2026-04-16 pero no commiteados; si hay diferencia entre lo que acordamos y lo que está en el diff, corregirlo).

---

## Siguiente paso

Una vez mergeado esto a `main`, abrir la rama `feat/sprint1-auto-approval-real` para implementar el fix descrito en la sección 3 del documento (hallazgos críticos C1, C2, C3).
