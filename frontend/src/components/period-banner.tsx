'use client';

import { useEffect, useState } from 'react';
import { Calendar, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface PeriodStatus {
  can_submit: boolean;
  period_id: string;
  period_end: string;
  period_status: string;
}

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr);
  end.setHours(23, 59, 59);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

export function PeriodBanner() {
  const [status, setStatus] = useState<PeriodStatus | null>(null);

  useEffect(() => {
    api.get<PeriodStatus>('/periods/me/can-submit')
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return null;

  const days = daysUntil(status.period_end);
  const endFormatted = new Date(status.period_end).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long',
  });

  // Period closed
  if (!status.can_submit) {
    return (
      <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
        <Lock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-red-300 font-medium text-sm">Periodo cerrado</p>
          <p className="text-red-400/70 text-xs mt-0.5">
            El plazo de entrega finalizó el {endFormatted}.
            Si necesitas subir una factura fuera de plazo, contacta con la responsable financiera.
          </p>
        </div>
      </div>
    );
  }

  // Urgent — 0 or 1 days left
  if (days <= 1) {
    return (
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-amber-300 font-medium text-sm">
            {days === 0 ? '¡Hoy es el último día!' : 'Cierra mañana'}
          </p>
          <p className="text-amber-400/70 text-xs mt-0.5">
            El periodo cierra el {endFormatted} a las 00:00. Sube tus facturas antes de que cierre.
          </p>
        </div>
      </div>
    );
  }

  // Open — more than 1 day left
  return (
    <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4">
      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-emerald-300 font-medium text-sm">Periodo abierto</p>
        <p className="text-emerald-400/70 text-xs mt-0.5">
          Puedes subir facturas hasta el {endFormatted} ({days} días restantes).
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <Calendar className="w-4 h-4 text-emerald-400/50" />
      </div>
    </div>
  );
}
