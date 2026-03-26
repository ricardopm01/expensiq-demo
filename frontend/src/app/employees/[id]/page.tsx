'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Wallet,
  CheckCircle,
  Clock,
  BarChart3,
  ArrowLeft,
  FolderOpen,
  User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import {
  Card,
  KPICard,
  SectionHeader,
  Btn,
  StatusBadge,
  EmptyState,
  DashboardSkeleton,
} from '@/components/ui';
import { ReceiptDetailModal } from '@/components/receipt-detail-modal';
import { useToast } from '@/components/toast';
import type { EmployeeDetail, Receipt } from '@/types';
import { CATEGORY_LABEL, CATEGORY_COLOR } from '@/types';

const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-purple-500',
];

function initials(name: string) {
  return name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';
}

function avatarBg(name: string) {
  return AVATAR_COLORS[(name ? name.charCodeAt(0) : 0) % AVATAR_COLORS.length];
}

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api
      .get<EmployeeDetail>(`/employees/${params.id}`)
      .then((e) => setEmployee(e))
      .catch(() => toast.error('Error cargando perfil'))
      .finally(() => setLoading(false));
  }, [params.id, toast]);

  const toggleCategory = (cat: string) =>
    setExpanded((p) => ({ ...p, [cat]: !p[cat] }));

  if (loading) return <DashboardSkeleton />;

  if (!employee)
    return (
      <EmptyState
        icon={<User className="w-12 h-12" />}
        title="Empleado no encontrado"
        desc="No se pudo cargar el perfil del empleado."
      />
    );

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

  return (
    <div className="space-y-5">
      <Btn variant="ghost" size="sm" onClick={() => router.push('/employees')}>
        <ArrowLeft className="w-4 h-4" /> Volver a Empleados
      </Btn>

      {/* Employee Header */}
      <Card className="p-6">
        <div className="flex items-start gap-5">
          <div
            className={`w-16 h-16 ${avatarBg(
              employee.name
            )} rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}
          >
            {initials(employee.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-800">{employee.name}</h2>
            <p className="text-sm text-slate-500">{employee.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {employee.department && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700">
                  {employee.department}
                </span>
              )}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                {employee.role}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Gasto Total"
          value={fmt.money(employee.total_spending)}
          sub={`${employee.receipt_count} recibos`}
          icon={<Wallet className="w-5 h-5" />}
          accent="indigo"
        />
        <KPICard
          label="Conciliados"
          value={employee.matched_count || 0}
          sub="recibos verificados"
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
          value={
            employee.monthly_budget ? fmt.money(employee.monthly_budget) : 'Sin limite'
          }
          sub={employee.monthly_budget ? `${budgetPct}% utilizado` : '—'}
          icon={<BarChart3 className="w-5 h-5" />}
          accent={budgetOver ? 'red' : 'purple'}
        />
      </div>

      {/* Budget Bar */}
      {employee.monthly_budget != null && employee.monthly_budget > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">
              Uso del Presupuesto
            </span>
            <span
              className={`text-sm font-bold ${
                budgetOver ? 'text-red-600' : 'text-indigo-600'
              }`}
            >
              {budgetPct}%
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                budgetOver
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
              }`}
              style={{ width: `${Math.min(100, budgetPct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-slate-400">
              {fmt.money(employee.total_spending)} gastado
            </span>
            <span className="text-xs text-slate-400">
              {fmt.money(employee.monthly_budget)} limite
            </span>
          </div>
        </Card>
      )}

      {/* Category Donut */}
      {donutData.length > 0 && (
        <Card className="p-5">
          <SectionHeader
            title="Distribucion por Categoria"
            subtitle="Proporcion de gasto por tipo"
          />
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
                        router.push(
                          `/receipts?employee_id=${employee.id}&category=${d.category}`
                        );
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
                  {fmt.money(employee.total_spending)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {donutData.map((d) => {
                const pct =
                  employee.total_spending > 0
                    ? (d.value / employee.total_spending) * 100
                    : 0;
                return (
                  <div key={d.name} className="space-y-0.5">
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
                        className="h-full rounded-full"
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
        </Card>
      )}

      {/* Category Breakdown Accordion */}
      <SectionHeader
        title="Desglose por Categoria"
        subtitle={`${employee.category_breakdown.length} categorias con gastos`}
      />
      {employee.category_breakdown.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<FolderOpen className="w-12 h-12" />}
            title="Sin gastos"
            desc="Este empleado no tiene recibos registrados."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {employee.category_breakdown.map((cat) => {
            const isOpen = expanded[cat.category];
            const color = CATEGORY_COLOR[cat.category] || '#94A3B8';
            return (
              <Card key={cat.category} className="overflow-hidden">
                <button
                  onClick={() => toggleCategory(cat.category)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {CATEGORY_LABEL[cat.category] || cat.category}
                    </p>
                    <p className="text-xs text-slate-400">
                      {cat.receipt_count} recibo
                      {cat.receipt_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    {fmt.money(cat.total_amount)}
                  </span>
                  <span
                    className={`text-slate-400 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    ▾
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50/80">
                          {['Comercio', 'Fecha', 'Importe', 'Estado', 'OCR'].map(
                            (h) => (
                              <th
                                key={h}
                                className="text-left px-4 py-2 text-xs font-semibold text-slate-400 uppercase"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {cat.receipts.map((r) => (
                          <tr
                            key={r.id}
                            className="row-hover border-t border-slate-50 cursor-pointer"
                            onClick={() => {
                              api
                                .get<Receipt>(`/receipts/${r.id}`)
                                .then((full) => setSelectedReceipt(full))
                                .catch(() =>
                                  toast.error('Error cargando recibo')
                                );
                            }}
                          >
                            <td className="px-4 py-2.5 text-sm font-medium text-slate-700">
                              {r.merchant || (
                                <span className="text-slate-400 italic">
                                  Sin datos
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-slate-500">
                              {fmt.date(r.date)}
                            </td>
                            <td className="px-4 py-2.5 text-sm font-bold text-slate-800">
                              {r.amount != null
                                ? fmt.money(r.amount, r.currency)
                                : '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <StatusBadge status={r.status} />
                            </td>
                            <td className="px-4 py-2.5">
                              {r.ocr_confidence != null ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: fmt.pct(r.ocr_confidence),
                                        background:
                                          r.ocr_confidence > 0.8
                                            ? '#10B981'
                                            : r.ocr_confidence > 0.5
                                            ? '#F59E0B'
                                            : '#EF4444',
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-500">
                                    {fmt.pct(r.ocr_confidence)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <ReceiptDetailModal
          receipt={selectedReceipt}
          empMap={{ [String(employee.id)]: employee }}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
