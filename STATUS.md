# ExpensIQ — Estado en vivo

> Documento para Alejandro y Marcos. Actualizar al terminar trabajo o cambiar de fase.
> Última actualización: **2026-04-27** por Ricardo (con Claude) — Sprint 5A mergeado, 5B y 5C esperando merge.

## Resumen ejecutivo

Sprints 1, 1B, 2, 3, 4 y **5A mergeados** en `main`. **Sprint 5 casi completo en sub-PRs**: 5B y 5C abiertos esperando review/merge. Sprint 5D (SMTP real) pospuesto hasta abrir cuenta SendGrid. Sin contrato firmado con Lezama: no tocamos producción ni abrimos cuentas de pago.

## Ramas activas

| Rama | Estado | PR | Notas |
|---|---|---|---|
| `main` | hasta `3bab7bf` (Sprint 5A mergeado) | — | Estable. |
| `feat/sprint5b-export-sap-csv` | rebased sobre main, esperando merge | **PR #16** | Migración 0010 (Employee.nif), endpoint `/receipts/export/csv-sap`, botón en UI. |
| `feat/sprint5c-mobile-upload` | pusheada, esperando review | **PR #17** | `/receipts` responsive <640px, `capture="environment"`. |

## Sub-PRs del Sprint 5 — resumen

### Sprint 5A — Perfil empleado conectado a quincenas — MERGEADO (PR #15)
Backend: `GET /api/v1/periods/me/current-status`. Frontend: `<MyPeriodCard />` en `/profile`. Sin migraciones.
Detalle: `CAMBIOS_RAMA_FEAT_SPRINT5A.md`.

### Sprint 5B — Export CSV SAP + NIF (PR #16, rama actual)
Migración `0010_add_employee_nif.py`. Endpoint `GET /receipts/export/csv-sap` con 13 columnas (BOM UTF-8, separador `;`). NIF, Centro de coste y Cuenta contable vacíos hasta respuestas Lezama. Botón "Exportar SAP" para no-empleados.
Detalle: `CAMBIOS_RAMA_FEAT_SPRINT5B.md`.

### Sprint 5C — Móvil responsive (PR #17)
Sólo `frontend/src/app/receipts/page.tsx`. En `<640px`: oculta filtros + tabla, muestra upload card prominente + 5 últimos recibos como cards. `capture="environment"` en input file. Sin cambios backend.
Detalle: `CAMBIOS_RAMA_FEAT_SPRINT5C.md`.

## Sprint 5 — desglose

Spec en `AUDITORIA_PLAN_MEJORA_2026-04-17.md` sección "Sprint 5". Decisión Ricardo (2026-04-27): split en 3 PRs independientes en lugar de uno monolítico.

| Sub-PR | Estado | Alcance |
|---|---|---|
| **5A** | ✅ MERGEADO (PR #15) | Perfil empleado conectado a quincenas |
| **5B** | rebased, listo para merge (PR #16) | Export CSV SAP preliminar + migración 0010 |
| **5C** | pusheado, esperando review (PR #17) | `/receipts` responsive <640px |
| **5D** | bloqueado | SMTP real (SendGrid en Railway). Bloqueado hasta que Ricardo abra cuenta SendGrid free. |

## Producción (Railway + Vercel) — bloqueado

No abrir cuentas de pago hasta que Lezama firme. Cuando se desbloquee, ver `PLANNING_PROXIMOS_PASOS.md` para variables de entorno necesarias.

## Preguntas abiertas a Lezama (las 16)

Sección 7 del `AUDITORIA_PLAN_MEJORA_2026-04-17.md`. Sin respuesta, NO implementar:
- Centro de coste, retenciones IRPF, formato exacto SAP (Q1, Q2, Q3, Q5).
- Estructura códigos obra (Q6), libro IVA (Q11), splits multi-obra (Q7).
- Política gastos formal (Q9), delegaciones aprobación (Q10).
- App nativa móvil vs web responsive (Q13), soporte offline en obra (Q14).
- Histórico a migrar (Q15).
- Primera admin de producción + NIFs reales (Q16).

Sprint 5B deja **placeholders vacíos** en el CSV SAP para Centro de coste, Cuenta contable y NIF, hasta que Lezama responda.

## Convenciones del equipo (recordatorio)

- **CLAUDE.md** = única fuente de verdad para arquitectura/stack/convenciones.
- **CAMBIOS_RAMA_FEAT_*.md** = documento por sprint en cada rama, descripción humana de qué se hizo y por qué.
- **STATUS.md** (este archivo) = estado en vivo del proyecto. Actualizar al cambiar fase.
- Rama por feature, PR a `main` con review de Alejandro, merge por Ricardo.
- No crear documentos supletorios fuera de estos tres patrones — actualizar lo existente.

---

*Para el contexto completo del cliente Lezama, requisitos del producto y stack técnico ver `CLAUDE.md`.*
*Para el roadmap detallado de los 5 sprints y las 16 preguntas abiertas ver `AUDITORIA_PLAN_MEJORA_2026-04-17.md`.*
