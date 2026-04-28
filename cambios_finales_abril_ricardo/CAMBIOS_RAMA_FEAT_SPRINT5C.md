# Sprint 5C — Móvil responsive en `/receipts`

> Documento humano de la rama `feat/sprint5c-mobile-upload` para Alejandro y Marcos.

## Por qué este cambio

Lezama tiene 150-160 empleados, muchos de ellos **operarios en obra** que necesitan subir el ticket de gasolina o de un material justo después de pagarlo, desde el móvil. La página `/receipts` actual muestra una tabla densa pensada para desktop — en pantallas <640px queda saturada y la acción "subir factura" se pierde entre filtros y columnas.

Sprint 5C reorganiza la vista por viewport: en mobile, el operario ve **solo** un botón grande de cámara y sus 5 últimos recibos como cards. Filtros y tabla completa se mantienen para desktop sin cambios.

(Nota: este es un parche responsive, no app nativa. La pregunta Q13 del audit doc — cuántos operarios subirán realmente desde obra y si quieren app nativa — sigue abierta con Lezama.)

## Qué se ha cambiado

Único archivo tocado: **`frontend/src/app/receipts/page.tsx`**.

### Captura nativa de cámara

Añadido `capture="environment"` al `<input type="file">`. En móvil esto hace que el sistema operativo abra directamente la **cámara trasera** (en vez de la galería) cuando el usuario toca la zona de upload. En desktop se ignora silenciosamente — sigue funcionando como file picker normal.

### Zona de upload responsive

- **Mobile (`<640px`)**: padding aumentado (`py-14`), borde indigo destacado, fondo `indigo-50/40`, icono más grande (`w-14 h-14`), texto más grande (`text-base font-bold`). Mensaje específico: "Toca para sacar foto del recibo".
- **Desktop (`≥640px`)**: aspecto idéntico al actual (`py-10`, borde slate, icono `w-10 h-10`, texto `text-sm`).

Misma `<input>` y misma lógica de `handleUpload` — sin duplicación.

### Bloque mobile-only: "Mis últimos recibos"

Justo después de la card de upload, en mobile se renderiza una lista de **5 recibos como cards compactas**:

- Cada card: merchant, fecha, importe, status badge.
- Click abre el `ReceiptDetailModal` existente (sin cambios).
- Estados: loading spinner, empty state ("Aún no has subido ningún recibo. Toca arriba para empezar.").
- Filtra implícitamente los que vienen del estado `receipts` — si el usuario es employee, ya están filtrados a sí mismo por `useEffect` existente.

Wrap: `<div className="sm:hidden space-y-3">`.

### Desktop wrapper

Todo lo demás (Excel Template del empleado, filtros avanzados, tabla con tabs y export buttons) está envuelto en `<div className="hidden sm:block space-y-5">`. Se mantiene intacto en desktop, no se renderiza en móvil.

El `ReceiptDetailModal` queda **fuera** de los wrappers para que funcione desde la card mobile y desde la fila desktop.

## Cómo probarlo

1. `docker compose up -d --build` y `python3 demo_data_loader.py`.
2. Ir a `/receipts` en desktop → debe verse exactamente igual que ahora.
3. Chrome DevTools → device toolbar (Cmd+Shift+M) → seleccionar iPhone 12 (390×844) o similar.
4. Recargar `/receipts` en mobile:
   - Card de upload con borde indigo, icono y texto más grandes.
   - Texto: "Toca para sacar foto del recibo".
   - Sección "Mis últimos recibos" con 5 cards (o empty state si no hay).
   - Filtros avanzados, tabla, status tabs y botones de export → **no aparecen**.
5. Tocar la card de upload → en móvil real abriría cámara; en DevTools abre file picker.
6. Tocar una de las cards de recibo → abre el modal de detalle (mismo de desktop).
7. Resize a 768px (md) → vuelve a vista desktop con tabla.

## Verificación técnica

- `npx tsc --noEmit` → limpio.
- Sin cambios en backend ni en otros archivos del frontend.
- Sin cambios de modelo, ni de schemas, ni de tipos.

## Lo que NO incluye

- App nativa móvil (Q13 abierta con Lezama — depende de cuántos operarios la usarían).
- Soporte offline / sincronización posterior (Q14 abierta).
- Vista responsive del resto de páginas (`/dashboard`, `/profile`, `/employees`...). Se entregan según prioridad cuando se detecte uso móvil real.
- Botón de export, filtros avanzados o tabla en mobile — se asume que en obra el operario solo necesita subir.

## Para Alejandro (revisión)

- `frontend/src/app/receipts/page.tsx` — todos los cambios concentrados ahí.
- Verificar en DevTools mobile que el bloque "Mis últimos recibos" muestra exactamente los 5 más recientes del usuario actual (cuando es employee, el array ya está filtrado server-side por `filterEmployee = currentEmployeeId`).
- `capture="environment"`: standard HTML, soportado en Chrome iOS 11+/Android, Safari iOS 11+. Si el navegador no lo soporta, se ignora — fallback es el file picker normal.
- Decisión UX: en mobile no mostramos botón de exportar SAP ni filtros — confírmame si te parece bien, o si quieres un toggle "ver más" para acceder a la tabla.
