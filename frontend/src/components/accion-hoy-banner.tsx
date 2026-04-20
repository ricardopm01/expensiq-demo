'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  Link2Off,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, SkeletonBlock } from '@/components/ui';
import type { ActionToday } from '@/types';

type Tone = 'indigo' | 'amber' | 'purple' | 'red';

const TONE_STYLES: Record<Tone, { ring: string; icon: string; badge: string }> = {
  indigo: {
    ring: 'border-indigo-200 hover:border-indigo-300',
    icon: 'bg-indigo-50 text-indigo-500',
    badge: 'text-indigo-600',
  },
  amber: {
    ring: 'border-amber-200 hover:border-amber-300',
    icon: 'bg-amber-50 text-amber-500',
    badge: 'text-amber-600',
  },
  purple: {
    ring: 'border-purple-200 hover:border-purple-300',
    icon: 'bg-purple-50 text-purple-500',
    badge: 'text-purple-600',
  },
  red: {
    ring: 'border-red-200 hover:border-red-300',
    icon: 'bg-red-50 text-red-500',
    badge: 'text-red-600',
  },
};

function Tile({
  label,
  count,
  icon,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  tone: Tone;
  onClick: () => void;
}) {
  const styles = TONE_STYLES[tone];
  const isZero = count === 0;
  return (
    <button
      onClick={onClick}
      className={`text-left w-full bg-white rounded-2xl border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 p-4 ${
        isZero ? 'border-slate-200 hover:border-slate-300' : styles.ring
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isZero ? 'bg-emerald-50 text-emerald-500' : styles.icon
          }`}
        >
          {isZero ? <CheckCircle2 className="w-5 h-5" /> : icon}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-2xl font-bold leading-tight ${
              isZero ? 'text-slate-400' : 'text-slate-800'
            }`}
          >
            {count}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{label}</p>
        </div>
        <ArrowRight
          className={`w-4 h-4 flex-shrink-0 mt-1 ${
            isZero ? 'text-slate-300' : 'text-slate-400'
          }`}
        />
      </div>
    </button>
  );
}

export function AccionHoyBanner() {
  const router = useRouter();
  const [data, setData] = useState<ActionToday | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ActionToday>('/analytics/action-today')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
      </div>
    );
  }

  if (!data) return null;

  const showPeriodTile = data.period_id != null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Acción Hoy
        </p>
      </div>
      <div
        className={`grid grid-cols-2 ${
          showPeriodTile ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        } gap-3`}
      >
        <Tile
          label="recibos por aprobar"
          count={data.receipts_pending_approval}
          icon={<ClipboardCheck className="w-5 h-5" />}
          tone="indigo"
          onClick={() => router.push('/approvals')}
        />
        <Tile
          label="transacciones sin recibo"
          count={data.transactions_unmatched}
          icon={<Link2Off className="w-5 h-5" />}
          tone="amber"
          onClick={() => router.push('/transactions?filter=unmatched')}
        />
        {showPeriodTile && (
          <Tile
            label={`empleados ${data.period_pending_label}`}
            count={data.period_pending_employees}
            icon={<Users className="w-5 h-5" />}
            tone="purple"
            onClick={() => router.push('/periods')}
          />
        )}
        <Tile
          label="alertas urgentes"
          count={data.alerts_urgent}
          icon={<AlertTriangle className="w-5 h-5" />}
          tone="red"
          onClick={() => router.push('/alerts?severity=high')}
        />
      </div>
    </Card>
  );
}
