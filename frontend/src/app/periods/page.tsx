'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { useRole } from '@/lib/role-context';
import { useToast } from '@/components/toast';
import {
  SectionHeader,
  Btn,
  SkeletonBlock,
  EmptyState,
} from '@/components/ui';
import type { Period, EmployeePeriodStatus, Employee, Receipt } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────

function daysRemaining(endDate: string): number {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

function formatDateRange(start: string, end: string): string {
  const s = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(
    new Date(start)
  );
  const e = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(end));
  return `${s} — ${e}`;
}

// ── Period Status Badge ────────────────────────────────────────────

function PeriodStatusBadge({ status }: { status: 'open' | 'closed' }) {
  const isOpen = status === 'open';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
        isOpen
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
          : 'bg-red-500/15 text-red-400 border border-red-500/25'
      }`}
    >
      {isOpen ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
      {isOpen ? 'Abierto' : 'Cerrado'}
    </span>
  );
}

// ── Page Skeleton ──────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-36 bg-slate-800/60" />
      <SkeletonBlock className="h-96 bg-slate-800/60" />
      <SkeletonBlock className="h-48 bg-slate-800/60" />
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-100 text-sm">Confirmar cierre</p>
            <p className="text-slate-400 text-xs mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Btn variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
            Cancelar
          </Btn>
          <Btn
            variant="danger"
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            <Lock className="w-3.5 h-3.5" />
            Cerrar periodo
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function PeriodsPage() {
  const { role } = useRole();
  const toast = useToast();

  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeePeriodStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const [closingPeriod, setClosingPeriod] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  const [historyExpanded, setHistoryExpanded] = useState(false);

  const isAdmin = role === 'admin';

  // ── Data Loading ─────────────────────────────────────────────────

  const buildEmployeeStatuses = useCallback(
    async (period: Period, employees: Employee[]): Promise<EmployeePeriodStatus[]> => {
      const onlyEmployees = employees.filter((e) => e.role === 'employee');

      const receiptResults = await Promise.allSettled(
        onlyEmployees.map((e) =>
          api.get<Receipt[]>(`/receipts?employee_id=${e.id}`).catch(() => [] as Receipt[])
        )
      );

      const periodStart = new Date(period.start_date);
      const periodEnd = new Date(period.end_date);
      periodEnd.setHours(23, 59, 59, 999);

      return onlyEmployees.map((emp, idx) => {
        const result = receiptResults[idx];
        const allReceipts: Receipt[] =
          result.status === 'fulfilled' ? (result.value as Receipt[]) : [];

        const periodReceipts = allReceipts.filter((r) => {
          if (!r.date) return false;
          const d = new Date(r.date);
          return d >= periodStart && d <= periodEnd;
        });

        return {
          employee: emp,
          receipt_count: periodReceipts.length,
          has_submitted: periodReceipts.length > 0,
        };
      });
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [current, allPeriods, employees] = await Promise.all([
        api.get<Period>('/periods/current'),
        api.get<Period[]>('/periods'),
        api.get<Employee[]>('/employees'),
      ]);

      setCurrentPeriod(current);
      setPeriods(allPeriods);

      const statuses = await buildEmployeeStatuses(current, employees);
      setEmployeeStatuses(statuses);
    } catch {
      toast.error('Error cargando datos de periodos');
    } finally {
      setLoading(false);
    }
  }, [buildEmployeeStatuses, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Actions ──────────────────────────────────────────────────────

  const handleClosePeriod = async () => {
    setClosingPeriod(true);
    try {
      await api.post('/periods/close-current');
      toast.success('Periodo cerrado correctamente');
      setShowConfirm(false);
      load();
    } catch {
      toast.error('Error al cerrar el periodo');
    } finally {
      setClosingPeriod(false);
    }
  };

  const handleDownloadPdf = async (periodId: string, filename: string) => {
    setDownloadingPdf(periodId);
    try {
      // Use raw fetch so we can handle binary response
      const { getBackendToken } = await import('@/lib/api');
      const token = getBackendToken();
      const res = await fetch(`/api/v1/periods/${periodId}/report/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Error al generar el informe');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar el informe PDF');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleReopenEmployee = async (periodId: string, employeeId: string) => {
    setReopeningId(employeeId);
    try {
      await api.post(`/periods/${periodId}/reopen-employee/${employeeId}`);
      toast.success('Acceso reabierto correctamente');
      load();
    } catch {
      toast.error('Error al reabrir acceso');
    } finally {
      setReopeningId(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────

  if (loading) return <PageSkeleton />;

  const closedPeriods = periods
    .filter((p) => p.status === 'closed')
    .slice(0, 6);

  const pendingCount = employeeStatuses.filter((s) => !s.has_submitted).length;
  const submittedCount = employeeStatuses.filter((s) => s.has_submitted).length;

  return (
    <div className="space-y-6">
      {/* ── Current Period Header ─────────────────────────────────── */}
      {currentPeriod ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Left: Icon + Period Info */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base font-semibold text-slate-100">
                    Quincena actual
                  </h2>
                  <PeriodStatusBadge status={currentPeriod.status} />
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  {formatDateRange(currentPeriod.start_date, currentPeriod.end_date)}
                </p>
                {currentPeriod.closed_at && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cerrado el {fmt.date(currentPeriod.closed_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Countdown + Action */}
            <div className="flex items-center gap-4 sm:flex-shrink-0">
              {currentPeriod.status === 'open' && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-300">
                    <span className="font-semibold text-amber-300">
                      {daysRemaining(currentPeriod.end_date)}
                    </span>{' '}
                    {daysRemaining(currentPeriod.end_date) === 1 ? 'día restante' : 'días restantes'}
                  </span>
                </div>
              )}

              {isAdmin && (
                <Btn
                  variant="secondary"
                  size="sm"
                  loading={downloadingPdf === currentPeriod.id}
                  onClick={() => {
                    const s = currentPeriod.start_date.replace(/-/g, '');
                    const e = currentPeriod.end_date.replace(/-/g, '');
                    handleDownloadPdf(currentPeriod.id, `expensiq_informe_${s}_${e}.pdf`);
                  }}
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Informe PDF
                </Btn>
              )}

              {isAdmin && currentPeriod.status === 'open' && (
                <Btn
                  variant="danger"
                  size="sm"
                  onClick={() => setShowConfirm(true)}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Cerrar periodo
                </Btn>
              )}
            </div>
          </div>

          {/* Summary stats */}
          {currentPeriod.status === 'open' && employeeStatuses.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-slate-100">{employeeStatuses.length}</p>
                <p className="text-xs text-slate-400 mt-0.5">Empleados</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-emerald-400">{submittedCount}</p>
                <p className="text-xs text-slate-400 mt-0.5">Con recibos</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-amber-400">{pendingCount}</p>
                <p className="text-xs text-slate-400 mt-0.5">Sin recibos</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <EmptyState
            icon={<Calendar className="w-12 h-12" />}
            title="Sin periodo activo"
            desc="No hay ninguna quincena abierta en este momento."
          />
        </div>
      )}

      {/* ── Employee Submission Table ─────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-slate-800">
          <SectionHeader
            title="Estado de envíos"
            subtitle={
              currentPeriod
                ? `Quincena ${formatDateRange(currentPeriod.start_date, currentPeriod.end_date)}`
                : 'Sin periodo activo'
            }
          />
        </div>

        {employeeStatuses.length === 0 ? (
          <EmptyState
            icon={<AlertCircle className="w-12 h-12" />}
            title="Sin empleados"
            desc="No hay empleados registrados con rol de empleado."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Empleado', 'Departamento', 'Recibos', 'Estado', ...(isAdmin ? ['Acción'] : [])].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {employeeStatuses.map(({ employee, receipt_count, has_submitted }) => {
                  const canReopen =
                    isAdmin &&
                    currentPeriod?.status === 'closed' &&
                    !has_submitted;

                  return (
                    <tr
                      key={employee.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] font-semibold text-indigo-400 uppercase">
                              {employee.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-200 whitespace-nowrap">
                              {employee.name}
                            </p>
                            <p className="text-[11px] text-slate-500">{employee.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-slate-400">
                          {employee.department ?? '—'}
                        </span>
                      </td>

                      {/* Receipt count */}
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-semibold text-slate-300">
                          {receipt_count}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        {has_submitted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                            <CheckCircle className="w-3 h-3" />
                            Enviado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                            <AlertCircle className="w-3 h-3" />
                            Sin recibos
                          </span>
                        )}
                      </td>

                      {/* Admin action */}
                      {isAdmin && (
                        <td className="px-5 py-3.5">
                          {canReopen && currentPeriod ? (
                            <Btn
                              variant="secondary"
                              size="sm"
                              loading={reopeningId === employee.id}
                              onClick={() =>
                                handleReopenEmployee(currentPeriod.id, employee.id)
                              }
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              Reabrir acceso
                            </Btn>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Period History ────────────────────────────────────────── */}
      {closedPeriods.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setHistoryExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-colors text-left"
          >
            <div>
              <p className="text-sm font-semibold text-slate-200">Historial de periodos</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {closedPeriods.length} quincenas cerradas
              </p>
            </div>
            {historyExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            )}
          </button>

          {historyExpanded && (
            <div className="border-t border-slate-800 divide-y divide-slate-800/60">
              {closedPeriods.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-300">
                        {formatDateRange(p.start_date, p.end_date)}
                      </p>
                      {p.closed_at && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Cerrado el {fmt.date(p.closed_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <PeriodStatusBadge status={p.status} />
                    {isAdmin && (
                      <button
                        disabled={downloadingPdf === p.id}
                        onClick={() => {
                          const s = p.start_date.replace(/-/g, '');
                          const e = p.end_date.replace(/-/g, '');
                          handleDownloadPdf(p.id, `expensiq_informe_${s}_${e}.pdf`);
                        }}
                        className="text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-40"
                        title="Descargar informe PDF"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Confirm Close Dialog ──────────────────────────────────── */}
      {showConfirm && (
        <ConfirmDialog
          message="Esta acción cerrará la quincena actual. Los empleados no podrán enviar recibos nuevos. Esta acción no se puede deshacer automáticamente."
          onConfirm={handleClosePeriod}
          onCancel={() => setShowConfirm(false)}
          loading={closingPeriod}
        />
      )}
    </div>
  );
}
