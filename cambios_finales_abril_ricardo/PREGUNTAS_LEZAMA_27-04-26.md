# Preguntas pendientes — ExpensIQ producción

**Fecha:** 27-04-26
**Para:** Dirección de Lezama
**De:** Edrai Solutions

Para arrancar ExpensIQ en producción necesitamos cerrar 16 decisiones. Son cosas que solo vosotros podéis decidir. Mientras no las tengamos, las dejamos con valores por defecto que probablemente habrá que rehacer.

Cada pregunta tiene casillas marcables. Si tenéis alguna duda o ninguna opción encaja, escribid en "Otra".

---

## 1. Integración con SAP

**1.1 — ¿Cómo conectamos ExpensIQ con vuestro SAP?**
- [ ] Conexión automática (vosotros nos dais accesos a SAP y los gastos llegan solos)
- [ ] Vuestra contabilidad descarga un archivo CSV desde ExpensIQ y lo sube a SAP a mano
- [ ] Otra: _______________

**1.2 — ¿Nos podéis pasar un ejemplo del archivo que usa hoy vuestra contabilidad para meter gastos en SAP?** (un Excel o CSV, da igual el formato)
- [ ] Sí, lo enviamos
- [ ] No usamos ningún archivo, lo meten manualmente
- Adjuntar / responder: _______________

**1.3 — Centro de coste y cuenta contable de cada gasto:**
- [ ] Cada empleado tiene siempre el mismo centro de coste asignado
- [ ] Depende de la obra en la que esté trabajando ese día
- [ ] La admin lo asigna manualmente al revisar el gasto
- [ ] Otra: _______________

---

## 2. Subcontratistas y autónomos

**2.1 — Las facturas de subcontratistas (autónomos y empresas externas):**
- [ ] Las sube la admin desde la oficina cuando llegan
- [ ] Las suben los propios subcontratistas desde su móvil
- [ ] Mezclado, depende del subcontratista
- [ ] No las gestionamos en ExpensIQ
- [ ] Otra: _______________

**2.2 — ¿Necesitáis que ExpensIQ gestione retenciones IRPF de autónomos?**
- [ ] Sí
- [ ] No, lo lleva la gestoría aparte

**2.3 — ¿Necesitáis que ExpensIQ genere los modelos 347 y 349 para Hacienda?**
- [ ] Sí
- [ ] No, lo lleva la gestoría

---

## 3. Obras

**3.1 — ¿Qué formato tienen los códigos de obra hoy?** (ejemplo real, por favor)
- Respuesta: _______________

**3.2 — ¿Los datos de las obras (fechas, responsable, cliente, presupuesto) los tenéis ya en SAP o se crean en ExpensIQ desde cero?**
- [ ] Ya están en SAP, los importamos al arrancar
- [ ] Se crean nuevos en ExpensIQ
- [ ] Otra: _______________

**3.3 — ¿Un mismo gasto se puede repartir entre varias obras?** (ej. una compra de material que va a 2 obras a la vez)
- [ ] Sí, hay que poder repartir el importe
- [ ] No, cada gasto va a una sola obra

---

## 4. Política de aprobaciones

**4.1 — Os proponemos estos umbrales por defecto. ¿Os sirven?**

| Importe | Aprueba |
|---|---|
| Menos de 100€ | Auto-aprobado |
| 100€ a 500€ | Manager |
| Más de 500€ | Director |

- [ ] Sí, perfecto
- [ ] Cambiar (especificar): _______________

**4.2 — ¿Tenéis un documento de política de gastos?** (máximos por categoría, dietas, kilometraje, qué no se reembolsa)
- [ ] Sí, lo enviamos para parametrizarlo
- [ ] No existe formal, lo decidimos contigo

**4.3 — Si un manager o director está de vacaciones o baja, ¿quién aprueba en su lugar?**
- [ ] Hay suplentes fijos asignados (especificar): _______________
- [ ] Sube automáticamente al siguiente nivel
- [ ] Espera a que vuelva
- [ ] Otra: _______________

---

## 5. IVA y gestoría

**5.1 — ¿Necesitáis exportar el libro de IVA soportado para la gestoría desde ExpensIQ?**
- [ ] Sí, en formato Excel
- [ ] Sí, en formato XML / SII (envío directo a Hacienda)
- [ ] No, lo lleva la gestoría con sus medios

**5.2 — ¿ExpensIQ debe distinguir factura completa vs ticket simplificado?** (el desglose de IVA solo es obligatorio en facturas)
- [ ] Sí, importante
- [ ] No, tratar todo igual

---

## 6. Uso desde el móvil en obra

**6.1 — De vuestros 150 empleados, ¿cuántos van a subir recibos desde el móvil en obra?**
- [ ] Casi todos (más de 100)
- [ ] La mitad (entre 50 y 100)
- [ ] Pocos (menos de 50)
- [ ] Solo la oficina, nadie desde el móvil

**6.2 — ¿Os vale con que sea una web que se ve bien en el móvil, o necesitáis app nativa descargable de la App Store / Google Play?**
- [ ] Web responsive (más rápido, sin instalación)
- [ ] App nativa (mejor UX, requiere desarrollo extra)
- Comentario: _______________

**6.3 — ¿Hay obras sin cobertura de móvil donde el operario tenga que sacar la foto y subirla luego al volver a la oficina?**
- [ ] Sí, pasa con frecuencia
- [ ] Sí, pero es raro
- [ ] No, todas tienen cobertura

---

## 7. Migración y arranque

**7.1 — ¿Cuánto histórico de gastos queréis migrar a ExpensIQ al arrancar?**
- [ ] Solo desde la fecha de arranque (no migramos nada)
- [ ] Último año
- [ ] Últimos 2-3 años
- [ ] Todo lo que tengamos

**7.2 — Si migramos histórico, ¿en qué formato lo tenéis hoy?** (Excel, varios Excel, en SAP, etc.)
- Respuesta: _______________

**7.3 — ¿Quién será la admin principal de ExpensIQ en producción?** (la persona que aprueba, revisa y configura)
- Nombre: _______________
- Email: _______________

**7.4 — ¿Habrá más de una persona con rol admin completo o gerentes intermedios?**
- [ ] Solo una admin
- [ ] Una admin + N gerentes (especificar nombres y roles): _______________

---

## Espacio para dudas o comentarios

_______________

_______________

_______________

---

> Cuando tengamos vuestras respuestas, completamos el sistema con datos reales y dejamos ExpensIQ listo para producción. Sin estas respuestas seguimos avanzando con valores por defecto que tocará rehacer después.
