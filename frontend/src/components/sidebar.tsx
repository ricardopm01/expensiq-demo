'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Receipt,
  CreditCard,
  Bell,
  Users,
  CheckSquare,
  Zap,
  User,
  UserCircle,
  Shield,
  X,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';
import { useRole } from '@/lib/role-context';
import { ROLE_LABELS } from '@/types';

const ADMIN_NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/receipts', label: 'Recibos', icon: Receipt },
  { href: '/transactions', label: 'Transacciones', icon: CreditCard },
  { href: '/alerts', label: 'Alertas', icon: Bell },
  { href: '/approvals', label: 'Aprobaciones', icon: CheckSquare },
  { href: '/employees', label: 'Empleados', icon: Users },
];

const EMPLOYEE_NAV = [
  { href: '/', label: 'Mi Panel', icon: LayoutGrid },
  { href: '/receipts', label: 'Mis Recibos', icon: Receipt },
  { href: '/profile', label: 'Mi Perfil', icon: User },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { role, setRole, employeeId, setEmployeeId, employees } = useRole();

  const navItems = role === 'employee' ? EMPLOYEE_NAV : ADMIN_NAV;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 w-60 bg-slate-900 flex flex-col z-50 transition-transform duration-300 ease-in-out',
          'md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo + Close */}
        <div className="px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              ExpensIQ
            </span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-2 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-indigo-500/15 text-indigo-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Role & identity selector — bottom */}
        <div className="px-3 pb-3 space-y-2 border-t border-slate-800 pt-3">
          {/* Employee picker (only when role=employee) */}
          {role === 'employee' && employees.length > 0 && (
            <div className="relative">
              <UserCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400 pointer-events-none" />
              <select
                value={employeeId || ''}
                onChange={(e) => setEmployeeId(e.target.value || null)}
                className="w-full text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg pl-7 pr-6 py-2 appearance-none cursor-pointer hover:bg-emerald-500/15 transition-colors outline-none"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id} className="bg-slate-900 text-slate-200">{emp.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-400 pointer-events-none" />
            </div>
          )}

          {/* Role selector */}
          <div className="relative">
            <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400 pointer-events-none" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'employee' | 'admin')}
              className="w-full text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg pl-7 pr-6 py-2 appearance-none cursor-pointer hover:bg-indigo-500/15 transition-colors outline-none"
            >
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k} className="bg-slate-900 text-slate-200">{v}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-400 pointer-events-none" />
          </div>

          <p className="text-[10px] text-slate-600 uppercase tracking-widest text-center pt-1">
            ExpensIQ Demo v3.0
          </p>
        </div>
      </aside>
    </>
  );
}
