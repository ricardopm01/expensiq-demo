'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CheckSquare,
  Shield,
  Zap,
  Filter,
  CheckCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { useRole } from '@/lib/role-context';
import { useToast } from '@/components/toast';
import { Card, KPICard, SectionHeader, DataTable, StatusBadge, Btn, TablePageSkeleton, EmptyState } from '@/components/ui';
import { ReceiptDetailModal } from '@/components/receipt-detail-modal';
import type { Receipt, Employee, ApprovalSummary, ApproveRejectResult } from '@/types';
import { APPROVAL_LEVEL_CONFIG } from '@/types';

export default function ApprovalsPage() {
  const { role } = useRole();
  const toast = useToast();

  const [summary, setSummary] = useState<ApprovalSummary | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);

  // Filters
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal
  const [modalReceipt, setModalReceipt] = useState<Receipt | null>(null);

  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

  const load = useCallback(async () => {
    try {
      const [s, r, e] = await Promise.all([
        api.get<ApprovalSummary>('/analytics/approval-summary'),
        api.get<Receipt[]>('/receipts?limit=500'),
        api.get<Employee[]>('/employees'),
      ]);
      setSummary(s);
      setReceipts(r);
      setEmployees(e);
    } catch {
      toast.error('Error cargando datos de aprobaciones');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Filter receipts to pending ones (pending, review, flagged)
  const pendingStatuses = ['pending', 'review', 'flagged'];
  const filtered = receipts.filter((r) => {
    if (!pendingStatuses.includes(r.status)) return false;
    if (levelFilter) {
      if (levelFilter === 'admin') {
        // Match admin, manager, director (legacy)
        if (!['admin', 'manager', 'director'].includes(r.approval_level || '')) return false;
      } else if (r.approval_level !== levelFilter) {
        return false;
      }
    }
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

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

  const batchApprove = async () => {
    if (selected.size === 0) return;
    setApproving(true);
    let ok = 0;
    let fail = 0;
    for (const id of Array.from(selected)) {
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

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard
          label="Auto-aprobacion"
          value={summary?.pending_auto ?? 0}
          sub="Pendientes < 100 EUR"
          icon={<Zap className="w-5 h-5" />}
          accent="emerald"
        />
        <KPICard
          label="Administrador"
          value={summary?.pending_admin ?? 0}
          sub="Pendientes >= 100 EUR"
          icon={<Shield className="w-5 h-5" />}
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

      {/* Filters + Batch actions */}
      <Card className="p-5">
        <SectionHeader
          title="Cola de aprobacion"
          subtitle={`${filtered.length} recibos pendientes`}
          action={
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <Btn onClick={batchApprove} loading={approving} size="sm">
                  <CheckSquare className="w-3.5 h-3.5" />
                  Aprobar {selected.size}
                </Btn>
              )}
            </div>
          }
        />

        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600"
          >
            <option value="">Todos los niveles</option>
            <option value="auto">Auto (&lt;100 EUR)</option>
            <option value="admin">Administrador (&ge;100 EUR)</option>
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

          {/* Role indicator */}
          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5" />
            Rol actual: <span className="font-semibold text-slate-600">
              {role === 'admin' ? 'Administrador' : 'Empleado'}
            </span>
          </div>
        </div>

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
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${level.bg} ${level.text}`}>
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
