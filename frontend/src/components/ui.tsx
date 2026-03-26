'use client';

import { ReactNode } from 'react';
import { STATUS_CONFIG } from '@/types';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

// ── Status Badge ──────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide',
        c.bg,
        c.text
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', c.dot)} />
      {c.label}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────
export function Card({
  children,
  className = '',
  onClick,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-2xl border border-slate-200/80 shadow-sm',
        onClick && 'cursor-pointer',
        hover && 'transition-all hover:shadow-lg hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────
const ACCENT_STYLES: Record<string, { ring: string; icon: string }> = {
  indigo:  { ring: 'border-indigo-100',  icon: 'bg-indigo-50 text-indigo-500' },
  emerald: { ring: 'border-emerald-100', icon: 'bg-emerald-50 text-emerald-500' },
  amber:   { ring: 'border-amber-100',   icon: 'bg-amber-50 text-amber-500' },
  red:     { ring: 'border-red-100',     icon: 'bg-red-50 text-red-500' },
  purple:  { ring: 'border-purple-100',  icon: 'bg-purple-50 text-purple-500' },
};

export function KPICard({
  label,
  value,
  sub,
  icon,
  accent = 'indigo',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  accent?: string;
}) {
  const a = ACCENT_STYLES[accent] || ACCENT_STYLES.indigo;
  return (
    <Card hover className={clsx('p-5 border', a.ring)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-800 truncate">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div
          className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            a.icon
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ── Section Header ────────────────────────────────────────────────
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────
const VARIANT_STYLES: Record<string, string> = {
  primary:
    'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white shadow-sm shadow-indigo-200',
  secondary:
    'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700',
  danger: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200',
  ghost: 'text-slate-600 hover:bg-slate-100',
};

const SIZE_STYLES: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export function Btn({
  children,
  onClick,
  disabled,
  variant = 'primary',
  size = 'md',
  loading,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: string;
  size?: string;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center gap-2 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        SIZE_STYLES[size] || SIZE_STYLES.md,
        VARIANT_STYLES[variant] || VARIANT_STYLES.primary
      )}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

// ── Empty State ───────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 text-slate-300">{icon}</div>
      <p className="font-semibold text-slate-600 mb-1">{title}</p>
      <p className="text-sm text-slate-400 max-w-xs">{desc}</p>
    </div>
  );
}

// ── Skeleton Row ──────────────────────────────────────────────────
export function SkeletonRows({ cols = 5, rows = 5 }: { cols?: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-3.5 bg-slate-100 rounded-full animate-pulse"
                style={{ width: `${50 + ((j * 13 + i * 7) % 40)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Table ─────────────────────────────────────────────────────────
export function DataTable({
  headers,
  children,
  loading,
  empty,
}: {
  headers: string[];
  children: ReactNode;
  loading?: boolean;
  empty?: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-100">
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows cols={headers.length} />
          ) : empty ? (
            <tr>
              <td colSpan={headers.length}>{empty}</td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────
export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={clsx('animate-spin', className)} />;
}

// ── Page Loading ──────────────────────────────────────────────────
export function PageLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="w-8 h-8 text-indigo-500" />
    </div>
  );
}
