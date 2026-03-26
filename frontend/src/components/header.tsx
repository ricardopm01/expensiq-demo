'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useRole } from '@/lib/role-context';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/':             { title: 'Dashboard',     subtitle: 'Resumen y estado del sistema' },
  '/receipts':     { title: 'Recibos',       subtitle: 'Gestion y carga de tickets de gasto' },
  '/transactions': { title: 'Transacciones', subtitle: 'Integracion bancaria y conciliacion' },
  '/alerts':       { title: 'Alertas',       subtitle: 'Anomalias y excepciones detectadas por IA' },
  '/employees':    { title: 'Empleados',     subtitle: 'Directorio y presupuestos mensuales' },
  '/approvals':    { title: 'Aprobaciones',  subtitle: 'Workflow de aprobacion multinivel' },
  '/profile':      { title: 'Mi Perfil',     subtitle: 'Tu resumen de gastos y presupuesto' },
};

const EMPLOYEE_META: Record<string, { title: string; subtitle: string }> = {
  '/':         { title: 'Mi Panel',    subtitle: 'Tu resumen personal de gastos' },
  '/receipts': { title: 'Mis Recibos', subtitle: 'Tus tickets y gastos registrados' },
  '/profile':  { title: 'Mi Perfil',   subtitle: 'Tu resumen de gastos y presupuesto' },
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { role } = useRole();

  const metaSource = role === 'employee' ? EMPLOYEE_META : PAGE_META;
  const meta =
    metaSource[pathname] ||
    PAGE_META[pathname] ||
    (pathname.startsWith('/employees/') ? { title: 'Perfil Empleado', subtitle: 'Desglose de gastos por categoria' } : PAGE_META['/']);

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200/80 px-4 py-3 md:px-7 md:py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden text-slate-500 hover:text-slate-800 transition-colors -ml-1"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-800 truncate">{meta.title}</h1>
          <p className="text-xs text-slate-400 truncate hidden sm:block">{meta.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
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
