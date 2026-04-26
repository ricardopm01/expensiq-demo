'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CheckSquare,
  Shield,
  Zap,
  Filter,
  CheckCircle,
  UserCog,
  Crown,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { useRole } from '@/lib/role-context';
import { useToast } from '@/components/toast';
import { Card, KPICard, SectionHeader, DataTable, StatusBadge, Btn, TablePageSkeleton, EmptyState } from '@/components/ui';
import { ReceiptDetailModal } from '@/components/receipt-detail-modal';
import type { Receipt, Employee, ApprovalSummary, ApproveRejectResult, AutoReady } from '@/types';
import { APPROVAL_LEVEL_CONFIG } from '@/types';

type RiskTab = 'safe' | 'review' | 'all';

export default function ApprovalsPage() {
  const { role } = useRole();
  const toast = useToast();

  const [summary, setSummary] = useState<ApprovalSummary | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [autoReady, setAutoReady] = useState<AutoReady>({ count: 0, total_amount_eur: 0, receipt_ids: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);
  const [didPreselect, setDidPreselect] = useState(false);

  // Tabs (Sprint 4): primary navigation between sin-riesgo / revisión / todos
  const [riskTab, setRiskTab] = useState<RiskTab>('safe');
  // Filters legacy (selects bajo "Filtros avanzados")
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Modal
  const [modalReceipt, setModalReceipt] = useState<Receipt | null>(null);

  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

  const load = useCallback(async () => {
    try {
      const [s, r, e, ar] = await Promise.all([
        api.get<ApprovalSummary>('/analytics/approval-summary'),
        api.get<Receipt[]>('/receipts?limit=500'),
        api.get<Employee[]>('/employees'),
        api.get<AutoReady>('/approvals/auto-ready'),
      ]);
      setSummary(s);
      setReceipts(r);
      setEmployees(e);
      setAutoReady(ar);
    } catch {
      toast.error('Error cargando datos de aprobaciones');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Sprint 4: smart preselect — primer load preselecciona los auto-ready aprobables.
  useEffect(() => {
    if (didPreselect) return;
    if (autoReady.receipt_ids.length === 0) return;
    const approvable = autoReady.receipt_ids.filter((id) => {
      const r = receipts.find((x) => x.id === id);
      return r ? canApprove(r.approval_level) : false;
    });
    if (approvable.length > 0) {
      setSelected(new Set(approvable));
      setDidPreselect(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReady, receipts]);

  // Filter receipts to pending ones (pending, review, flagged)
  const pendingStatuses = ['pending', 'review', 'flagged'];
  const safeIds = new Set(autoReady.receipt_ids);
  const filtered = receipts.filter((r) => {
    if (!pendingStatuses.includes(r.status)) return false;
    // Sprint 4: tabs primarios
    if (riskTab === 'safe' && !safeIds.has(r.id)) return false;
    if (riskTab === 'review' && safeIds.has(r.id)) return false;
    // Legacy selects (filtros avanzados)
    if (levelFilter) {
      if (levelFilter === 'admin') {
        if (!['admin', 'manager', 'director'].includes(r.approval_level || '')) return false;
      } else if (r.approval_level !== levelFilter) {
        return false;
      }
    }
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  // Conteos para badges en tabs (sin aplicar filtros legacy)
  const allPending = receipts.filter((r) => pendingStatuses.includes(r.status));
  const safeCount = allPending.filter((r) => safeIds.has(r.id)).length;
  const reviewCount = allPending.length - safeCount;

  // Can current role approve this level?
  const canApprove = (level: string | null) => {
    if (!level || level === 'auto') return true;
    return role === 'admin';
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.filter((r) => canApprove(r.approval_level)).map((r) => r.id)));
    }
  };

  const batchApprove = async (ids?: string[]) => {
    const toApprove = ids ?? Array.from(selected);
    if (toApprove.length === 0) return;
    setApproving(true);
    let ok = 0;
    let fail = 0;
    for (const id of toApprove) {
      try {
        await api.post<ApproveRejectResult>(`/receipts/${id}/approve`);
        ok++;
      } catch {
        fail++;
      }
    }
    toast.success(`${ok} aprobados${fail ? `, ${fail} fallidos` : ''}`);
    setSelected(new Set());
    setApproving(false);
    load();
  };

  const approveAllSafe = async () => {
    // Sólo los que el rol actual puede aprobar (auto siempre lo puede cualquier rol).
    const approvable = autoReady.receipt_ids.filter((id) => {
      const r = receipts.find((x) => x.id === id);
      return r ? canApprove(r.approval_level) : false;
    });
    await batchApprove(approvable);
  };

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="space-y-6">
      {/* KPIs — 3 tiers + approved today */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Auto (&lt;100€)"
          value={summary?.pending_auto ?? 0}
          sub="Aprobacion automatica"
          icon={<Zap className="w-5 h-5" />}
          accent="emerald"
        />
        <KPICard
          label="Manager (100-500€)"
          value={summary?.pending_manager ?? 0}
          sub="Requiere manager"
          icon={<UserCog className="w-5 h-5" />}
          accent="indigo"
        />
        <KPICard
          label="Director (≥500€)"
          value={summary?.pending_director ?? 0}
          sub="Requiere director"
          icon={<Crown className="w-5 h-5" />}
          accent="indigo"
        />
        <KPICard
          label="Aprobados hoy"
          value={summary?.approved_today ?? 0}
          sub="Procesados en el dia"
          icon={<CheckCircle className="w-5 h-5" />}
          accent="emerald"
        />
      </div>

      {/* Sprint 4 — Banner Auto-ready: recibos sin riesgo listos para aprobar */}
      {autoReady.count > 0 && (
        <Card className="p-4 border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {autoReady.count} {autoReady.count === 1 ? 'recibo listo' : 'recibos listos'} para aprobar
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Importe total: <span className="font-semibold text-slate-700">{fmt.money(autoReady.total_amount_eur)}</span>
                  {' '}· Auto-aprobables sin alertas asociadas
                </p>
              </div>
            </div>
            <Btn onClick={approveAllSafe} loading={approving} size="sm">
              <CheckSquare className="w-3.5 h-3.5" />
              Aprobar todos
            </Btn>
          </div>
        </Card>
      )}

      {/* Filters + Batch actions */}
      <Card className="p-5">
        <SectionHeader
          title="Cola de aprobacion"
          subtitle={`${filtered.length} recibos · ${riskTab === 'safe' ? 'sin riesgo' : riskTab === 'review' ? 'requieren revisión' : 'todos'}`}
          action={
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <Btn onClick={() => batchApprove()} loading={approving} size="sm">
                  <CheckSquare className="w-3.5 h-3.5" />
                  Aprobar {selected.size}
                </Btn>
              )}
            </div>
          }
        />

        {/* Sprint 4 — Tabs primarios: Sin riesgo / Requieren revisión / Todos */}
        <div className="flex items-center gap-1 mb-4 border-b border-slate-100">
          {([
            { id: 'safe', label: 'Sin riesgo', count: safeCount },
            { id: 'review', label: 'Requieren revisión', count: reviewCount },
            { id: 'all', label: 'Todos', count: allPending.length },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRiskTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                riskTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-semibold ${
                riskTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}

          {/* Role indicator a la derecha */}
          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 pb-2">
            <Shield className="w-3.5 h-3.5" />
            Rol: <span className="font-semibold text-slate-600">
              {role === 'admin' ? 'Administrador' : 'Empleado'}
            </span>
          </div>
        </div>

        {/* Filtros avanzados (legacy selects, plegados por defecto) */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 mb-3"
        >
          <Filter className="w-3 h-3" />
          Filtros avanzados
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showAdvanced && (
          <div className="flex items-center gap-3 mb-4">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600"
            >
              <option value="">Todos los niveles</option>
              <option value="auto">Auto (&lt;100€)</option>
              <option value="manager">Manager (100-500€)</option>
              <option value="director">Director (≥500€)</option>
              <option value="admin">Admin (legacy)</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600"
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="review">Revisar</option>
              <option value="flagged">Marcado</option>
            </select>
          </div>
        )}

        <DataTable
          headers={['', 'Comercio', 'Empleado', 'Importe', 'Nivel', 'Estado', 'Fecha', '']}
          empty={filtered.length === 0 && (
            <EmptyState
              icon={<CheckSquare className="w-12 h-12" />}
              title="Sin aprobaciones pendientes"
              desc="No hay recibos pendientes de aprobacion con los filtros actuales."
            />
          )}
        >
          {filtered.map((r) => {
            const level = APPROVAL_LEVEL_CONFIG[r.approval_level || 'auto'];
            const allowed = canApprove(r.approval_level);
            return (
              <tr
                key={r.id}
                className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors cursor-pointer"
                onClick={() => setModalReceipt(r)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleSelect(r.id)}
                    disabled={!allowed}
                    className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-400 disabled:opacity-30"
                  />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-700">
                  {r.merchant || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {r.employee_name || empMap[r.employee_id]?.name || '—'}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                  {r.amount != null ? fmt.money(r.amount, r.currency) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${level.bg} ${level.text}`}
                    title={r.approval_reason || level.label}
                  >
                    {level.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {fmt.date(r.date)}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  {allowed ? (
                    <Btn
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await api.post<ApproveRejectResult>(`/receipts/${r.id}/approve`);
                          toast.success('Recibo aprobado');
                          load();
                        } catch {
                          toast.error('Error al aprobar');
                        }
                      }}
                    >
                      Aprobar
                    </Btn>
                  ) : (
                    <span className="text-[11px] text-slate-300" title="Tu rol no tiene permiso para este nivel">
                      Sin permiso
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </DataTable>

        {filtered.length > 0 && (
          <div className="mt-3 flex items-center gap-2 px-4">
            <button
              onClick={selectAll}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
            >
              {selected.size === filtered.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
          </div>
        )}
      </Card>

      {/* Modal */}
      {modalReceipt && (
        <ReceiptDetailModal
          receipt={modalReceipt}
          empMap={empMap}
          onClose={() => setModalReceipt(null)}
          onUpdate={() => {
            setModalReceipt(null);
            load();
          }}
        />
      )}
    </div>
  );
}
