'use client';

import { useEffect, useState, useCallback } from 'react';
import { Settings as SettingsIcon, Save, AlertCircle, Info, Zap, UserCog, Crown } from 'lucide-react';
import { api } from '@/lib/api';
import { useRole } from '@/lib/role-context';
import { useToast } from '@/components/toast';
import { Card, SectionHeader, Btn, TablePageSkeleton, EmptyState } from '@/components/ui';

interface ApprovalThresholds {
  threshold_auto: number;
  threshold_manager: number;
  auto_enabled: boolean;
}

export default function SettingsPage() {
  const { role } = useRole();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState<ApprovalThresholds | null>(null);
  const [form, setForm] = useState<ApprovalThresholds>({
    threshold_auto: 100,
    threshold_manager: 500,
    auto_enabled: true,
  });

  const load = useCallback(async () => {
    try {
      const t = await api.get<ApprovalThresholds>('/settings/approval-thresholds');
      setForm(t);
      setInitial(t);
    } catch {
      toast.error('Error cargando configuracion');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const dirty =
    initial !== null &&
    (form.threshold_auto !== initial.threshold_auto ||
      form.threshold_manager !== initial.threshold_manager ||
      form.auto_enabled !== initial.auto_enabled);

  const invalid = form.threshold_auto >= form.threshold_manager;

  const save = async () => {
    if (invalid) {
      toast.error('El umbral Auto debe ser menor que el umbral Manager');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.put<ApprovalThresholds>('/settings/approval-thresholds', form);
      setInitial(updated);
      setForm(updated);
      toast.success('Umbrales actualizados');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (role !== 'admin') {
    return (
      <Card className="p-8">
        <EmptyState
          icon={<SettingsIcon className="w-12 h-12" />}
          title="Acceso restringido"
          desc="Solo el rol Administrador puede modificar la configuracion."
        />
      </Card>
    );
  }

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-5">
        <SectionHeader
          title="Umbrales de aprobacion"
          subtitle="Define los importes que separan auto-aprobacion, manager y director"
        />

        <div className="space-y-5 mt-4">
          {/* Auto enabled */}
          <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-emerald-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Auto-aprobacion activada</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Si se desactiva, ningun recibo se aprueba automaticamente y todos entran en la cola.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.auto_enabled}
                onChange={(e) => setForm({ ...form, auto_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Thresholds */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UserCog className="w-4 h-4 text-indigo-500" />
                Umbral Auto &rarr; Manager
              </div>
              <p className="text-xs text-slate-500">
                Recibos con importe menor al umbral se aprueban automaticamente.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Menos de</span>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={form.threshold_auto}
                  onChange={(e) => setForm({ ...form, threshold_auto: Number(e.target.value) })}
                  className="w-28 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <span className="text-sm text-slate-500">€ &rarr; Auto</span>
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Crown className="w-4 h-4 text-amber-500" />
                Umbral Manager &rarr; Director
              </div>
              <p className="text-xs text-slate-500">
                Recibos con importe mayor o igual al umbral requieren aprobacion de director.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Desde</span>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={form.threshold_manager}
                  onChange={(e) => setForm({ ...form, threshold_manager: Number(e.target.value) })}
                  className="w-28 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <span className="text-sm text-slate-500">€ &rarr; Director</span>
              </div>
            </div>
          </div>

          {/* Summary of effect */}
          <div className="flex items-start gap-2 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-700">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              Con la configuracion actual:
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>Menos de <strong>{form.threshold_auto}€</strong> &rarr; auto-aprobado</li>
                <li>
                  Entre <strong>{form.threshold_auto}€</strong> y <strong>{form.threshold_manager}€</strong> &rarr; requiere manager
                </li>
                <li>Desde <strong>{form.threshold_manager}€</strong> &rarr; requiere director</li>
              </ul>
            </div>
          </div>

          {invalid && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                El umbral Auto ({form.threshold_auto}€) debe ser menor que el umbral Manager ({form.threshold_manager}€).
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Btn
              variant="primary"
              size="sm"
              onClick={save}
              loading={saving}
              disabled={!dirty || invalid}
            >
              <Save className="w-3.5 h-3.5" /> Guardar cambios
            </Btn>
            {dirty && (
              <button
                onClick={() => initial && setForm(initial)}
                className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1.5"
              >
                Descartar
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
