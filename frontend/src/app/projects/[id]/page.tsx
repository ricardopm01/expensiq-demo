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
  ArrowLeft,
  FolderKanban,
  Wallet,
  CheckCircle,
  Clock,
  BarChart3,
  Receipt as ReceiptIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import {
  Card,
  KPICard,
  SectionHeader,
  Btn,
  StatusBadge,
  DashboardSkeleton,
  EmptyState,
} from '@/components/ui';
import { ReceiptDetailModal } from '@/components/receipt-detail-modal';
import { useToast } from '@/components/toast';
import type { ProjectDetail, Receipt } from '@/types';
import { CATEGORY_LABEL, CATEGORY_COLOR } from '@/types';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;

  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    api.get<ProjectDetail>(`/analytics/projects/${id}`)
      .then(setDetail)
      .catch(() => toast.error('Error cargando detalle de obra'))
      .finally(() => setLoadingDetail(false));

    api.get<Receipt[]>(`/receipts?project_id=${id}&limit=100`)
      .then(setReceipts)
      .catch(() => setReceipts([]))
      .finally(() => setLoadingReceipts(false));
  }, [id, toast]);

  if (loadingDetail) return <DashboardSkeleton />;

  if (!detail) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<FolderKanban className="w-8 h-8 text-slate-300" />}
          title="Obra no encontrada"
          desc="Esta obra no existe o fue eliminada."
        />
      </div>
    );
  }

  const pct = detail.utilization_pct;
  const budgetBarColor =
    pct == null ? 'bg-indigo-400'
    : pct >= 100 ? 'bg-red-500'
    : pct >= 80  ? 'bg-orange-400'
    : 'bg-emerald-500';

  const donutData = detail.category_breakdown.map(c => ({
    name: CATEGORY_LABEL[c.category] ?? c.category,
    value: c.total_amount,
    color: CATEGORY_COLOR[c.category] ?? '#94A3B8',
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.push('/projects')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors mt-0.5 flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
              {detail.code}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">{detail.name}</h1>
          {detail.description && (
            <p className="text-sm text-slate-500 mt-0.5">{detail.description}</p>
          )}
        </div>
      </div>

      {/* Budget bar (only if budget set) */}
      {detail.budget != null && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Ejecución presupuestaria</span>
            <span className={`text-sm font-bold ${
              pct != null && pct >= 100 ? 'text-red-600'
              : pct != null && pct >= 80  ? 'text-orange-500'
              : 'text-emerald-600'
            }`}>
              {pct != null ? `${pct}%` : '—'}
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${budgetBarColor}`}
              style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-slate-400">
            <span>Gastado: <span className="font-medium text-slate-600">{fmt.money(detail.total_spending)}</span></span>
            <span>Presupuesto: <span className="font-medium text-slate-600">{fmt.money(detail.budget)}</span></span>
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard
          label="Gasto total"
          value={fmt.money(detail.total_spending)}
          icon={<Wallet className="w-5 h-5" />}
          accent="indigo"
        />
        <KPICard
          label="Recibos"
          value={detail.receipt_count}
          icon={<BarChart3 className="w-5 h-5" />}
          accent="purple"
        />
        <KPICard
          label="Aprobados"
          value={detail.approved_count}
          icon={<CheckCircle className="w-5 h-5" />}
          accent="emerald"
        />
        <KPICard
          label="Pendientes"
          value={detail.pending_count}
          icon={<Clock className="w-5 h-5" />}
          accent={detail.pending_count > 0 ? 'amber' : 'indigo'}
        />
      </div>

      {/* Category donut + breakdown */}
      {donutData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-5">
            <SectionHeader title="Gasto por categoría" subtitle="" />
            <div className="flex items-center gap-6 mt-2">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={64}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => fmt.money(Number(v))}
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {donutData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600">{d.name}</span>
                    </div>
                    <span className="font-medium text-slate-800">{fmt.money(detail.category_breakdown[i].total_amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Desglose" subtitle={`${detail.receipt_count} recibos`} />
            <div className="mt-2 space-y-2">
              {detail.category_breakdown.map((c) => {
                const share = detail.total_spending > 0
                  ? Math.round((c.total_amount / detail.total_spending) * 100)
                  : 0;
                const color = CATEGORY_COLOR[c.category] ?? '#94A3B8';
                return (
                  <div key={c.category}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-600">{CATEGORY_LABEL[c.category] ?? c.category}</span>
                      <span className="text-slate-400">{fmt.money(c.total_amount)} · {c.receipt_count} rec.</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${share}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Receipts table */}
      <Card>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Recibos de esta obra</span>
          </div>
          <Btn size="sm" variant="ghost" onClick={() => router.push(`/receipts?project_id=${id}`)}>
            Ver en recibos
          </Btn>
        </div>
        {loadingReceipts ? (
          <div className="p-6 text-center text-sm text-slate-400">Cargando...</div>
        ) : receipts.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<ReceiptIcon className="w-6 h-6 text-slate-300" />}
              title="Sin recibos"
              desc="No hay recibos asignados a esta obra."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Comercio</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Empleado</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Importe</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {receipts.map(r => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                    onClick={() => setSelectedReceipt(r)}
                  >
                    <td className="px-4 py-3 text-slate-500">{fmt.date(r.date)}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{r.merchant ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.employee_name ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{fmt.money(r.amount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedReceipt && (
        <ReceiptDetailModal
          receipt={selectedReceipt}
          empMap={{}}
          onClose={() => setSelectedReceipt(null)}
          onUpdate={() => {
            setSelectedReceipt(null);
            api.get<Receipt[]>(`/receipts?project_id=${id}&limit=100`)
              .then(setReceipts)
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
