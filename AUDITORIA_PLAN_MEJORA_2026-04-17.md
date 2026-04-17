# Auditoría UX admin y plan de mejora — ExpensIQ / Lezama

**Fecha:** 2026-04-17
**Autor:** Ricardo Pichardo (Edrai Solutions) con asistencia de Claude
**Audiencia:** equipo interno (Ricardo, Alejandro, Marcos) y sus Claudes
**Estado del proyecto al escribir esto:** Fase G cerrada. Auditoría CEO superficial (2026-04-16) ya aplicada. Aún sin firma de Lezama.

---

## 1. TL;DR

Tras ponernos en la piel de la admin de Lezama (demolición industrial, ~150-160 empleados, hasta 4 grandes proyectos simultáneos, €38-50M facturación, hoy lleva los gastos en Excel) detectamos 5 hallazgos críticos en código/UX y un conjunto de fricciones en cada sección del panel admin. El más importante: **la auto-aprobación de recibos pequeños existe sólo en el diseño, no en el código — todos los recibos quedan `pending` independientemente del importe**. Proponemos un roadmap de **5 sprints (~3-4 semanas)** que prioriza arreglar el flujo de aprobaciones, clarificar el dashboard, añadir los campos de construcción específicos (obra/proyecto, desglose IVA) y dejar alertas y reconciliación accionables. Cuestiones de integración (SAP, subcontratistas, política de gastos, obras, retenciones) se listan en la **sección 7 como preguntas abiertas a Lezama** — ningún sprint debe implementar esas decisiones antes de la firma.

---

## 2. Contexto y metodología

**Cliente:** Lezama. Empresa líder de demolición industrial en España. ~150-160 empleados. €38-50M facturación. Crecimiento interanual +34%. Hasta 4 grandes proyectos simultáneos (centrales térmicas, parques eólicos, industria pesada) con obras que pueden llegar a €60M cada una (referencia: As Pontes en PLAN_PRODUCCION.md). Sede en Bizkaia — régimen fiscal **Hacienda Foral, no AEAT**. Banco: Rural Kutxa / Ruralvía. Stack interno: SAP (ERP), Google Workspace @lezama.es. La admin objetivo hoy recibe facturas físicas, las fotografía, las organiza en Excel y concilia contra los extractos a mano.

**Nota sobre dimensiones reales (corregido 2026-04-17)**: versiones iniciales de este documento mencionaban "50-100 empleados" — dato erróneo. `PLAN_PRODUCCION.md` v2.0 (2026-03-30) establece 150-160 empleados como cifra de referencia.

**Por qué esta auditoría ahora:** La auditoría CEO anterior (2026-04-16, ver sección al final del `CLAUDE.md`) hizo polish superficial de la UI pero no simuló un día real de trabajo de la admin. Ricardo, al volver a recorrer la app, detectó que el botón "Aprobar todos" contradice lo que él pensaba haber pedido: que los recibos por debajo de cierto umbral se auto-aprobaran. La intuición es correcta — y apunta a un bug real, no sólo a una preferencia de UX.

**Método usado:**

1. Exploración del código con dos subagentes `Explore` en paralelo:
   - Uno sobre el flujo de aprobación (backend `receipts.py` + frontend `/approvals`).
   - Otro sobre las páginas del panel admin (dashboard, recibos, transacciones, alertas, aprobaciones, empleados, sidebar).
2. Contraste con CLAUDE.md (lo que "debería" estar según Fase C).
3. Simulación del flujo de la admin en un día típico: login → revisar pendientes → conciliar banco → atender alertas → cerrar quincena.
4. Comparativa de referencias de mercado (Ramp, SAP Concur, Expensify, Pleo, Captio, Spendesk) — reutilizamos los aprendizajes de la auditoría CEO previa en lugar de repetirla.

**Fuera del alcance de este documento:**

- Deployment a producción (Vercel + Railway). Sigue en `PLANNING_PROXIMOS_PASOS.md`.
- Integración Google OAuth real con dominio @lezama.es (pendiente credenciales del cliente).
- Reestructuración del módulo de quincenas (ya funciona tras el fix de race condition del 2026-04-16).

---

## 3. Hallazgos críticos (bugs de comportamiento)

Estos son defectos del producto tal como está hoy, no meras mejoras de UX. Se arreglan antes que cualquier feature nueva.

| # | Hallazgo | Archivo:línea | Impacto | Severidad |
|---|---|---|---|---|
| **C1** | La auto-aprobación nunca se activa. Al terminar el OCR, `_process_receipt_ocr` fija `receipt.status = "pending"` de forma incondicional. El `approval_level` se calcula correctamente (`auto` si <100€) pero el status nunca refleja esa decisión. | `backend/app/routes/receipts.py:561` | La admin ve recibos de 5€ esperando aprobación manual. Incoherencia entre lo prometido y lo que hace el producto. | **Alta** |
| **C2** | Los niveles de aprobación son inconsistentes entre capas. El código backend sólo distingue `auto` / `admin` (2 niveles). El `demo_data_loader.py` genera recibos con 3 niveles (`auto` / `manager` / `director`). CLAUDE.md Fase C anuncia 3 niveles. El frontend muestra badges para 2. | `backend/app/routes/receipts.py:264-268` vs `demo_data_loader.py:68-75` | Si la admin filtra por "manager" en la UI verá resultados inconsistentes entre recibos seed y recibos reales. | **Alta** |
| **C3** | El campo `approved_by` nunca se guarda. El endpoint `approve_receipt` actualiza `approved_at` pero no captura el ID del aprobador desde el header `X-User-Role` / `X-User-ID`. Consecuencia: `approver_name` en el modal siempre es `NULL`. | `backend/app/routes/receipts.py:300` | Sin rastro de auditoría. Para Lezama (que pasa por SAP) esto es inaceptable contablemente. | **Alta** |
| **C4** | El informe PDF de quincena existe en backend (`pdf_report.py`, `/periods/{id}/report/pdf`) pero no tiene enlace visible desde la UI. Solo se puede descargar conociendo la URL. | Falta en `frontend/src/app/periods/page.tsx` y en `period-widget.tsx` | La admin no usará una funcionalidad que no ve. Lezama espera PDF por quincena para contabilidad. | Media |
| **C5** | La tabla de `/transactions` no muestra el estado de conciliación. Para ver qué transacciones quedaron sin recibo, la admin tiene que ejecutar "Conciliar todo" y después ir a Alertas. | `frontend/src/app/transactions/page.tsx` | Flujo opaco. Contradice el valor principal del producto (conciliación automática). | Media |

---

## 4. Hallazgos UX por sección

Descripción del estado actual y fricción que encontramos al ponernos en piel de la admin. Propuestas de acción se desarrollan en la sección 5.

### 4.1 Dashboard (`frontend/src/app/page.tsx`)

**Qué hay hoy:** 4 KPIs arriba (Gasto Total, Conciliados, En Revisión, Alertas), widget de Quincena, progreso conciliación, Top Gastadores (BarChart), Por Categoría (PieChart donut), Tendencia Mensual (AreaChart 6 meses), Comparativa Departamentos (barras con % presupuesto), Panel Aprobaciones (3 KPIs), Grid Empleados (8 tarjetas), Alertas Recientes (hasta 5). Total: **7-8 bloques visibles sin scroll** en pantalla 1440px.

**Fricción para la admin de Lezama:**
- No hay jerarquía clara entre "acción inmediata" y "tendencia histórica".
- Los gráficos no se leen si no ha mirado antes los datos; son decorativos hasta que el producto tenga 2-3 meses de uso real.
- El panel Aprobaciones repite información que ya está en el KPI "En Revisión" y en la página `/approvals`.
- El grid de empleados es útil para un director, no para la admin diaria.

### 4.2 Recibos (`frontend/src/app/receipts/page.tsx`)

**Qué hay hoy:** Upload (drag-and-drop), filtros avanzados colapsables (empleado, categoría, fechas, búsqueda), tabs de estado con contador (Todos / Pendiente / Conciliado / Revisar / Marcado), tabla con columnas Comercio, Empleado, Fecha, Importe, Categoría, Estado, Confianza OCR. Modal de detalle al clicar fila. Botón Exportar CSV.

**Fricción:**
- La tabla no explica **por qué** un recibo está en `pending` (¿espera OCR? ¿supera umbral? ¿tiene alerta?). La columna "Estado" es el qué, no el porqué.
- No hay ordenación por columnas (sí mencionado en el backlog P2 de `project_expensiq.md`).
- Los filtros son correctos, pero su granularidad da a entender que la admin va a filtrar por empleado + categoría + fecha constantemente. En la práctica el 80% del tiempo filtrará por "qué está pendiente".

### 4.3 Transacciones (`frontend/src/app/transactions/page.tsx`)

**Qué hay hoy:** 3 KPIs (Transacciones, Volumen, Último Resultado), dropzone de importación de extracto, acciones rápidas ("Demo Banco", "Conciliar Todo"), tabla con columnas Comercio, Fecha, Importe, Cuenta, ID Externo.

**Fricción:**
- No se ve en la tabla si una transacción está matcheada ni con qué recibo. Este es el hallazgo C5 de la tabla de críticos.
- "Conciliar Todo" devuelve un conteo ("X matches creados, Y alertas") pero no enlace directo a esos resultados.
- Para una empresa con banco Rural Kutxa que importará un extracto mensual, falta el paso "revisar las que no matchearon" como flujo explícito.

### 4.4 Alertas (`frontend/src/app/alerts/page.tsx`)

**Qué hay hoy:** Summary cards por tipo (`no_match`, `duplicate`, `policy_violation`, `no_receipt`, `rapid_repeat`), toggle Activas/Todas, botón AI Scan, lista de alertas con badge tipo + severidad, botones Leída / Resolver.

**Fricción:**
- Todas las alertas se presentan al mismo nivel visual. Una admin nueva no sabe si debería empezar por los `duplicate` o por los `policy_violation`.
- No hay sugerencia de acción. Si la alerta dice "duplicate", ¿qué hace la admin? ¿Llama al empleado? ¿Elimina uno de los dos recibos? ¿Marca como resuelta sin más?
- El botón "AI Scan" aparece como acción ad-hoc; no queda claro si se ejecuta solo periódicamente o sólo al pulsar.
- `severity` está en el modelo pero la UI no lo usa para ordenar ni agrupar.

### 4.5 Aprobaciones (`frontend/src/app/approvals/page.tsx`)

**Qué hay hoy:** 3 KPIs (Auto, Administrador, Aprobados Hoy), filtros por nivel y estado, tabla con checkbox + columnas Comercio, Empleado, Importe, Nivel, Estado, Fecha, botón por fila, botón "Aprobar N" cuando hay seleccionados. Checkbox y botón se deshabilitan según el rol del usuario.

**Fricción:**
- El batch approve funciona, pero no preselecciona nada. La admin tiene que marcar uno a uno incluso si todos son de 20€ sin alertas.
- La UI no diferencia visualmente "Aprobado automáticamente" vs "Aprobado por Fulano". Aunque esto es culpa en parte de C3 (el approver nunca se guarda), también sería útil un icono distinto para las auto-aprobaciones.
- No se muestra el motivo por el que un recibo concreto necesita aprobación: "Supera umbral auto (150€ > 100€)" o "Anomalía detectada por IA" o "Categoría sensible".

### 4.6 Empleados (`frontend/src/app/employees/page.tsx` y `[id]/page.tsx`)

**Qué hay hoy:** Directorio con KPIs (Total, Con Presupuesto, Departamentos), tabla, acciones Activar/Desactivar, import CSV, botón Añadir. Perfil individual con header, 4 KPIs, budget bar, donut por categoría, accordion con desglose y lista de recibos, predicción IA al final.

**Fricción:**
- La predicción IA genera insights correctos pero genéricos ("Se prevé un gasto de 420€ el próximo mes, confianza media"). Sin sugerencia de acción ni comparación con presupuesto restante queda como información sin verbo.
- Para la admin diaria, la página es informativa — no hace falta simplificarla. Pero el valor para ella está en "quién tiene recibos pendientes por mi lado", que no aparece destacado en el header del perfil.

### 4.7 Sidebar y navegación

6 ítems admin (Dashboard, Recibos, Transacciones, Alertas, Aprobaciones, Empleados), limpio tras la auditoría CEO. **OK, no tocamos.**

---

## 5. Plan de mejora — 5 sprints

Un sprint por PR (rama de Marcos → revisión Alejandro → merge Ricardo). Cada sprint incluye su propio `.md` describiendo los cambios, como ya hacemos.

### Sprint 1 — Aprobaciones reales (3-4 días)

Objetivo: cerrar los hallazgos críticos C1, C2 y C3, y darle a la admin una página de Ajustes donde configure los umbrales sin tocar código.

- **Activar auto-aprobación real.** En `backend/app/routes/receipts.py:561`, cambiar `receipt.status = "pending"` por lógica condicional:
  ```python
  receipt.approval_level = _calculate_approval_level(float(receipt.amount))
  if receipt.approval_level == "auto" and not _has_blocking_alerts(receipt):
      receipt.status = "approved"
      receipt.approved_at = datetime.utcnow()
  else:
      receipt.status = "pending"
  ```
  `_has_blocking_alerts` verifica que no haya alertas `policy_violation` o `duplicate` asociadas.
- **Extender niveles a 3.** En `_calculate_approval_level()` (`receipts.py:264-268`) devolver `auto` (<100€), `manager` (100-500€) o `director` (>500€). Actualizar `analytics.py` (`/approval-summary`) para devolver los tres contadores.
- **Capturar `approved_by`.** En `approve_receipt()` (`receipts.py:300`) leer `X-User-ID` del header, guardar en `receipt.approved_by`. Añadir join en la respuesta para poblar `approver_name`.
- **Nueva página `/settings`** (solo admin, `require_admin`). UI: toggle "Activar auto-aprobación" + 3 inputs numéricos para umbrales + botón guardar. Backend: tabla `settings` (id, key, value, updated_at, updated_by) o JSON config en `settings.json` (MVP). Leer en `_calculate_approval_level()` en lugar del hardcode.
- **UI: explicar por qué requiere aprobación.** En `/approvals` tabla, añadir columna `Motivo` con texto corto: "Importe 150€ > 100€" o "Alerta: posible duplicado". En el modal de detalle, mostrar el mismo motivo arriba.
- **UI: distinguir auto vs manual.** En `receipt-detail-modal.tsx:295-320`, si `approved_by == null AND approved_at != null` → badge "Aprobado automáticamente". Si no → badge "Aprobado por {approver_name} el {fecha}".

**Verificación:** subir recibo de 50€ (sin alertas) → status `approved` al terminar OCR, visible en dashboard como auto-aprobado. Subir de 250€ → pending, modal muestra "Requiere manager (250€ entre 100€ y 500€)". Cambiar umbral manager a 300€ en `/settings` → el mismo recibo ahora requiere sólo manager para importe <300€.

### Sprint 2 — Dashboard "Acción Hoy" y reconciliación visible (3-4 días)

Objetivo: que al abrir la app la admin sepa en 2 segundos qué tiene que hacer hoy, y cerrar el hallazgo C4 y C5.

- **Nuevo componente `AccionHoyBanner`** en `frontend/src/components/accion-hoy-banner.tsx`. Bloque horizontal arriba del dashboard admin con 4 números destacados: "X recibos pendientes mi revisión", "Y transacciones sin recibo", "Z empleados no han cerrado la quincena", "W alertas urgentes". Cada número es un link a la acción correspondiente con filtro aplicado.
- **Reorganizar dashboard.** Dejar visible: AccionHoyBanner + Tendencia Mensual + Alertas Recientes. Plegar bajo un acordeón "Análisis detallado": Top Gastadores, Por Categoría, Comparativa Departamentos, Grid Empleados. La admin puede expandir cuando quiera; el gerente/director verá datos analíticos si abre el acordeón.
- **Columna `match_status` en `/transactions`** (matched / unmatched / low-confidence <60%). El backend ya tiene esta info en el modelo `Match`. Añadir filtro rápido "Solo sin conciliar" como tab arriba de la tabla.
- **Enlace al PDF quincenal.** En `PeriodWidget` del dashboard añadir botón "Descargar informe" cuando la quincena esté cerrada. En `/periods` añadir botón por fila. Ambos apuntan a `/periods/{id}/report/pdf`.

**Verificación:** contadores del banner coinciden con los endpoints (`/analytics/approval-summary`, `/transactions?match_status=unmatched`, etc.). Clicar cada número navega al filtro correcto. El acordeón "Análisis detallado" mantiene su estado por sesión (localStorage). PDF descarga desde dashboard y desde `/periods`.

### Sprint 3 — Obra/proyecto y desglose IVA (4-5 días) [Lezama-específico]

Objetivo: las dos features construcción que Ricardo confirmó como in-scope. El resto (centro de coste, subcontratistas, retenciones) queda en sección 7.

- **Migración Alembic 0006 — Tabla `projects`.** Campos: `id`, `code` (unique, p.ej. `OBR-2026-042`), `name`, `description`, `active` (bool), `created_at`. Añadir `project_id` (nullable FK) en `receipts`.
- **Backend.** Nuevo route `/projects` (GET list, POST create, PATCH). Incluir `project` en el response de `/receipts` y en los filtros.
- **OCR.** Intentar extraer obra del texto del recibo si aparece un patrón `OBR-\d{4}-\d+` o palabras clave ("obra: ", "proyecto: "). Es un heurístico, no tiene por qué acertar siempre.
- **Frontend.**
  - En upload de recibo: selector de obra (combobox con autocompletado).
  - En modal detalle: campo editable "Obra".
  - En `/receipts`: filtro por obra.
  - En dashboard: nueva sección "Gasto por obra" (bar chart horizontal, top 10 obras). Bajo el acordeón "Análisis detallado".
  - Nueva página `/projects` para alta/baja (solo admin).
- **Migración Alembic 0007 — Desglose IVA.** Añadir `tax_base`, `tax_rate`, `tax_amount` (nullable) en `receipts`.
- **OCR.** El provider Claude Vision intenta desglosar base / IVA / total cuando es factura. Si no lo consigue, los campos quedan NULL y se pueden editar desde el modal.
- **Frontend.** En modal detalle, mostrar tabla de 3 filas (Base / IVA {rate}% / Total) con edición inline. En export CSV añadir columnas `tax_base`, `tax_rate`, `tax_amount`.

**Verificación:** crear obra "OBR-2026-001 Demolición Bilbao Centro". Asignarla a 5 recibos. Filtrar `/receipts?project=OBR-2026-001` muestra los 5. Export CSV con columna `obra` y `iva_base` / `iva_rate` / `iva_amount` pobladas. Dashboard "Gasto por obra" muestra la obra en el top.

### Sprint 4 — Alertas accionables y batch approve inteligente (3 días)

Objetivo: convertir alertas en cosas que se pueden resolver y facilitar la aprobación masiva de lo que no tiene riesgo.

- **Re-priorizar alertas.** En `backend/app/services/ai_anomaly.py` y en el código que genera alertas por reglas (`alerts.py`), asegurar que el campo `severity` (ya existe) se asigna consistentemente: `high` para `policy_violation` y `duplicate >200€`, `medium` para `no_receipt`, `low` para `rapid_repeat`. UI: ordenar por severidad descendente por defecto.
- **Añadir `suggested_action` al payload.** Nuevo campo (nullable) en el schema de Alert. Backend lo rellena según el tipo: `duplicate` → "Verificar con {empleado} si es un gasto real duplicado o un error de subida"; `policy_violation` → "Revisar política y contactar a {empleado}"; `no_match` → "Buscar transacción bancaria manualmente o esperar extracto próximo".
- **UI alerts.** Mostrar el `suggested_action` dentro de la card de la alerta. Separar visualmente las `high` (fondo rojo claro) de las `medium/low` (fondo neutro).
- **Batch approve inteligente.** En `/approvals`, al cargar la página, preseleccionar (checkbox marcado) los recibos donde `approval_level == "auto"` AND sin alerta asociada. Añadir banner arriba: "N recibos listos para aprobar. Importe total Y €. [Aprobar todos]".
- **Filtros rápidos** en `/approvals`: dos tabs arriba "Sin riesgo" (preseleccionados) y "Requieren revisión" (resto).

**Verificación:** con demo data, abrir `/approvals` → banner dice algo como "12 recibos listos para aprobar (340€)". Pulsar "Aprobar todos" los aprueba y el banner desaparece. Abrir `/alerts` → la primera alerta es `high`, muestra una acción sugerida en español.

### Sprint 5 — Polish y pre-producción (2-3 días)

Objetivo: dejar al empleado/capataz conectado con la admin, tener un CSV exportable para que contabilidad de Lezama pruebe, y probar email real.

- **Perfil empleado conectado a quincenas.** En `/profile` mostrar tarjeta "Mi quincena actual": rango, días restantes para el cierre, estado (`pendiente de envío` / `enviada` / `aprobada` / `con incidencia`). Si es `con incidencia`, mostrar la `review_note` que el admin dejó y un botón "Ver recibos marcados".
- **Export CSV preliminar para SAP.** En `/receipts`, botón "Exportar SAP" que devuelve CSV con columnas: `Fecha`, `NIF empleado` (si lo tenemos — si no, vacío), `Obra`, `Comercio`, `Base imponible`, `Tipo IVA`, `Cuota IVA`, `Total`, `Categoría`, `Estado`, `Aprobado por`. **Centro de coste y cuenta contable van vacíos hasta que Lezama los confirme** (ver sección 7, preguntas 1 y 3).
- **SMTP real.** Configurar SendGrid en Railway (variable `EMAIL_PASSWORD` con API key). Probar recordatorios: 3 días antes del cierre, día del cierre, aviso de incidencia al empleado.
- **Móvil: upload rápido.** En mobile, la ruta `/receipts` debe mostrar directamente un botón grande "Subir factura" (cámara nativa del móvil si es posible, fallback a file picker) y listar los últimos 5 recibos del empleado. Nada más. La tabla completa se oculta en viewport <640px.

**Verificación:** login como empleado con incidencia en la última quincena → ve tarjeta con la nota. Descargar CSV SAP → abre en Excel sin errores, columnas en orden. Cerrar quincena desde admin → llega email real al Gmail de prueba. Abrir `/receipts` en móvil (dev tools responsive 375×812) → botón "Subir factura" ocupa ≥60% del ancho.

---

## 6. Archivos clave (quick reference)

| Sprint | Archivos principales |
|---|---|
| 1 | `backend/app/routes/receipts.py:264-268,300,561`, `backend/app/routes/analytics.py:102-124`, **NEW** `frontend/src/app/settings/page.tsx`, `frontend/src/app/approvals/page.tsx:194-267`, `frontend/src/components/receipt-detail-modal.tsx:295-320`, **NEW** tabla `settings` o `backend/app/config/settings.json` |
| 2 | **NEW** `frontend/src/components/accion-hoy-banner.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/transactions/page.tsx`, `frontend/src/components/period-widget.tsx`, `frontend/src/app/periods/page.tsx` |
| 3 | **NEW** Alembic 0006 y 0007, `backend/app/models/models.py`, `backend/app/schemas/schemas.py`, `backend/app/routes/projects.py` (nuevo), `backend/app/ocr/claude_provider.py`, `frontend/src/app/receipts/page.tsx`, **NEW** `frontend/src/app/projects/page.tsx`, `frontend/src/types/index.ts` |
| 4 | `backend/app/routes/alerts.py`, `backend/app/services/ai_anomaly.py`, `backend/app/schemas/schemas.py` (Alert), `frontend/src/app/alerts/page.tsx`, `frontend/src/app/approvals/page.tsx` |
| 5 | `frontend/src/app/profile/page.tsx`, `backend/app/routes/receipts.py` (export), `backend/app/services/email_service.py`, variables Railway, `frontend/src/app/receipts/page.tsx` (responsive) |

Componentes reutilizables ya disponibles (no crear nuevos): `Card`, `KPICard`, `Btn`, `StatusBadge`, `DataTable`, `SectionHeader`, `EmptyState`, `DashboardSkeleton`, `TablePageSkeleton`, `Spinner`. Ver `frontend/src/components/ui.tsx`.

---

## 7. Preguntas pendientes al cliente Lezama (permanente)

> **Cómo usar esta sección:** estas son decisiones que no podemos tomar sin hablar con el cliente. No implementéis features basadas en suposición. Cuando Lezama responda algo en una reunión, mover la pregunta a una sección `### Respondidas` abajo con la fecha y la decisión. Alejandro, Marcos y sus Claudes: consultar esto antes de proponer nuevas features al equipo.

### Integraciones contables (SAP)

1. ¿Centro de coste y cuenta contable deben guardarse en cada recibo? ¿El mapeo es fijo (empleado → centro) o asignable por recibo (un empleado puede trabajar en varios centros)?
2. ¿La integración con SAP será vía API (RFC IDOC, BAPI, SOAP) o export CSV que contabilidad carga manualmente? Si API, ¿qué credenciales/accesos nos pueden dar?
3. ¿Qué columnas exactas espera SAP de Lezama en el CSV de importación? Pedir un ejemplo de un export que usen hoy desde su Excel.

### Proveedores y subcontratistas

4. Los subcontratistas de demolición (autónomos y empresas externas): ¿son entidades separadas en ExpensIQ o se tratan como "empleado con flag externo"? ¿Quién sube su factura al sistema — ellos directamente o la admin?
5. ¿Hace falta gestionar retención IRPF sobre facturas de autónomos? ¿Necesitan informes modelo 347 (operaciones >3.005€) y modelo 349 (intracomunitarios)?

### Obras

6. Estructura de obras: ¿qué formato tienen los códigos? (propuesto `OBR-YYYY-NNN`). ¿Qué metadatos llevan (fechas inicio/fin, responsable, cliente final, presupuesto)? ¿Las importamos desde SAP al arrancar o se crean en ExpensIQ y luego se sincronizan?
7. ¿Un recibo puede repartirse entre varias obras (split de importe) o siempre es 1 recibo → 1 obra?

### Política y aprobaciones

8. Umbrales de aprobación deseados. Defaults propuestos: <100€ auto, 100-500€ manager, >500€ director. ¿Les sirven? ¿Quieren umbrales distintos por categoría (p.ej. dietas más laxo, material más estricto) o por departamento?
9. ¿Existe una política formal de gastos (máximos por categoría, dietas, kilometraje, tipos no reembolsables)? Si existe, pedirla para parametrizarla en el sistema.
10. Delegaciones: ¿quién aprueba en ausencia del manager o director (vacaciones, baja)? ¿Hay suplentes fijos o se escalará al siguiente nivel automáticamente?

### IVA y fiscal

11. ¿Necesitan libro de IVA soportado exportable para la gestoría? ¿Formato preferido (xls, xml, SII)?
12. ¿El sistema debe distinguir automáticamente factura completa vs ticket simplificado? (el desglose IVA sólo es obligatorio en facturas; los tickets pueden no tenerlo).

### Móvil y flujo en obra

13. ¿Cuántos de los 50-100 empleados subirán recibos realmente desde móvil en obra, y cuántos desde oficina? ¿Vale con web responsive o necesitan app nativa?
14. ¿Hay zonas de obra sin cobertura donde haya que soportar upload offline con sincronización posterior?

### Datos y migración

15. ¿Cuánto histórico quieren migrar al arrancar? (Excel actual). ¿Qué formato tiene — columnas, número de filas, cuántos años?
16. ¿Quién será la "primera admin" nombrada en producción? ¿Habrá más de una admin con permisos completos? ¿Gerentes intermedios distintos a la admin?

### Respondidas

*(vacío — trasladar aquí cada pregunta cuando Lezama responda, con fecha y decisión)*

---

## 8. Métricas de verificación por sprint

Resumen agregado (cada sprint ya tiene su sección de verificación):

| Sprint | Indicador objetivo |
|---|---|
| 1 | Recibo 50€ → auto-aprobado sin intervención. Recibo 250€ → pending con motivo visible. Umbrales editables desde `/settings`. `approver_name` poblado tras aprobar. |
| 2 | Banner "Acción Hoy" con 4 números correctos y clickables. Columna match status en `/transactions`. PDF quincenal descargable desde dashboard. |
| 3 | Obra `OBR-2026-001` creada, asignada a recibos, filtrable. Export CSV con `obra` y desglose IVA. Dashboard "Gasto por obra" muestra top 10. |
| 4 | Alertas ordenadas por severidad. `suggested_action` visible en cada alerta. Batch approve preselecciona los sin riesgo y muestra banner "N listos para aprobar". |
| 5 | `/profile` muestra estado quincena. Export CSV SAP abre en Excel. Email real enviado por SendGrid. `/receipts` en móvil muestra botón "Subir factura" grande. |

---

## 9. Cambios a aplicar en CLAUDE.md del proyecto

Al cierre de esta tarea, **añadir** en `CLAUDE.md` (proyecto) una sección nueva al final (después de "Instrucciones para Claude"):

```markdown
## Documentos vivos

- `AUDITORIA_PLAN_MEJORA_2026-04-17.md` — auditoría UX admin + roadmap de 5 sprints + **preguntas abiertas a Lezama**. Consultar antes de proponer nuevas features. Si el cliente responde a una de las preguntas, mover la respuesta a la sección `Respondidas` del documento con fecha.
```

`CLAUDE.md` sigue siendo la fuente de verdad para stack, arquitectura y convenciones. Este documento es el **roadmap activo** — se actualiza sprint a sprint y refleja lo que el equipo está haciendo ahora mismo.

---

## Bitácora

- **2026-04-17** — Creación del documento (Ricardo + Claude). Fase G cerrada. Sin cambios de código en esta sesión; sólo planificación. Implementación empieza con PR Sprint 1.
