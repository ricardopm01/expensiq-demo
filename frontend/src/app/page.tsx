'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Wallet,
  CheckCircle,
  Search,
  AlertTriangle,
  Zap,
  FolderOpen,
  TrendingUp,
  Shield,
  ArrowRight,
  Clock,
  BarChart3,
  Receipt as ReceiptIcon,
  ChevronDown,
  ChevronUp,
  FileDown,
  Calendar,
  Lock,
  Unlock,
} from 'lucide-react';
import { api, getBackendToken } from '@/lib/api';
import { fmt } from '@/lib/format';
import { Card, KPICard, SectionHeader, Btn, EmptyState, DashboardSkeleton, StatusBadge } from '@/components/ui';
import { AccionHoyBanner } from '@/components/accion-hoy-banner';
import { useToast } from '@/components/toast';
import { useRole } from '@/lib/role-context';
import type { Summary, CategoryBreakdown, TopSpender, Alert, MonthlyTrend, ApprovalSummary, EmployeeDetail, Receipt, DepartmentComparison, Period, SpendingByProject, ActionToday } from '@/types';
import { CATEGORY_LABEL, CATEGORY_COLOR, ALERT_LABEL } from '@/types';

/* ──────────────────────────────────────
   Employee Personal Dashboard
   ────────────────────────────────────── */
function EmployeeDashboard() {
  const router = useRouter();
  const toast = useToast();
  const { employeeId } = useRole();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    Promise.all([
      api.get<EmployeeDetail>(`/employees/${employeeId}`),
      api.get<Receipt[]>(`/receipts?employee_id=${employeeId}&limit=5`),
    ])
      .then(([emp, recs]) => {
        setEmployee(emp);
        setReceipts(Array.isArray(recs) ? recs : []);
      })
      .catch(() => toast.error('Error cargando datos personales'))
      .finally(() => setLoading(false));
  }, [employeeId, toast]);

  if (!employeeId) {
    return (
      <EmptyState
        icon={<Zap className="w-12 h-12" />}
        title="Selecciona tu perfil"
        desc="Elige tu nombre en el selector de la barra superior."
      />
    );
  }

  if (loading) return <DashboardSkeleton />;
  if (!employee) return <EmptyState icon={<Zap className="w-12 h-12" />} title="Empleado no encontrado" desc="" />;

  const budgetPct =
    employee.monthly_budget && employee.monthly_budget > 0
      ? Math.min(100, Math.round((employee.total_spending / employee.monthly_budget) * 100))
      : 0;
  const budgetOver =
    employee.monthly_budget != null &&
    employee.monthly_budget > 0 &&
    employee.total_spending > employee.monthly_budget;

  const donutData = employee.category_breakdown.map((c) => ({
    name: CATEGORY_LABEL[c.category] || c.category,
    value: c.total_amount,
    color: CATEGORY_COLOR[c.category] || '#94A3B8',
    category: c.category,
  }));
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  const pendingReceipts = receipts.filter((r) => r.status === 'pending' || r.status === 'review');

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <Card className="p-5 bg-gradient-to-r from-indigo-50 to-emerald-50 border-indigo-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            {employee.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-indigo-800">Hola, {employee.name.split(' ')[0]}</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              {employee.department || 'General'} &middot; {employee.receipt_count} recibos registrados
            </p>
          </div>
        </div>
      </Card>

      {/* Personal KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Mi Gasto Total"
          value={fmt.money(employee.total_spending)}
          sub={`${employee.receipt_count} recibos`}
          icon={<Wallet className="w-5 h-5" />}
          accent="indigo"
        />
        <KPICard
          label="Conciliados"
          value={employee.matched_count || 0}
          sub="verificados"
          icon={<CheckCircle className="w-5 h-5" />}
          accent="emerald"
        />
        <KPICard
          label="Pendientes"
          value={employee.pending_count || 0}
          sub="por procesar"
          icon={<Clock className="w-5 h-5" />}
          accent="amber"
        />
        <KPICard
          label="Presupuesto"
          value={employee.monthly_budget ? fmt.money(employee.monthly_budget) : 'Sin limite'}
          sub={employee.monthly_budget ? `${budgetPct}% utilizado` : '-'}
          icon={<BarChart3 className="w-5 h-5" />}
          accent={budgetOver ? 'red' : 'purple'}
        />
      </div>

      {/* Budget Bar */}
      {employee.monthly_budget != null && employee.monthly_budget > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">Uso del Presupuesto</span>
            <span className={`text-sm font-bold ${budgetOver ? 'text-red-600' : 'text-indigo-600'}`}>
              {budgetPct}%
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                budgetOver ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
              }`}
              style={{ width: `${Math.min(100, budgetPct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-slate-400">{fmt.money(employee.total_spending)} gastado</span>
            <span className="text-xs text-slate-400">{fmt.money(employee.monthly_budget)} limite</span>
          </div>
        </Card>
      )}

      {/* Category Donut + Recent Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Donut */}
        <Card hover className="p-5">
          <SectionHeader title="Mis Gastos por Categoria" subtitle="Distribucion de tu gasto" />
          {donutData.length === 0 ? (
            <EmptyState icon={<FolderOpen className="w-12 h-12" />} title="Sin datos" desc="Sube recibos para ver el desglose." />
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={65} paddingAngle={2} dataKey="value">
                      {donutData.map((d, i) => (
                        <Cell key={i} fill={d.color} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [fmt.money(Number(value))]} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-slate-400 font-medium">Total</span>
                  <span className="text-sm font-bold text-slate-700">{fmt.money(donutTotal)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                {donutData.slice(0, 6).map((d) => {
                  const pct = donutTotal > 0 ? (d.value / donutTotal) * 100 : 0;
                  return (
                    <div key={d.name} className="space-y-0.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-slate-500 flex-1 truncate">{d.name}</span>
                        <span className="font-semibold text-slate-700 flex-shrink-0">{fmt.money(d.value)}</span>
                      </div>
                      <div className="ml-4 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color, opacity: 0.7 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Recent Receipts */}
        <Card hover className="p-5">
          <SectionHeader
            title="Mis Recibos Recientes"
            subtitle={`${pendingReceipts.length} pendientes`}
            action={
              <Btn variant="ghost" size="sm" onClick={() => router.push('/receipts')}>
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </Btn>
            }
          />
          {receipts.length === 0 ? (
            <EmptyState icon={<ReceiptIcon className="w-12 h-12" />} title="Sin recibos" desc="Sube tu primer recibo." />
          ) : (
            <div className="space-y-2">
              {receipts.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => router.push('/receipts')}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {r.merchant || 'Procesando...'}
                    </p>
                    <p className="text-xs text-slate-400">{fmt.date(r.date || r.upload_timestamp)}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800 flex-shrink-0">
                    {r.amount != null ? fmt.money(r.amount) : '-'}
                  </p>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Admin / Manager Dashboard (original)
   ────────────────────────────────────── */
function AdminDashboard() {
  const router = useRouter();
  const toast = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [spenders, setSpenders] = useState<TopSpender[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trend, setTrend] = useState<MonthlyTrend[]>([]);
  const [approvalSummary, setApprovalSummary] = useState<ApprovalSummary | null>(null);
  const [deptComparison, setDeptComparison] = useState<DepartmentComparison[]>([]);
  const [spendingByProject, setSpendingByProject] = useState<SpendingByProject[]>([]);
  const [period, setPeriod] = useState<Period | null>(null);
  const [actionToday, setActionToday] = useState<ActionToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoStep, setDemoStep] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined'
      ? window.localStorage.getItem('expensiq.dashboardAnalyticsOpen')
      : null;
    if (saved === 'true') setAnalyticsOpen(true);
  }, []);

  const toggleAnalytics = () => {
    setAnalyticsOpen((v) => {
      const next = !v;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('expensiq.dashboardAnalyticsOpen', String(next));
      }
      return next;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, sp, a, t, as_, dept, per, sbp, at_] = await Promise.all([
        api.get<Summary>('/analytics/summary'),
        api.get<CategoryBreakdown[]>('/analytics/categories'),
        api.get<TopSpender[]>('/analytics/top-spenders'),
        api.get<Alert[]>('/alerts?resolved=false'),
        api.get<MonthlyTrend[]>('/analytics/monthly-trend'),
        api.get<ApprovalSummary>('/analytics/approval-summary'),
        api.get<DepartmentComparison[]>('/analytics/department-comparison'),
        api.get<Period>('/periods/current').catch(() => null),
        api.get<SpendingByProject[]>('/analytics/spending-by-project').catch(() => []),
        api.get<ActionToday>('/analytics/action-today').catch(() => null),
      ]);
      setSummary(s);
      setCategories(Array.isArray(c) ? c : []);
      setSpenders(Array.isArray(sp) ? sp : []);
      setAlerts(Array.isArray(a) ? a.slice(0, 5) : []);
      setTrend(Array.isArray(t) ? t : []);
      setApprovalSummary(as_);
      setDeptComparison(Array.isArray(dept) ? dept : []);
      setPeriod(per);
      setSpendingByProject(Array.isArray(sbp) ? sbp.filter(p => p.total_spending > 0).slice(0, 10) : []);
      setActionToday(at_);
    } catch {
      toast.error('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleDownloadPeriodPdf = async () => {
    if (!period) return;
    setDownloadingPdf(true);
    try {
      const token = getBackendToken();
      const res = await fetch(`/api/v1/periods/${period.id}/report/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const s = period.start_date.replace(/-/g, '');
      const e = period.end_date.replace(/-/g, '');
      const a = document.createElement('a');
      a.href = url;
      a.download = `expensiq_informe_${s}_${e}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar el informe PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFullDemo = async () => {
    setDemoLoading(true);
    try {
      setDemoStep('Cargando empleados, recibos y transacciones...');
      const result = await api.post<{
        status: string;
        employees?: number;
        receipts?: number;
        transactions?: number;
        matches?: number;
        alerts?: number;
      }>('/demo/seed', {});
      if (result.status === 'skipped') {
        toast.info('La base de datos ya tiene datos');
      } else {
        toast.success(
          `Demo cargado: ${result.employees} empleados, ${result.receipts} recibos, ${result.matches} matches, ${result.alerts} alertas`
        );
      }
    } catch {
      toast.error('Error cargando demo');
    } finally {
      setDemoStep('');
      setDemoLoading(false);
      await load();
    }
  };

  if (loading) return <DashboardSkeleton />;

  const pctMatched =
    summary && summary.receipt_count > 0
      ? Math.round((summary.matched_count / summary.receipt_count) * 100)
      : 0;

  const donutData = categories.map((c) => ({
    name: CATEGORY_LABEL[c.category] || c.category,
    value: c.total_amount,
    color: CATEGORY_COLOR[c.category] || '#94A3B8',
    category: c.category,
  }));

  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  const barData = spenders.map((s) => ({
    name: s.name.split(' ')[0],
    value: s.total_month,
    employee_id: s.employee_id,
  }));

  return (
    <div className="space-y-6">
      {/* Acción Hoy Banner — prioritario */}
      <AccionHoyBanner />

      {/* Welcome banner */}
      {summary && summary.receipt_count === 0 && (
        <Card className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-indigo-800 text-sm">
                Bienvenido a ExpensIQ
              </p>
              <p className="text-xs text-indigo-600 mt-0.5">
                {demoLoading
                  ? demoStep
                  : 'Carga el demo completo para ver el sistema en accion con datos reales.'}
              </p>
            </div>
            <Btn onClick={handleFullDemo} loading={demoLoading} size="sm">
              {demoLoading ? 'Procesando...' : 'Cargar Demo Completo'}
            </Btn>
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cursor-pointer" onClick={() => router.push('/receipts')}>
          <KPICard
            label="Gasto Total"
            value={fmt.money(summary?.total_spending)}
            sub={`${summary?.receipt_count || 0} recibos totales`}
            icon={<Wallet className="w-5 h-5" />}
            accent="indigo"
          />
        </div>
        <div className="cursor-pointer" onClick={() => router.push('/receipts?status=matched')}>
          <KPICard
            label="Conciliados"
            value={summary?.matched_count || 0}
            sub={`${pctMatched}% del total`}
            icon={<CheckCircle className="w-5 h-5" />}
            accent="emerald"
          />
        </div>
        <div className="cursor-pointer" onClick={() => router.push('/receipts?status=review')}>
          <KPICard
            label="En Revision"
            value={(summary?.review_count || 0) + (summary?.pending_count || 0)}
            sub={`${summary?.flagged_count || 0} marcados`}
            icon={<Search className="w-5 h-5" />}
            accent="amber"
          />
        </div>
        <div className="cursor-pointer" onClick={() => router.push('/alerts')}>
          <KPICard
            label="Alertas Activas"
            value={summary?.open_alert_count || 0}
            sub={`${summary?.unmatched_txn_count || 0} txns sin recibo`}
            icon={<AlertTriangle className="w-5 h-5" />}
            accent="red"
          />
        </div>
      </div>

      {/* Reconciliation progress */}
      {summary && summary.receipt_count > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">
              Progreso de Conciliacion
            </span>
            <span className="text-sm font-bold text-indigo-600">{pctMatched}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${pctMatched}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-400">
              {summary.matched_count} conciliados
            </span>
            <span className="text-xs text-slate-400">
              {summary.receipt_count - (summary.matched_count || 0)} pendientes
            </span>
          </div>
        </Card>
      )}

      {/* Period Summary Card */}
      {period && (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800">Quincena actual</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      period.status === 'open'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {period.status === 'open' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {period.status === 'open' ? 'Abierta' : 'Cerrada'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {fmt.date(period.start_date)} — {fmt.date(period.end_date)}
                </p>
                {/* Submission progress indicator */}
                {actionToday && actionToday.period_total_employees > 0 && (
                  <div className="mt-2">
                    {(() => {
                      const total = actionToday.period_total_employees;
                      const pending = actionToday.period_pending_employees;
                      const sent = period.status === 'open' ? total - pending : total;
                      const pct = Math.round((sent / total) * 100);
                      const label = period.status === 'open'
                        ? `${sent}/${total} empleados han enviado sus gastos`
                        : `${pending} empleado${pending !== 1 ? 's' : ''} sin revisar`;
                      const barColor = period.status === 'open'
                        ? (pct === 100 ? 'bg-emerald-500' : pending > 0 ? 'bg-amber-400' : 'bg-indigo-400')
                        : (pending > 0 ? 'bg-amber-400' : 'bg-emerald-500');
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-slate-500">{label}</span>
                            {period.status === 'open' && pending > 0 && (
                              <button
                                onClick={() => router.push('/periods')}
                                className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium"
                              >
                                Ver →
                              </button>
                            )}
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full max-w-xs">
                            <div
                              className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
            <Btn
              variant="secondary"
              size="sm"
              onClick={handleDownloadPeriodPdf}
              loading={downloadingPdf}
              disabled={period.status === 'open' || downloadingPdf}
            >
              <FileDown className="w-3.5 h-3.5" />
              {period.status === 'open' ? 'PDF (al cerrar)' : 'Informe PDF'}
            </Btn>
          </div>
        </Card>
      )}

      {/* Monthly Trend + Recent Alerts — información prioritaria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card hover className="lg:col-span-2 p-5">
          <SectionHeader
            title="Tendencia Mensual"
            subtitle="Gasto por mes (ultimos 6 meses)"
          />
          {trend.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="w-12 h-12" />}
              title="Sin datos"
              desc="Carga datos de demo para ver la tendencia."
            />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={45} />
                <Tooltip formatter={(value) => [fmt.money(Number(value)), 'Gasto']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="total" stroke="#6366F1" strokeWidth={2.5} fill="url(#trendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <SectionHeader
            title="Alertas Recientes"
            subtitle={`${alerts.length} alertas activas`}
            action={
              alerts.length > 0 ? (
                <Btn variant="ghost" size="sm" onClick={() => router.push('/alerts')}>
                  Ver todas
                </Btn>
              ) : undefined
            }
          />
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Sin alertas activas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                        {ALERT_LABEL[a.alert_type] || a.alert_type}
                      </span>
                      {!a.is_read && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                    </div>
                    <p className="text-xs text-slate-700 line-clamp-2">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Acordeón "Análisis detallado" — plegado por defecto */}
      <Card className="p-0 overflow-hidden">
        <button
          onClick={toggleAnalytics}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Análisis detallado</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Top gastadores, categorías, empleados y comparativa por departamento
              </p>
            </div>
          </div>
          {analyticsOpen
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {analyticsOpen && (
          <div className="border-t border-slate-100 p-5 space-y-6 bg-slate-50/30">

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Top Spenders */}
        <Card hover className="lg:col-span-3 p-5">
          <SectionHeader
            title="Top Gastadores"
            subtitle="Clic en un empleado para ver su desglose"
          />
          {barData.length === 0 ? (
            <EmptyState
              icon={<Zap className="w-12 h-12" />}
              title="Sin datos"
              desc="Carga datos de demo para ver el ranking."
            />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis
                  type="number"
                  tickFormatter={(v) => fmt.money(v)}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip
                  formatter={(value) => [fmt.money(Number(value)), 'Gasto']}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 8, 8, 0]}
                  cursor="pointer"
                  onClick={(_data, index) => {
                    const d = barData[index];
                    if (d?.employee_id) {
                      router.push(`/employees/${d.employee_id}`);
                    }
                  }}
                >
                  {barData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={`hsla(${230 + i * 15}, 70%, 60%, 0.85)`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Category Donut */}
        <Card hover className="lg:col-span-2 p-5">
          <SectionHeader
            title="Por Categoria"
            subtitle="Clic en una categoria para ver recibos"
          />
          {donutData.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="w-12 h-12" />}
              title="Sin datos"
              desc="Concilia recibos para ver el desglose."
            />
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                      cursor="pointer"
                      onClick={(_data, index) => {
                        const d = donutData[index];
                        if (d?.category) {
                          router.push(`/receipts?category=${d.category}`);
                        }
                      }}
                    >
                      {donutData.map((d, i) => (
                        <Cell key={i} fill={d.color} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [fmt.money(Number(value))]}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-slate-400 font-medium">Total</span>
                  <span className="text-sm font-bold text-slate-700">
                    {fmt.money(donutTotal)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                {donutData.slice(0, 6).map((d) => {
                  const pct = donutTotal > 0 ? (d.value / donutTotal) * 100 : 0;
                  return (
                    <div
                      key={d.name}
                      className="space-y-0.5 cursor-pointer hover:bg-slate-50 rounded-lg px-1 -mx-1 py-0.5"
                      onClick={() => router.push(`/receipts?category=${d.category}`)}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: d.color }}
                        />
                        <span className="text-slate-500 flex-1 truncate">{d.name}</span>
                        <span className="font-semibold text-slate-700 flex-shrink-0">
                          {fmt.money(d.value)}
                        </span>
                      </div>
                      <div className="ml-4 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: d.color,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Approval Summary Panel */}
      <Card hover className="p-5">
        <SectionHeader
          title="Aprobaciones"
          subtitle="Pendientes por nivel"
          action={
            <Btn variant="ghost" size="sm" onClick={() => router.push('/approvals')}>
              <ArrowRight className="w-3.5 h-3.5" />
            </Btn>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
            <Zap className="w-5 h-5 text-emerald-500" />
            <div className="flex-1">
              <p className="text-xs text-slate-400">Auto (&lt;100 EUR)</p>
              <p className="text-lg font-bold text-slate-800">{approvalSummary?.pending_auto ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
            <Shield className="w-5 h-5 text-indigo-500" />
            <div className="flex-1">
              <p className="text-xs text-slate-400">Administrador (&ge;100 EUR)</p>
              <p className="text-lg font-bold text-slate-800">{approvalSummary?.pending_admin ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center justify-center p-3 bg-slate-50 rounded-xl">
            <span className="text-xs text-emerald-600 font-medium">
              {approvalSummary?.approved_today ?? 0} aprobados hoy
            </span>
          </div>
        </div>
      </Card>

      {/* Employee Grid */}
      {spenders.length > 0 && (
        <Card className="p-5">
          <SectionHeader
            title="Empleados — Gasto vs Presupuesto"
            subtitle="Top empleados por volumen de gasto"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {spenders.slice(0, 8).map((s) => {
              const budget = s.monthly_budget || 0;
              const pct = budget > 0 ? Math.min((s.total_month / budget) * 100, 100) : 0;
              const overBudget = budget > 0 && s.total_month > budget;
              return (
                <div
                  key={s.employee_id}
                  className="p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => router.push(`/employees/${s.employee_id}`)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                      {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{s.name.split(' ')[0]}</p>
                      <p className="text-[10px] text-slate-400">{s.department || 'General'}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-1">{fmt.money(s.total_month)}</p>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${overBudget ? 'bg-red-500' : 'bg-indigo-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {s.receipt_count} recibos{budget > 0 ? ` · ${pct.toFixed(0)}% presupuesto` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Gasto por Obra */}
      {spendingByProject.length > 0 && (
        <Card className="p-5">
          <SectionHeader
            title="Gasto por Obra"
            subtitle="Top obras por volumen de gasto — clic para filtrar recibos"
            action={
              <button
                onClick={() => router.push('/projects')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                Gestionar obras <ArrowRight className="w-3 h-3" />
              </button>
            }
          />
          <ResponsiveContainer width="100%" height={Math.max(140, spendingByProject.length * 36)}>
            <BarChart data={spendingByProject} layout="vertical" margin={{ left: 10, right: 40 }}>
              <XAxis
                type="number"
                tickFormatter={(v) => fmt.money(v)}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="code"
                tick={{ fontSize: 11, fill: '#4f46e5', fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip
                formatter={(value, _name, props) => [
                  `${fmt.money(Number(value))} · ${(props.payload as SpendingByProject).receipt_count} recibos`,
                  (props.payload as SpendingByProject).name,
                ]}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar
                dataKey="total_spending"
                radius={[0, 8, 8, 0]}
                fill="#6366f1"
                cursor="pointer"
                onClick={(_data, index) => {
                  const d = spendingByProject[index];
                  if (d?.project_id) router.push(`/receipts?project_id=${d.project_id}`);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Department Comparison */}
      {deptComparison.length > 0 && (
        <Card className="p-5">
          <SectionHeader
            title="Comparativa por Departamento"
            subtitle="Gasto real vs presupuesto asignado"
          />
          <div className="space-y-3 mt-2">
            {deptComparison.map((d) => {
              const pct = d.budget_total > 0 ? Math.min((d.total_spending / d.budget_total) * 100, 100) : 0;
              const over = d.utilization_pct > 100;
              const warn = d.utilization_pct >= 80 && !over;
              const barColor = over ? '#ef4444' : warn ? '#f59e0b' : '#6366f1';
              return (
                <div key={d.department} className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700 w-36 truncate flex-shrink-0">{d.department}</span>
                    <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                      {d.budget_total > 0 && (
                        <div className="absolute right-0 top-0 h-full w-px bg-slate-300" />
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 w-28">
                      <span className="text-sm font-bold text-slate-800">{fmt.money(d.total_spending)}</span>
                      {d.budget_total > 0 && (
                        <span className="text-xs text-slate-400 ml-1">/ {fmt.money(d.budget_total)}</span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        over ? 'bg-red-50 text-red-600' : warn ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {d.utilization_pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex gap-3 ml-36 text-[11px] text-slate-400">
                    <span>{d.employee_count} empleados</span>
                    <span>·</span>
                    <span>{d.receipt_count} recibos</span>
                    {d.top_category && (
                      <>
                        <span>·</span>
                        <span>Mayor gasto: {CATEGORY_LABEL[d.top_category] || d.top_category}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

          </div>
        )}
      </Card>
    </div>
  );
}

/* ──────────────────────────────────────
   Main Page — Routes by role
   ────────────────────────────────────── */
export default function DashboardPage() {
  const { role } = useRole();
  return role === 'employee' ? <EmployeeDashboard /> : <AdminDashboard />;
}
