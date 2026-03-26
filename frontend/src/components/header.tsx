'use client';

import { usePathname } from 'next/navigation';
import { Shield, UserCircle, Menu } from 'lucide-react';
import { useRole } from '@/lib/role-context';
import { ROLE_LABELS } from '@/types';

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
  const { role, setRole, employeeId, setEmployeeId, employees } = useRole();

  const metaSource = role === 'employee' ? EMPLOYEE_META : PAGE_META;
  const meta =
    metaSource[pathname] ||
    PAGE_META[pathname] ||
    (pathname.startsWith('/employees/') ? { title: 'Perfil Empleado', subtitle: 'Desglose de gastos por categoria' } : PAGE_META['/']);

  const handleRoleChange = (newRole: string) => {
    setRole(newRole as 'employee' | 'manager' | 'admin');
  };

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
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 flex-wrap justify-end">
        {/* Employee Selector — only when role is employee */}
        {role === 'employee' && employees.length > 0 && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
            <UserCircle className="w-3.5 h-3.5 text-emerald-500" />
            <select
              value={employeeId || ''}
              onChange={(e) => setEmployeeId(e.target.value || null)}
              className="text-xs font-semibold text-emerald-700 bg-transparent border-none outline-none cursor-pointer max-w-[120px] sm:max-w-[150px]"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
        )}

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
