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
  LogOut,
  X,
  Calendar,
  FolderKanban,
  Settings as SettingsIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { signOut } from 'next-auth/react';
import { useRole } from '@/lib/role-context';
import { ROLE_LABELS } from '@/types';

const ADMIN_NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/receipts', label: 'Recibos', icon: Receipt },
  { href: '/transactions', label: 'Transacciones', icon: CreditCard },
  { href: '/alerts', label: 'Alertas', icon: Bell },
  { href: '/approvals', label: 'Aprobaciones', icon: CheckSquare },
  { href: '/employees', label: 'Empleados', icon: Users },
  { href: '/periods', label: 'Quincenas', icon: Calendar },
  { href: '/projects', label: 'Obras', icon: FolderKanban },
  { href: '/settings', label: 'Ajustes', icon: SettingsIcon },
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
  const { role, employeeName } = useRole();

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

        {/* User info + logout — bottom */}
        <div className="px-3 pb-3 border-t border-slate-800 pt-3">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 truncate">{employeeName ?? '—'}</p>
              <p className="text-[10px] text-slate-500">{ROLE_LABELS[role] ?? role}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Cerrar sesión"
              className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
