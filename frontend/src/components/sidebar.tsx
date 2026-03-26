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
} from 'lucide-react';
import clsx from 'clsx';
import { useRole } from '@/lib/role-context';

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

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useRole();

  const navItems = role === 'employee' ? EMPLOYEE_NAV : ADMIN_NAV;

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-slate-900 flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">
          ExpensIQ
        </span>
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

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-800">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
          ExpensIQ Demo v2.0
        </p>
      </div>
    </aside>
  );
}
