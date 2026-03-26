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
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  Wallet,
  CheckCircle,
  Search,
  AlertTriangle,
  Zap,
  FolderOpen,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { Card, KPICard, SectionHeader, Btn, EmptyState, PageLoading } from '@/components/ui';
import { useToast } from '@/components/toast';
import type { Summary, CategoryBreakdown, TopSpender, Alert } from '@/types';
import { CATEGORY_LABEL, CATEGORY_COLOR, ALERT_LABEL } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [spenders, setSpenders] = useState<TopSpender[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoStep, setDemoStep] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, sp, a] = await Promise.all([
        api.get<Summary>('/analytics/summary'),
        api.get<CategoryBreakdown[]>('/analytics/categories'),
        api.get<TopSpender[]>('/analytics/top-spenders'),
        api.get<Alert[]>('/alerts?resolved=false'),
      ]);
      setSummary(s);
      setCategories(Array.isArray(c) ? c : []);
      setSpenders(Array.isArray(sp) ? sp : []);
      setAlerts(Array.isArray(a) ? a.slice(0, 5) : []);
    } catch {
      toast.error('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFullDemo = async () => {
    setDemoLoading(true);
    try {
      setDemoStep('Cargando empleados y recibos...');
      await api.post('/seed', {});
      setDemoStep('Importando transacciones bancarias...');
      const sync = await api.post<{ created: number }>('/transactions/sync-mock', {});
      toast.info(sync.created + ' transacciones importadas');
      setDemoStep('Ejecutando conciliacion IA...');
      const rec = await api.post<{ matches_created: number; alerts_created: number }>(
        '/transactions/reconcile-all',
        {}
      );
      toast.success(
        'Demo completo: ' + rec.matches_created + ' matches · ' + rec.alerts_created + ' alertas'
      );
    } catch {
      toast.error('Error cargando demo');
    } finally {
      setDemoStep('');
      setDemoLoading(false);
      await load();
    }
  };

  if (loading) return <PageLoading />;

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

      {/* Recent Alerts */}
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
            <p className="text-sm text-slate-400">
              Sin alertas activas. El sistema esta limpio.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-600">
                      {ALERT_LABEL[a.alert_type] || a.alert_type}
                    </span>
                    {!a.is_read && (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <p className="text-sm text-slate-700">{a.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{fmt.rel(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
