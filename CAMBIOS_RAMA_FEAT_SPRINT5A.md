# Sprint 5A — Perfil empleado conectado a quincenas

> Documento humano de la rama `feat/sprint5a-perfil-quincenas` para Alejandro y Marcos. Resume qué cambia y por qué.

## Por qué este cambio

Hasta ahora, en `/profile` el empleado veía sus KPIs personales (gasto, presupuesto, categorías) pero **no tenía visibilidad sobre el estado de su quincena actual**. Si la admin marcaba una incidencia (`review_status='flagged'` con `review_note`), el empleado no se enteraba dentro de la app — solo le llegaría por email cuando tengamos SMTP real (Sprint 5D).

Sprint 5A cierra ese hueco: el empleado, al entrar a su perfil, ve al instante en qué punto está su quincena y, si la admin dejó una nota de incidencia, la lee directamente con un botón para ir a sus recibos marcados.

## Qué se ha cambiado

### Backend — `backend/app/routes/periods.py`

Nuevo endpoint **`GET /api/v1/periods/me/current-status`** (autenticado, devuelve datos del usuario logueado):

```json
{
  "period_id": "uuid",
  "period_start": "2026-04-16",
  "period_end": "2026-04-30",
  "days_remaining": 3,
  "period_status": "open",
  "review_status": "flagged",
  "review_note": "Falta justificante del recibo de gasolina del día 22.",
  "reviewed_by_name": "María García",
  "reviewed_at": "2026-05-02T10:30:00Z",
  "flagged_receipts_count": 2
}
```

- Reusa el helper existente `_get_or_create_current_period(db)` y la dependencia `get_current_user`.
- Lee `EmployeePeriodStatus` para los campos de revisión; si no existe el registro (caso normal de quincena en curso), devuelve `review_status='pending'`.
- `flagged_receipts_count` cuenta recibos del empleado en el rango del periodo con `status='rejected'`.
- Se añade el schema Pydantic `MyCurrentPeriodStatusOut` en el mismo archivo (consistente con el estilo del resto de schemas en `periods.py`).

### Frontend — `frontend/src/types/index.ts`

Nuevo tipo `MyCurrentPeriodStatus` que refleja exactamente la respuesta del endpoint.

### Frontend — `frontend/src/app/profile/page.tsx`

- Nuevo componente local `<MyPeriodCard data={...} />` que renderiza tres variantes según `review_status`:
  - **`flagged`** — fondo amber-50, icono `AlertTriangle`, muestra `review_note`, botón ámbar "Ver N recibos marcados" que linkea a `/receipts?status=rejected`.
  - **`approved`** — fondo emerald-50, icono `CheckCheck`, muestra "Aprobada por {nombre} el {fecha}".
  - **`pending`** — neutro slate, icono `CalendarClock`, muestra "Quedan X días para el cierre" si está abierto, o "Quincena cerrada — pendiente de revisión" si ya cerró.
- Llamada al endpoint paralela a `/employees/{id}` con `Promise.all` para no penalizar tiempo de carga. Si la llamada falla (p.ej. usuario no autenticado), simplemente no se muestra la card (catch silencioso).
- La card se inserta como primer bloque de la página, antes del header del empleado.

Componentes UI nuevos: ninguno. Reusa `Card` y `Link` (next/link) y los iconos de `lucide-react`.

## Cómo probarlo

Con docker compose corriendo y datos demo seedeados:

1. Login como un empleado normal (no admin) → ir a `/profile` → verificar que aparece la card "Quincena en curso · X días para cierre" en azul/slate.
2. Como admin, abrir `/periods` (vista admin) → marcar el periodo actual de ese empleado como `flagged` con una nota.
3. Volver al perfil del empleado → la card debería ahora ser amber con la nota visible y el botón "Ver N recibos marcados".
4. Cambiar el `review_status` a `approved` → card pasa a verde con el nombre del admin y la fecha.
5. Caso edge: empleado sin EPS (recién creado) → card pendiente con días restantes (no rompe).

## Verificación técnica

- `npx tsc --noEmit` en frontend → sin errores.
- `python3 -c "import ast; ast.parse(...)"` sobre `periods.py` → OK.
- Build completo de Next falla por error preexistente en `/transactions` (useSearchParams sin Suspense), **no introducido por este sprint** — confirmado haciendo `git stash` y rebuild en main.

## Lo que NO incluye Sprint 5A

- No modifica `/periods` (vista admin) — la admin ya tenía esa funcionalidad desde Sprint 1/2.
- No envía emails — eso es Sprint 5D (bloqueado por SendGrid).
- No añade NIF ni cambios de modelo — eso es Sprint 5B.

## Para Alejandro (revisión)

- Endpoint nuevo en `backend/app/routes/periods.py:216-280` (aprox.). Verificar que `get_current_user` se está usando correctamente y que el `flagged_receipts_count` filtra por `Receipt.employee_id == current_user.id`.
- Component card en `frontend/src/app/profile/page.tsx:55-130`. Verificar que el link al filtro de recibos funciona (`/receipts?status=rejected`).
