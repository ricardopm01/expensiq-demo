# ExpensIQ — Estado en vivo

> Documento para Alejandro y Marcos. Actualizar al terminar trabajo o cambiar de fase.
> Última actualización: **2026-04-27** por Ricardo (con Claude).

## Resumen ejecutivo

Sprints 1, 1B y 2 mergeados. Sprint 3 abierto en PR #12 con fixes de revisión interna ya aplicados. Sprint 4 pusheado a rama, en stack sobre Sprint 3 — **no abrir PR hasta que #12 esté mergeado**. Sin contrato firmado con Lezama: no tocamos producción ni abrimos cuentas de pago.

## Ramas activas

| Rama | Estado | PR | Notas |
|---|---|---|---|
| `main` | hasta `8670d94` (Sprint 2) | — | Estable. |
| `feat/sprint3-obra-proyecto-iva` | abierta, lista para review | **#12 abierto** | Marcos (commit base) + Ricardo/Claude (fixes auth + CSV filter). |
| `feat/sprint4-alertas-accionables` | pusheada, **PR pendiente** | — | Stack sobre Sprint 3. Abrir PR tras merge de #12 + rebase. |

## PR #12 — Sprint 3 (obras + IVA) — ✋ requiere review

URL: https://github.com/ricardopm01/expensiq-demo/pull/12
Autor: Marcos · Fixes adicionales: Ricardo/Claude
Base: `main` ← Head: `feat/sprint3-obra-proyecto-iva`

**Qué incluye:**
- Migraciones 0007 (`projects` table) y 0008 (campos IVA en `receipts`).
- Endpoints `/api/v1/projects` (CRUD) + `/analytics/spending-by-project`.
- Filtro `project_id` en `/receipts` (list y export CSV).
- Página `/projects` admin, combobox en upload, columna en tabla, BarChart "Gasto por Obra" en dashboard.
- Modal detalle: campo Obra editable + tabla desglose IVA.
- **Fixes de revisión interna pre-PR (commit `2fc11e9`):**
  - HIGH: `require_admin` en POST/PATCH/DELETE de `/projects`.
  - MED: filtro `project_id` que faltaba en `/receipts/export/csv`.
  - Falso positivo descartado: el chart "Gasto por Obra" YA está dentro del acordeón "Análisis detallado". Inspección directa del JSX (`page.tsx` L639 abre `analyticsOpen`, L988 cierra; el chart está en L875-927).

**Para Alejandro (revisión):**
- Verificar que `Depends(require_admin)` está bien aplicado en los 3 endpoints de escritura.
- Verificar que el CSV con `?project_id=X` solo trae recibos de esa obra (manualmente con Postman o `curl`).
- Q6 y Q11 abiertas con Lezama (formato código obra, libro IVA): NO implementadas; en sección 7 del audit doc.

## Rama `feat/sprint4-alertas-accionables` — pusheada, esperando merge de #12

Commit: `ef1fe0d`
Ver `CAMBIOS_RAMA_FEAT_SPRINT4.md` para detalle completo.

**Resumen:**
- Backend: migración 0009 (`alerts.suggested_action` TEXT NULL), endpoint `/approvals/auto-ready`, sort por severidad real con CASE (PostgreSQL ordenaba alfabéticamente — `low > high` — bug latente).
- Frontend: render `suggested_action` en cards de `/alerts`, fondo rojo claro en high/critical, banner verde "N listos para aprobar" en `/approvals`, tabs `Sin riesgo` / `Requieren revisión` / `Todos`, smart preselect de auto-aprobables.

**Procedimiento de merge:**
1. Mergear PR #12 (Sprint 3) en `main`.
2. `git checkout feat/sprint4-alertas-accionables && git rebase main` — debería ir limpio (no hay conflicto previsible).
3. `git push --force-with-lease origin feat/sprint4-alertas-accionables`.
4. `gh pr create --base main --head feat/sprint4-alertas-accionables --title "feat(sprint4): alertas accionables con suggested_action + batch approve inteligente"` (descripción copiar de CAMBIOS_RAMA_FEAT_SPRINT4.md).

## Sprint 5 — pendiente (no empezado)

Spec en `AUDITORIA_PLAN_MEJORA_2026-04-17.md` (cuando se mergee Sprint 3 vivirá en main):
- Perfil empleado conectado a quincenas.
- Export CSV preliminar SAP.
- SMTP real (SendGrid).
- Móvil: upload rápido.

**Bloqueadores:**
- SMTP real necesita credenciales SendGrid (Ricardo decide cuándo abrir cuenta — sin contrato no abrimos pagada, free tier 100/día sirve para demo).
- Export SAP necesita columnas exactas (Q1/Q2/Q3 abiertas con Lezama).

## Producción (Railway + Vercel) — bloqueado

No abrir cuentas de pago hasta que Lezama firme. Cuando se desbloquee, ver `PLANNING_PROXIMOS_PASOS.md` para variables de entorno necesarias.

## Preguntas abiertas a Lezama (las 16)

Sección 7 del `AUDITORIA_PLAN_MEJORA_2026-04-17.md`. Sin respuesta, NO implementar:
- Centro de coste, retenciones IRPF, formato exacto SAP.
- Estructura códigos obra (Q6), libro IVA (Q11), splits multi-obra (Q7).
- Política gastos formal (Q9), delegaciones aprobación (Q10).
- Histórico a migrar (Q15).

Cuando Lezama responda algo, mover a sección **Respondidas** del audit doc con fecha.

## Convenciones del equipo (recordatorio)

- **CLAUDE.md** = única fuente de verdad para arquitectura/stack/convenciones.
- **CAMBIOS_RAMA_FEAT_*.md** = documento por sprint en cada rama, descripción humana de qué se hizo y por qué (no solo el qué).
- **STATUS.md** (este archivo) = estado en vivo del proyecto, qué hay en cada rama, próximos pasos. Actualizar al cambiar fase.
- Rama por feature, PR a `main` con review de Alejandro, merge por Ricardo.
- No crear documentos supletorios fuera de estos tres patrones — actualizar lo existente.

---

*Para el contexto completo del cliente Lezama, requisitos del producto y stack técnico ver `CLAUDE.md`.*
*Para el roadmap detallado de los 5 sprints y las 16 preguntas abiertas ver `AUDITORIA_PLAN_MEJORA_2026-04-17.md` (vive en la rama Sprint 3 hasta que se mergee).*
