# Actualización documentación — Abril 2026

## ¿Qué se ha cambiado y por qué?

Revisión completa de todos los archivos `.md` del proyecto para corregir inconsistencias y reflejar el estado real del proyecto tras los cambios de Alejandro (Fase G).

---

## Cambios por archivo

### README.md
- Arranque: `./start.sh` como opción principal en Mac (antes ponía `docker compose up --build`, que falla en Apple Silicon)
- Login: sustituido "Cargar Demo Completo" (botón que ya no existe) por instrucciones del login real con tabla de usuarios
- OCR: eliminado "Claude Vision (próximamente)" — ya está implementado desde Fase B

### PARTNER_GUIDE.md
- Flujo git corregido: "Alejandro revisa y aprueba → Ricardo hace merge" (antes decía "Ricardo revisa")
- Añadida regla 1b: cada rama debe incluir un `.md` con descripción de los cambios
- Tabla de fases actualizada hasta Fase G (antes se quedaba en Fase C como "SIGUIENTE")

### onboarding.md
- Archivo limpiado: tenía números de línea incrustados por error al crearlo (formato `cat -n`)
- Sección git (12): flujo actualizado con roles del equipo y requisito del `.md` por rama
- Tabla de fases (13): añadida Fase G (auth + quincenas)

### ACTUALIZACION_ABRIL.md
- Eliminado `admin@lezama.es` de la tabla de usuarios — ese email no existe en la base de datos y causaba errores de login

### CLAUDE.md
- Sección "Flujo de trabajo colaborativo" reescrita con el nuevo flujo, roles del equipo y ruta local correcta (`expensiq-demo`)

### HANDOFF_FASE_D.md
- Movido a `.archive/` — era un documento de traspaso ya cumplido que podía confundir a nuevos colaboradores o a Claude

---

## Por qué es importante

Estos documentos son los que leen los Claudes del equipo al arrancar una sesión. Si tienen información incorrecta (usuarios inexistentes, flujo git desactualizado, fases marcadas como pendientes cuando están completadas), generan trabajo mal orientado.
