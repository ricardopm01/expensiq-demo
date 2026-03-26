'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Copy,
  ShieldAlert,
  Receipt,
  Zap,
  CheckCircle,
  BrainCircuit,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { Card, Btn, EmptyState, PageLoading } from '@/components/ui';
import { useToast } from '@/components/toast';
import type { Alert } from '@/types';
import { ALERT_LABEL, SEVERITY_CONFIG } from '@/types';

const ALERT_ICONS: Record<string, typeof AlertTriangle> = {
  no_match: AlertTriangle,
  duplicate: Copy,
  policy_violation: ShieldAlert,
  no_receipt: Receipt,
  rapid_repeat: Zap,
};

const SEVERITY: Record<
  string,
  { card: string; badge: string }
> = {
  policy_violation: {
    card: 'border-red-200 bg-red-50',
    badge: 'bg-red-100 text-red-700',
  },
  no_match: {
    card: 'border-amber-200 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
  },
  duplicate: {
    card: 'border-orange-200 bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
  },
  no_receipt: {
    card: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
  },
  rapid_repeat: {
    card: 'border-purple-200 bg-purple-50',
    badge: 'bg-purple-100 text-purple-700',
  },
};

export default function AlertsPage() {
  const toast = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const a = await api.get<Alert[]>(
        filter === 'active' ? '/alerts?resolved=false' : '/alerts'
      );
      setAlerts(Array.isArray(a) ? a : []);
    } catch {
      toast.error('Error cargando alertas');
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const resolve = async (id: string) => {
    try {
      await api.patch(`/alerts/${id}/resolve`, {});
      toast.success('Alerta resuelta');
      await load();
    } catch {
      toast.error('Error');
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/alerts/${id}/read`, {});
      await load();
    } catch {
      // silent
    }
  };

  const [scanning, setScanning] = useState(false);

  const runAIScan = async () => {
    setScanning(true);
    try {
      const res = await api.post<{ alerts_created: number }>('/alerts/ai-scan');
      toast.success(`AI Scan completado: ${res.alerts_created} alertas creadas`);
      await load();
    } catch {
      toast.error('Error en AI Scan (verifica ANTHROPIC_API_KEY)');
    } finally {
      setScanning(false);
    }
  };

  const counts: Record<string, number> = {};
  alerts.forEach((a) => {
    counts[a.alert_type] = (counts[a.alert_type] || 0) + 1;
  });

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(counts).map(([type, n]) => (
            <Card key={type} className="p-4">
              <p className="text-2xl font-black text-slate-800">{n}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {ALERT_LABEL[type] || type}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">
              Sistema de Alertas
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Anomalias y excepciones detectadas por IA
            </p>
          </div>
          <div className="flex gap-2">
            <Btn
              variant="primary"
              size="sm"
              onClick={runAIScan}
              loading={scanning}
            >
              <BrainCircuit className="w-3.5 h-3.5" /> AI Scan
            </Btn>
            {(['active', 'all'] as const).map((id) => (
              <Btn
                key={id}
                variant={filter === id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilter(id)}
              >
                {id === 'active' ? 'Activas' : 'Todas'}
              </Btn>
            ))}
          </div>
        </div>
      </Card>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<CheckCircle className="w-12 h-12" />}
            title="Sin alertas"
            desc={
              filter === 'active'
                ? 'No hay alertas activas. Todo en orden.'
                : 'No hay alertas registradas.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => {
            const cfg = SEVERITY[a.alert_type] || {
              card: 'border-slate-200 bg-slate-50',
              badge: 'bg-slate-100 text-slate-600',
            };
            const IconComp = ALERT_ICONS[a.alert_type] || AlertTriangle;
            return (
              <Card key={a.id} className={`p-4 border ${cfg.card}`}>
                <div className="flex items-start gap-3">
                  <IconComp className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.badge}`}
                      >
                        {ALERT_LABEL[a.alert_type] || a.alert_type}
                      </span>
                      {a.severity && SEVERITY_CONFIG[a.severity] && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${SEVERITY_CONFIG[a.severity].bg} ${SEVERITY_CONFIG[a.severity].text}`}
                        >
                          {SEVERITY_CONFIG[a.severity].label}
                        </span>
                      )}
                      {!a.is_read && (
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                      {a.resolved && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                          Resuelta
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                      {a.description}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {fmt.rel(a.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!a.is_read && !a.resolved && (
                      <Btn variant="ghost" size="sm" onClick={() => markRead(a.id)}>
                        Leida
                      </Btn>
                    )}
                    {!a.resolved && (
                      <Btn
                        variant="secondary"
                        size="sm"
                        onClick={() => resolve(a.id)}
                      >
                        Resolver
                      </Btn>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
