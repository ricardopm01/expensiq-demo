# ExpensIQ — Estado en vivo

> Documento para Alejandro y Marcos. Actualizar al terminar trabajo o cambiar de fase.
> Última actualización: **2026-04-27** por Ricardo (con Claude) — Sprint 5A pusheado.

## Resumen ejecutivo

Sprints 1, 1B, 2, 3 y 4 mergeados en `main`. **Sprint 5 en curso**: dividido en sub-PRs 5A / 5B / 5C. Sprint 5D (SMTP real) pospuesto hasta abrir cuenta SendGrid. Sin contrato firmado con Lezama: no tocamos producción ni abrimos cuentas de pago.

## Ramas activas

| Rama | Estado | PR | Notas |
|---|---|---|---|
| `main` | hasta `7610bbe` (Sprint 4 mergeado) | — | Estable. |
| `feat/sprint5a-perfil-quincenas` | abierta, lista para review | **PR a abrir** | Card "Mi quincena actual" en `/profile` + endpoint `/periods/me/current-status`. |
| `feat/sprint5b-export-sap-csv` | pendiente | — | Migración 0008 (Employee.nif) + endpoint `/receipts/export/csv-sap`. |
| `feat/sprint5c-mobile-upload` | pendiente | — | Vista responsive `/receipts` <640px. |

## Sprint 5A — Perfil empleado conectado a quincenas (rama actual)

Ver `CAMBIOS_RAMA_FEAT_SPRINT5A.md` para el detalle completo.

**Resumen:**
- Backend: nuevo endpoint `GET /api/v1/periods/me/current-status` que devuelve estado de la quincena del usuario logueado (rango, días restantes, review_status, review_note del admin si flagged, recuento de recibos rechazados).
- Frontend: nuevo componente `<MyPeriodCard />` en `/profile` con 3 variantes visuales (pending/approved/flagged). Integrado como primera card de la página.
- Sin cambios de modelo ni migraciones.

**Para Alejandro (revisión):**
- `backend/app/routes/periods.py:216-280` — verificar uso correcto de `get_current_user` y filtro `Receipt.employee_id` en `flagged_receipts_count`.
- `frontend/src/app/profile/page.tsx` — verificar que el link `/receipts?status=rejected` funciona y la card amber aparece cuando se simula `review_status='flagged'` desde la vista admin de periodos.

## Sprint 5 — desglose de sub-PRs

Spec en `AUDITORIA_PLAN_MEJORA_2026-04-17.md` sección "Sprint 5". Decisión Ricardo (2026-04-27): split en 3 PRs independientes en lugar de uno monolítico.

| Sub-PR | Estado | Alcance |
|---|---|---|
| **5A** | rama pusheada, PR a abrir | Perfil empleado conectado a quincenas |
| **5B** | pendiente | Export CSV SAP preliminar (13 columnas, NIF nullable, Centro coste/Cuenta contable vacíos hasta Lezama) + migración Alembic 0008 |
| **5C** | pendiente | `/receipts` responsive: <640px solo botón upload + cards últimos 5 recibos. `capture="environment"` en input file |
| **5D** | bloqueado | SMTP real (SendGrid en Railway). Bloqueado hasta que Ricardo abra cuenta SendGrid free. |

## Producción (Railway + Vercel) — bloqueado

No abrir cuentas de pago hasta que Lezama firme. Cuando se desbloquee, ver `PLANNING_PROXIMOS_PASOS.md` para variables de entorno necesarias.

## Preguntas abiertas a Lezama (las 16)

Sección 7 del `AUDITORIA_PLAN_MEJORA_2026-04-17.md`. Sin respuesta, NO implementar:
- Centro de coste, retenciones IRPF, formato exacto SAP (Q1, Q2, Q3, Q5).
- Estructura códigos obra (Q6), libro IVA (Q11), splits multi-obra (Q7).
- Política gastos formal (Q9), delegaciones aprobación (Q10).
- Histórico a migrar (Q15).
- Primera admin de producción (Q16).

Sprint 5B deja **placeholders vacíos** en el CSV SAP para Centro de coste y Cuenta contable, y NIF empleado, hasta que Lezama responda.

Cuando Lezama responda algo, mover a sección **Respondidas** del audit doc con fecha.

## Convenciones del equipo (recordatorio)

- **CLAUDE.md** = única fuente de verdad para arquitectura/stack/convenciones.
- **CAMBIOS_RAMA_FEAT_*.md** = documento por sprint en cada rama, descripción humana de qué se hizo y por qué (no solo el qué).
- **STATUS.md** (este archivo) = estado en vivo del proyecto, qué hay en cada rama, próximos pasos. Actualizar al cambiar fase.
- Rama por feature, PR a `main` con review de Alejandro, merge por Ricardo.
- No crear documentos supletorios fuera de estos tres patrones — actualizar lo existente.

---

*Para el contexto completo del cliente Lezama, requisitos del producto y stack técnico ver `CLAUDE.md`.*
*Para el roadmap detallado de los 5 sprints y las 16 preguntas abiertas ver `AUDITORIA_PLAN_MEJORA_2026-04-17.md`.*
