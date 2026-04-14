# ExpensIQ — Planning próximos pasos

Documento de planificación actualizado tras la sesión de abril 2026.
Para el cliente: empresa de construcción, 40M€/año, ~100 empleados, SAP + Caja Rural + Google Workspace @lezama.es.

---

## Estado actual del proyecto

| Módulo | Estado | Notas |
|---|---|---|
| Auth Google OAuth + JWT | ✅ Listo | DEV_MODE activo (emails mock). Pendiente credenciales reales @lezama.es |
| Dashboard (KPIs, IA, departamentos) | ✅ Listo | |
| Recibos (upload, OCR, aprobar/rechazar) | ✅ Listo | |
| Transacciones bancarias (Caja Rural) | ✅ Listo | Parser Rural Kutxa incluido |
| Alertas + detección anomalías IA | ✅ Listo | |
| Empleados (alta, CSV masivo, activar/desactivar) | ✅ Listo | |
| Quincenas — apertura/cierre/banner | ✅ Backend OK | Panel frontend tiene bug de timing con el token |
| Revisión quincenal admin | ⏸️ Stand-by | Backend implementado; frontend pendiente de fix |
| Notificaciones email | ⚠️ Sin probar | APScheduler escrito, falta configurar SMTP y testear |
| Google OAuth real (@lezama.es) | ⏳ Pendiente | Esperando credenciales del cliente |

---

## Prioridades acordadas (en orden)

### 🔴 Prioridad alta

**1. Quincenas — arreglar el panel frontend**
- Problema: race condition entre la carga de datos y el token de autenticación
- El backend funciona al 100%
- Fix: hacer que la página espere a que el token esté disponible antes de llamar a la API

**2. Asignación de recibo a obra/proyecto**
- En construcción cada gasto va asociado a una obra concreta
- Añadir campo `project` / `obra` en el recibo (modelo + OCR + filtros + reporting)
- Crítico para que contabilidad pueda cuadrar por obra

### 🟠 Prioridad media

**3. Desglose de IVA en recibos**
- Las facturas en España tienen base imponible + IVA (21%, 10%, 4%)
- El OCR extrae el total pero no desglosa
- Necesario para cuadrar con SAP y para la declaración trimestral

**4. Notificaciones email — verificar y testear**
- Código APScheduler escrito en `backend/app/services/email_service.py`
- Falta: configurar variables SMTP en Railway/producción y hacer prueba real
- Flujo: aviso 3 días antes del cierre, aviso el día del cierre, aviso al empleado cuando hay incidencia en revisión

**5. Vista móvil optimizada para empleados**
- Los empleados están en obra y subirán fotos desde el móvil
- Hay responsive básico (Fase E) pero no está optimizado para flujo de subida rápida
- Prioridad: pantalla de subida de recibo muy simple, 1-2 pasos máximo

### 🟡 Prioridad media-baja

**6. Exportación formato SAP**
- Actualmente hay export CSV genérico
- SAP tiene columnas específicas (centro de coste, cuenta contable, NIF, etc.)
- Sin esto contabilidad tiene que reintroducir datos a mano

**7. Perfil empleado conectado a quincenas**
- La página `/profile` existe pero no muestra el estado de revisión quincenal del empleado
- El empleado debería ver: "Tu quincena del 1-15 abril está pendiente de revisión"

---

## Decisiones técnicas pendientes

| Decisión | Opciones | Recomendación |
|---|---|---|
| Hosting backend | Railway (cuenta Ricardo) / Render / VPS | Railway con cuenta de Ricardo (ver issue #2) |
| SMTP email | Gmail SMTP / SendGrid / AWS SES | SendGrid free tier (100 emails/día) para demo |
| Formato export SAP | CSV personalizado / RFC IDOC | CSV personalizado en primera versión |
| OCR en producción | Mock actual / Claude Vision | Claude Vision cuando el cliente apruebe el gasto |

---

## Configuración necesaria cuando el cliente esté listo

```bash
# Variables de entorno — backend (Railway)
GOOGLE_CLIENT_ID=...          # Google Cloud Console
GOOGLE_CLIENT_SECRET=...      # Google Cloud Console
ALLOWED_DOMAIN=lezama.es      # Ya configurado
JWT_SECRET_KEY=...            # Generar con: openssl rand -hex 32
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=...            # SendGrid API key
FRONTEND_URL=https://...      # URL de Vercel en producción
DEV_MODE=false                # Desactivar en producción

# Variables de entorno — frontend (Vercel)
NEXT_PUBLIC_DEV_MODE=false
NEXTAUTH_SECRET=...           # Generar con: openssl rand -hex 32
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## Flujo de trabajo del equipo

- **Ricardo** (`ricardopm01`) — propietario repo, hace merges a main
- **Alejandro** (`alepm03`) — revisa y aprueba PRs
- **Marcos** (`marcospalocast`) — desarrolla, abre PRs

**Pendiente:** Ricardo necesita dar acceso **Write** a `marcospalocast` en Settings → Collaborators.
Hasta entonces los cambios se entregan como issues/patches.

---

*Última actualización: abril 2026*
