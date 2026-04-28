'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CreditCard,
  Wallet,
  Zap,
  RefreshCw,
  Receipt,
  CheckCircle,
  AlertTriangle,
  Link2Off,
  HelpCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { Card, KPICard, Btn, DataTable, EmptyState, TablePageSkeleton } from '@/components/ui';
import { useToast } from '@/components/toast';
import { BankImportDropzone } from '@/components/bank-import-dropzone';
import type { Transaction } from '@/types';

interface ReconcileResult {
  receipts_processed: number;
  matches_created: number;
  alerts_created: number;
}

interface SyncResult {
  created: number;
  skipped: number;
}

type MatchFilter = 'all' | 'matched' | 'unmatched' | 'low_confidence';

function MatchBadge({ txn }: { txn: Transaction }) {
  if (txn.match_status === 'matched') {
    const pct = txn.match_confidence != null ? Math.round(txn.match_confidence * 100) : null;
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700"
        title={pct != null ? `Conciliada con ${pct}% de confianza` : 'Conciliada'}
      >
        <CheckCircle className="w-3 h-3" />
        Conciliada
        {pct != null && <span className="text-emerald-500 font-mono">{pct}%</span>}
      </span>
    );
  }
  if (txn.match_status === 'low_confidence') {
    const pct = txn.match_confidence != null ? Math.round(txn.match_confidence * 100) : null;
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700"
        title={pct != null ? `Posible match con ${pct}% de confianza (<60%)` : 'Baja confianza'}
      >
        <HelpCircle className="w-3 h-3" />
        Baja confianza
        {pct != null && <span className="text-amber-600 font-mono">{pct}%</span>}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600"
      title="Sin recibo asociado"
    >
      <Link2Off className="w-3 h-3" />
      Sin conciliar
    </span>
  );
}

export default function TransactionsPageWrapper() {
  return (
    <Suspense>
      <TransactionsPage />
    </Suspense>
  );
}

function TransactionsPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [lastResult, setLastResult] = useState<ReconcileResult | null>(null);
  const [filter, setFilter] = useState<MatchFilter>('all');

  useEffect(() => {
    const initial = searchParams?.get('filter');
    if (initial === 'unmatched' || initial === 'matched' || initial === 'low_confidence') {
      setFilter(initial);
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await api.get<Transaction[]>('/transactions');
      setTxns(Array.isArray(t) ? t : []);
    } catch {
      toast.error('Error cargando transacciones');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await api.post<SyncResult>('/transactions/sync-mock', {});
      toast.success(`${r.created} transacciones importadas (${r.skipped} omitidas)`);
      await load();
    } catch {
      toast.error('Error sincronizando banco');
    } finally {
      setSyncing(false);
    }
  };

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const r = await api.post<ReconcileResult>('/transactions/reconcile-all', {});
      setLastResult(r);
      toast.success(
        `Conciliacion: ${r.matches_created} matches · ${r.alerts_created} alertas`
      );
      await load();
    } catch {
      toast.error('Error en conciliacion');
    } finally {
      setReconciling(false);
    }
  };

  const counts = useMemo(() => {
    const c = { all: txns.length, matched: 0, unmatched: 0, low_confidence: 0 };
    for (const t of txns) {
      if (t.match_status === 'matched') c.matched++;
      else if (t.match_status === 'low_confidence') c.low_confidence++;
      else c.unmatched++;
    }
    return c;
  }, [txns]);

  const filteredTxns = useMemo(() => {
    if (filter === 'all') return txns;
    return txns.filter((t) => t.match_status === filter);
  }, [txns, filter]);

  const totalAmount = txns.reduce((s, t) => s + (t.amount || 0), 0);

  if (loading) return <TablePageSkeleton />;

  const tabs: { id: MatchFilter; label: string; count: number; tone: string }[] = [
    { id: 'all', label: 'Todas', count: counts.all, tone: 'slate' },
    { id: 'matched', label: 'Conciliadas', count: counts.matched, tone: 'emerald' },
    { id: 'unmatched', label: 'Sin conciliar', count: counts.unmatched, tone: 'amber' },
    { id: 'low_confidence', label: 'Baja confianza', count: counts.low_confidence, tone: 'amber' },
  ];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          label="Transacciones"
          value={txns.length}
          sub="importadas del banco"
          icon={<CreditCard className="w-5 h-5" />}
          accent="indigo"
        />
        <KPICard
          label="Volumen Total"
          value={fmt.money(totalAmount)}
          sub="en todas las cuentas"
          icon={<Wallet className="w-5 h-5" />}
          accent="emerald"
        />
        <KPICard
          label="Ultimo Resultado"
          value={lastResult ? `${lastResult.matches_created} matches` : '—'}
          sub={
            lastResult
              ? `${lastResult.alerts_created} alertas generadas`
              : 'Ejecuta conciliacion'
          }
          icon={<Zap className="w-5 h-5" />}
          accent="purple"
        />
      </div>

      {/* Bank Import Dropzone */}
      <BankImportDropzone onImportDone={load} />

      {/* Actions */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">
              Acciones Rapidas
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Sincroniza datos demo o ejecuta conciliacion automatica
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="secondary" size="sm" onClick={handleSync} loading={syncing}>
              <RefreshCw className="w-3.5 h-3.5" /> Demo Banco
            </Btn>
            <Btn size="sm" onClick={handleReconcile} loading={reconciling}>
              <Zap className="w-3.5 h-3.5" /> Conciliar Todo
            </Btn>
          </div>
        </div>
        {lastResult && (
          <div className="mt-3 flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">Ultimo resultado:</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
              <Receipt className="w-3 h-3" /> {lastResult.receipts_processed} recibos
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
              <CheckCircle className="w-3 h-3" /> {lastResult.matches_created} matches
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">
              <AlertTriangle className="w-3 h-3" /> {lastResult.alerts_created} alertas
            </span>
          </div>
        )}
      </Card>

      {/* Tabs filtro match_status */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                active
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {tab.label}
              <span
                className={`font-mono text-[11px] px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <DataTable
          headers={['Comercio', 'Fecha', 'Importe', 'Estado', 'Cuenta', 'ID Externo']}
          loading={loading}
          empty={
            filteredTxns.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="w-12 h-12" />}
                title={filter === 'all' ? 'Sin transacciones' : 'Sin resultados'}
                desc={
                  filter === 'all'
                    ? 'Importa un extracto bancario o usa "Demo Banco" para datos de prueba.'
                    : 'No hay transacciones con este filtro. Prueba otra pestaña.'
                }
              />
            ) : undefined
          }
        >
          {filteredTxns.map((t) => (
            <tr key={t.id} className="row-hover border-t border-slate-50">
              <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                {t.merchant || '—'}
              </td>
              <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                {fmt.date(t.date)}
              </td>
              <td className="px-4 py-3 text-sm font-bold text-slate-800">
                {fmt.money(t.amount, t.currency)}
              </td>
              <td className="px-4 py-3">
                <MatchBadge txn={t} />
              </td>
              <td className="px-4 py-3">
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  {t.account_id || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                {t.external_id || '—'}
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
