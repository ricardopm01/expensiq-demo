'use client';

import { usePathname } from 'next/navigation';
import { Shield } from 'lucide-react';
import { useRole } from '@/lib/role-context';
import { setApiRole } from '@/lib/api';
import { ROLE_LABELS } from '@/types';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/':             { title: 'Dashboard',     subtitle: 'Resumen y estado del sistema' },
  '/receipts':     { title: 'Recibos',       subtitle: 'Gestion y carga de tickets de gasto' },
  '/transactions': { title: 'Transacciones', subtitle: 'Integracion bancaria y conciliacion' },
  '/alerts':       { title: 'Alertas',       subtitle: 'Anomalias y excepciones detectadas por IA' },
  '/employees':    { title: 'Empleados',     subtitle: 'Directorio y presupuestos mensuales' },
  '/approvals':    { title: 'Aprobaciones',  subtitle: 'Workflow de aprobacion multinivel' },
};

export function Header() {
  const pathname = usePathname();
  const { role, setRole } = useRole();

  const meta =
    PAGE_META[pathname] ||
    (pathname.startsWith('/employees/') ? { title: 'Perfil Empleado', subtitle: 'Desglose de gastos por categoria' } : PAGE_META['/']);

  const handleRoleChange = (newRole: string) => {
    setRole(newRole as 'employee' | 'manager' | 'admin');
    setApiRole(newRole);
  };

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200/80 px-7 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold text-slate-800">{meta.title}</h1>
        <p className="text-xs text-slate-400">{meta.subtitle}</p>
      </div>
      <div className="flex items-center gap-4">
        {/* Role Selector */}
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1.5">
          <Shield className="w-3.5 h-3.5 text-indigo-500" />
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="text-xs font-semibold text-indigo-700 bg-transparent border-none outline-none cursor-pointer"
          >
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Sistema activo
        </div>
        <div className="text-xs text-slate-400 hidden lg:block">
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      </div>
    </header>
  );
}
