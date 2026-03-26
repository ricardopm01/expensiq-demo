# ExpensIQ — Script Demo Guiado

> Duracion estimada: 18-20 minutos
> Requisitos: stack levantado (`./start.sh`), datos demo cargados

---

## Preparacion (2 min)

1. Arrancar el stack:
   ```bash
   ./start.sh
   ```
2. Abrir http://localhost:3000
3. Verificar que el sistema carga correctamente (Dashboard visible)
4. Si no hay datos, ejecutar el seed:
   ```bash
   python demo_data_loader.py
   # Luego en la API: POST /api/v1/transactions/sync-mock
   ```
5. Asegurar que el rol seleccionado es **Director** (selector en la esquina superior derecha)

---

## Acto 1: Dashboard Admin — Panel de Control (3 min)

**Objetivo**: Mostrar la vision global del sistema.

1. **KPIs superiores**: Gasto total, recibos conciliados, pendientes de revision, alertas activas
2. **Barra de progreso**: Porcentaje de conciliacion automatica
3. **Tendencia mensual**: Grafico de area con gasto de los ultimos 6 meses — señalar tendencia
4. **Donut de categorias**: Desglose por tipo de gasto (transporte, comidas, alojamiento...)
5. **Top gastadores**: Grafico de barras — señalar a **Pablo Navarro** (sobre presupuesto, barra roja)
6. **Panel de aprobaciones**: Contadores por nivel (auto, gerente, director)

> **Punto clave**: "Todo esto se genera automaticamente. Sin Excel, sin conciliacion manual."

---

## Acto 2: Gestion de Recibos (3 min)

**Objetivo**: Mostrar el flujo de captura y procesamiento de tickets.

1. Navegar a **Recibos** en la sidebar
2. Mostrar los **filtros avanzados**: por empleado, categoria, estado, fecha, busqueda libre
3. **Subir un recibo**: arrastrar una imagen al area de drop (o click para seleccionar)
   - Mostrar el procesamiento OCR en tiempo real
   - El recibo aparece en la tabla con datos extraidos automaticamente
4. **Click en un recibo** para abrir el modal de detalle:
   - Imagen del ticket a la izquierda
   - Datos extraidos por OCR a la derecha (comercio, importe, fecha, IVA)
   - Match bancario encontrado (o pendiente)
   - Nivel de aprobacion asignado automaticamente
   - Line items si se detectaron
5. Mostrar **Export CSV** para descarga de datos

> **Punto clave**: "El empleado saca la foto, el sistema hace el resto: extrae datos, categoriza, y busca el movimiento en el banco."

---

## Acto 3: Conciliacion Bancaria (3 min)

**Objetivo**: Mostrar la integracion con el banco (Rural Kutxa).

1. Navegar a **Transacciones**
2. Mostrar los KPIs: transacciones importadas, volumen total
3. **Importar extracto bancario**:
   - Arrastrar un archivo CSV al area de drop
   - Mostrar la **preview** de transacciones parseadas (tabla con datos)
   - Confirmar la importacion — ver contadores (creadas, duplicadas, errores)
4. Click en **"Conciliar Todo"**:
   - El motor fuzzy matching cruza recibos con movimientos bancarios
   - Resultado: X matches creados, Y alertas generadas
5. Volver a Recibos para ver recibos ahora con estado "Conciliado"

> **Punto clave**: "Se importa el extracto del banco, se cruza automaticamente con los tickets. Lo que antes tardaba horas, ahora son segundos."

---

## Acto 4: Sistema de Alertas (2 min)

**Objetivo**: Mostrar la deteccion inteligente de anomalias.

1. Navegar a **Alertas**
2. Mostrar las alertas generadas automaticamente:
   - **Violacion de politica**: Sala VIP Bernabeu, 1.250 EUR (Pablo Navarro)
   - **Gasto duplicado**: Cafeteria La Oficina, mismo importe y fecha (Ana Garcia)
   - **Gasto fin de semana**: Discoteca Opium, sabado noche (Pablo Navarro)
   - **Sin recibo**: Transacciones bancarias sin ticket asociado
3. Click en **"AI Scan"** para ejecutar deteccion avanzada con IA
4. **Resolver una alerta**: click en el boton de resolver, la alerta desaparece del listado

> **Punto clave**: "El sistema detecta automaticamente gastos sospechosos: duplicados, fuera de horario, que exceden politica, sin justificante..."

---

## Acto 5: Workflow de Aprobaciones (2 min)

**Objetivo**: Mostrar el flujo de aprobacion multinivel.

1. Navegar a **Aprobaciones**
2. Mostrar los **KPIs por nivel**: Auto (<100 EUR), Gerente (100-500 EUR), Director (>500 EUR)
3. **Filtrar** por nivel de aprobacion
4. **Aprobar individualmente**: click en el boton de aprobar en un recibo
5. **Aprobar en lote**: seleccionar varios recibos con checkbox, click en "Aprobar seleccionados"
6. **Cambiar rol a Gerente**: los botones de aprobacion de nivel Director se deshabilitan
7. Volver a **Director** para mostrar control total

> **Punto clave**: "Cada nivel solo puede aprobar lo que le corresponde. El director ve todo, el gerente solo hasta 500 EUR."

---

## Acto 6: Vista Empleado (3 min)

**Objetivo**: Mostrar la experiencia del empleado.

1. Cambiar rol a **Empleado** en el selector superior
2. Seleccionar **"Pablo Navarro Ruiz"** en el selector de empleado
3. **Mi Panel**: Dashboard personal
   - Bienvenida con avatar e info del empleado
   - KPIs personales: gasto del mes, conciliados, pendientes, presupuesto
   - **Barra de presupuesto en ROJO** — Pablo esta sobre su limite
   - Donut de categorias personales
   - Lista de recibos recientes
4. Navegar a **Mis Recibos**:
   - Solo ve sus propios recibos (filtrado automatico)
   - Puede subir nuevos recibos
   - **Plantilla Excel**: boton "Descargar Plantilla" para formato estandar de gastos
   - Boton "Importar Excel" para carga masiva de gastos
5. Navegar a **Mi Perfil**:
   - Resumen completo con desglose por categoria
   - Accordion con detalle de cada categoria

> **Punto clave**: "El empleado tiene su propio panel. Ve su presupuesto, sube tickets, descarga plantillas. Todo autoservicio."

---

## Acto 7: Directorio de Empleados (1 min)

**Objetivo**: Mostrar la gestion de equipo.

1. Cambiar rol a **Director**
2. Navegar a **Empleados**
3. Mostrar la tabla: nombre, departamento, presupuesto mensual
4. Click en **Pablo Navarro** — ver perfil con presupuesto excedido
5. Click en **Maria Jimenez** — otra empleada sobre presupuesto

> **Punto clave**: "El supervisor tiene vision completa de quien gasta que, y puede actuar rapidamente."

---

## Cierre (1 min)

Volver al **Dashboard** y resumir:

- **OCR automatico**: foto del ticket y extraccion instantanea de datos
- **Conciliacion inteligente**: cruce automatico con extracto bancario (Rural Kutxa)
- **Alertas IA**: deteccion de anomalias, duplicados, violaciones de politica
- **Aprobaciones multinivel**: flujo automatico segun importe
- **Vista dual**: panel admin completo + panel empleado autoservicio
- **Import/Export**: CSV bancario, plantilla Excel, export de datos

> "Todo el proceso que hoy haceis con Excel y conciliacion manual, ExpensIQ lo automatiza de principio a fin."

---

## Notas tecnicas para la demo

- **URLs**: Frontend http://localhost:3000 | API http://localhost:8000/docs
- **Para compartir**: `cloudflared tunnel --url http://localhost:3000`
- **Banco configurado**: Rural Kutxa (Ruralvia) — parser CSV/Excel integrado
- **OCR**: Mock por defecto, Claude Vision disponible con `OCR_PROVIDER=claude`
- **Datos**: Se regeneran con `python demo_data_loader.py` (fechas siempre relativas a hoy)
