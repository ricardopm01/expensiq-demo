# ExpensIQ — Estado en vivo

> Documento para Alejandro y Marcos. Actualizar al terminar trabajo o cambiar de fase.
> Última actualización: **2026-04-28** por Ricardo (con Claude) — Sprint 5C mergeado, fix Vercel mergeado (PR #19, Alejandro), reorganización de carpetas de documentación.

## Resumen ejecutivo

Sprints 1, 1B, 2, 3, 4, **5A, 5B y 5C mergeados** en `main`. Fix build Vercel mergeado (PR #19, Alejandro). Sprint 5D (SMTP real) pospuesto hasta abrir cuenta SendGrid. Sin contrato firmado con Lezama: no tocamos producción ni abrimos cuentas de pago.

## Ramas activas

| Rama | Estado | PR | Notas |
|---|---|---|---|
| `main` | hasta `2356e2a` (fix Vercel mergeado) | — | Estable. |

## Sub-PRs del Sprint 5 — resumen

### Sprint 5A — Perfil empleado conectado a quincenas — MERGEADO (PR #15)
Backend: `GET /api/v1/periods/me/current-status`. Frontend: `<MyPeriodCard />` en `/profile`. Sin migraciones.
Detalle: `cambios_finales_abril_ricardo/CAMBIOS_RAMA_FEAT_SPRINT5A.md`.

### Sprint 5B — Export CSV SAP + NIF — MERGEADO (PR #16)
Migración `0010_add_employee_nif.py`. Endpoint `GET /receipts/export/csv-sap` con 13 columnas (BOM UTF-8, separador `;`). NIF, Centro de coste y Cuenta contable vacíos hasta respuestas Lezama. Botón "Exportar SAP" para no-empleados.
Detalle: `cambios_finales_abril_ricardo/CAMBIOS_RAMA_FEAT_SPRINT5B.md`.

### Sprint 5C — Móvil responsive — MERGEADO (PR #17)
Sólo `frontend/src/app/receipts/page.tsx`. En `<640px`: oculta filtros + tabla, muestra upload card prominente + 5 últimos recibos como cards. `capture="environment"` en input file. Sin cambios backend.
Detalle: `cambios_finales_abril_ricardo/CAMBIOS_RAMA_FEAT_SPRINT5C.md`.

### Fix Vercel build — MERGEADO (PR #19, Alejandro)
`frontend/src/app/transactions/page.tsx`: `useSearchParams()` envuelto en `<Suspense>` boundary (obligatorio en Next.js 14 para prerendering estático). Rompía el build en Vercel aunque funcionaba en dev. Alejandro también añadió en `CLAUDE.md` la regla de ejecutar `next build` antes de cualquier push con cambios de frontend.

## Sprint 5 — desglose

Spec en `cambios_finales_abril_ricardo/AUDITORIA_PLAN_MEJORA_2026-04-17.md` sección "Sprint 5". Decisión Ricardo (2026-04-27): split en 3 PRs independientes en lugar de uno monolítico.

| Sub-PR | Estado | Alcance |
|---|---|---|
| **5A** | ✅ MERGEADO (PR #15) | Perfil empleado conectado a quincenas |
| **5B** | ✅ MERGEADO (PR #16) | Export CSV SAP preliminar + migración 0010 |
| **5C** | ✅ MERGEADO (PR #17) | `/receipts` responsive <640px |
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

## Organización de documentación (estructura desde abril 2026)

### Carpeta `cambios_finales_abril_ricardo/`
Agrupa toda la documentación de la fase de auditoría y sprints (1 al 5C), más los documentos de preguntas a Lezama. Es el histórico del trabajo realizado en abril 2026.

```
cambios_finales_abril_ricardo/
  AUDITORIA_PLAN_MEJORA_2026-04-17.md   ← spec y roadmap de los 5 sprints
  CAMBIOS_RAMA_FEAT_SPRINT1.md
  CAMBIOS_RAMA_FEAT_SPRINT1B.md
  CAMBIOS_RAMA_FEAT_SPRINT2.md
  CAMBIOS_RAMA_FEAT_SPRINT3.md
  CAMBIOS_RAMA_FEAT_SPRINT4.md
  CAMBIOS_RAMA_FEAT_SPRINT5A/B/C.md
  PREGUNTAS_LEZAMA_27-04-26.(md/pdf/html)
```

### Carpeta `.archive/pushes_anteriores/`
Documentos de estado superados o changelogs de docs ya aplicados, que no deben confundir al equipo en el día a día.

```
.archive/pushes_anteriores/
  ACTUALIZACION_ABRIL.md      ← resumen de estado antiguo
  CAMBIOS_DOCUMENTACION.md    ← changelog de docs ya aplicados
```

### Raíz — solo archivos vivos de referencia
`README.md`, `CLAUDE.md`, `STATUS.md`, `PARTNER_GUIDE.md`, `PLANNING_PROXIMOS_PASOS.md`, `DEMO_SCRIPT.md`, `onboarding.md`.

---

## Convenciones del equipo (recordatorio)

- **CLAUDE.md** = única fuente de verdad para arquitectura/stack/convenciones.
- **CAMBIOS_RAMA_FEAT_*.md** = documento por sprint en cada rama, descripción humana de qué se hizo y por qué.
- **STATUS.md** (este archivo) = estado en vivo del proyecto. Actualizar al cambiar fase.
- Rama por feature, PR a `main` con review de Alejandro, merge por Ricardo.
- No crear documentos supletorios fuera de estos tres patrones — actualizar lo existente.

---

*Para el contexto completo del cliente Lezama, requisitos del producto y stack técnico ver `CLAUDE.md`.*
*Para el roadmap detallado de los 5 sprints y las 16 preguntas abiertas ver `cambios_finales_abril_ricardo/AUDITORIA_PLAN_MEJORA_2026-04-17.md`.*
