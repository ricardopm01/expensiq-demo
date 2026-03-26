'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Wallet, Building } from 'lucide-react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { Card, KPICard, DataTable, EmptyState, TablePageSkeleton } from '@/components/ui';
import { useToast } from '@/components/toast';
import type { Employee } from '@/types';

const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-purple-500',
];

const DEPT_BADGE: Record<string, string> = {
  Ventas: 'bg-blue-100 text-blue-700',
  Ingenieria: 'bg-indigo-100 text-indigo-700',
  'Ingeniería': 'bg-indigo-100 text-indigo-700',
  Marketing: 'bg-pink-100 text-pink-700',
  Operaciones: 'bg-amber-100 text-amber-700',
  Direccion: 'bg-purple-100 text-purple-700',
  'Dirección': 'bg-purple-100 text-purple-700',
  RRHH: 'bg-emerald-100 text-emerald-700',
  // Legacy English names
  Engineering: 'bg-indigo-100 text-indigo-700',
  Sales: 'bg-blue-100 text-blue-700',
  Finance: 'bg-emerald-100 text-emerald-700',
  Operations: 'bg-amber-100 text-amber-700',
};

function initials(name: string) {
  return name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';
}

function avatarBg(name: string) {
  return AVATAR_COLORS[(name ? name.charCodeAt(0) : 0) % AVATAR_COLORS.length];
}

export default function EmployeesPage() {
  const router = useRouter();
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Employee[]>('/employees')
      .then((e) => setEmployees(Array.isArray(e) ? e : []))
      .catch(() => toast.error('Error cargando empleados'))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          label="Total Empleados"
          value={employees.length}
          sub="usuarios registrados"
          icon={<Users className="w-5 h-5" />}
          accent="indigo"
        />
        <KPICard
          label="Con Presupuesto"
          value={employees.filter((e) => e.monthly_budget).length}
          sub="limite mensual configurado"
          icon={<Wallet className="w-5 h-5" />}
          accent="emerald"
        />
        <KPICard
          label="Departamentos"
          value={new Set(employees.map((e) => e.department).filter(Boolean)).size}
          sub="departamentos activos"
          icon={<Building className="w-5 h-5" />}
          accent="amber"
        />
      </div>

      {/* Table */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">
            Directorio de Empleados
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {employees.length} empleados en el sistema
          </p>
        </div>
        <DataTable
          headers={[
            'Empleado',
            'Departamento',
            'Rol',
            'Email',
            'Presupuesto Mensual',
          ]}
          loading={loading}
          empty={
            employees.length === 0 ? (
              <EmptyState
                icon={<Users className="w-12 h-12" />}
                title="Sin empleados"
                desc="Carga los datos de demo para ver los empleados."
              />
            ) : undefined
          }
        >
          {employees.map((e) => (
            <tr
              key={e.id}
              className="row-hover border-t border-slate-50 cursor-pointer"
              onClick={() => router.push(`/employees/${e.id}`)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 ${avatarBg(
                      e.name
                    )} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                  >
                    {initials(e.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 hover:text-indigo-600 transition-colors">
                      {e.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {String(e.id).slice(0, 8)}...
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    DEPT_BADGE[e.department || ''] || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {e.department || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-500">{e.role || '—'}</td>
              <td className="px-4 py-3 text-sm text-slate-500">{e.email}</td>
              <td className="px-4 py-3">
                {e.monthly_budget ? (
                  <span className="text-sm font-semibold text-slate-800">
                    {fmt.money(e.monthly_budget)}
                  </span>
                ) : (
                  <span className="text-sm text-slate-300">Sin limite</span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
