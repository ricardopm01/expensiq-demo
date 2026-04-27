'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Wallet,
  Building,
  UserPlus,
  Upload,
  Download,
  X,
  UserX,
  UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { Card, KPICard, DataTable, EmptyState, TablePageSkeleton } from '@/components/ui';
import { useToast } from '@/components/toast';
import type { Employee } from '@/types';

// ── Constants ──────────────────────────────────────────────────────

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
  Obras: 'bg-orange-100 text-orange-700',
};

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Empleado' },
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Viewer' },
];

// ── Helpers ────────────────────────────────────────────────────────

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

const CSV_TEMPLATE =
  'name,email,department,role,monthly_budget,nif\nJuan García,juan.garcia@lezama.es,Obras,employee,2000,12345678A\n';

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_empleados.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Add Employee Modal ─────────────────────────────────────────────

interface AddEmployeeModalProps {
  onClose: () => void;
  onCreated: (employee: Employee) => void;
}

function AddEmployeeModal({ onClose, onCreated }: AddEmployeeModalProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    department: '',
    role: 'employee',
    monthly_budget: '',
    nif: '',
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Nombre y email son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        department: form.department.trim() || null,
        role: form.role,
        monthly_budget: form.monthly_budget ? parseFloat(form.monthly_budget) : null,
        nif: form.nif.trim() || null,
      };
      const created = await api.post<Employee>('/employees', payload);
      toast.success(`Empleado ${created.name} creado`);
      onCreated(created);
    } catch {
      toast.error('Error al crear el empleado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-white">Nuevo empleado</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Nombre completo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Juan García"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="juan.garcia@empresa.es"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Departamento</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => set('department', e.target.value)}
              placeholder="Obras"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Rol</label>
            <select
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Presupuesto mensual (€)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.monthly_budget}
              onChange={(e) => set('monthly_budget', e.target.value)}
              placeholder="Sin límite"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              NIF <span className="text-slate-500 font-normal">(para export SAP)</span>
            </label>
            <input
              type="text"
              value={form.nif}
              onChange={(e) => set('nif', e.target.value.toUpperCase())}
              placeholder="12345678A"
              maxLength={20}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {saving ? 'Guardando...' : 'Crear empleado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Deactivate Confirmation ────────────────────────────────────────

interface ConfirmDeactivateProps {
  employee: Employee;
  onClose: () => void;
  onConfirm: () => void;
}

function ConfirmDeactivate({ employee, onClose, onConfirm }: ConfirmDeactivateProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-red-500/10 rounded-full flex items-center justify-center flex-shrink-0">
            <UserX className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Desactivar empleado</p>
            <p className="text-xs text-slate-400 mt-1">
              ¿Seguro que quieres desactivar a{' '}
              <span className="font-medium text-slate-200">{employee.name}</span>? El empleado no
              podrá acceder al sistema.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            Desactivar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const router = useRouter();
  const toast = useToast();
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<Employee | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    api
      .get<Employee[]>('/employees')
      .then((e) => setEmployees(Array.isArray(e) ? e : []))
      .catch(() => toast.error('Error cargando empleados'))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) return <TablePageSkeleton />;

  // ── Handlers ────────────────────────────────────────────────────

  function handleCreated(employee: Employee) {
    setEmployees((prev) => [employee, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
    setShowAddModal(false);
  }

  async function handleToggleActive(employee: Employee) {
    const action = employee.is_active ? 'deactivate' : 'activate';
    setTogglingId(employee.id);
    try {
      const updated = await api.post<Employee>(`/employees/${employee.id}/${action}`);
      setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      toast.success(
        updated.is_active
          ? `${updated.name} activado`
          : `${updated.name} desactivado`
      );
    } catch {
      toast.error('Error al cambiar el estado del empleado');
    } finally {
      setTogglingId(null);
      setConfirmDeactivate(null);
    }
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be selected again
    e.target.value = '';

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await api.upload<{ created: number; skipped: number; errors: string[] }>(
        '/employees/bulk-import',
        formData
      );

      toast.success(
        `${result.created} empleado${result.created !== 1 ? 's' : ''} creado${result.created !== 1 ? 's' : ''}, ${result.skipped} omitido${result.skipped !== 1 ? 's' : ''}`
      );

      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} fila(s) con errores`);
      }

      // Refresh the employee list
      const updated = await api.get<Employee[]>('/employees');
      setEmployees(Array.isArray(updated) ? updated : []);
    } catch {
      toast.error('Error al importar el CSV');
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      {/* Modals */}
      {showAddModal && (
        <AddEmployeeModal onClose={() => setShowAddModal(false)} onCreated={handleCreated} />
      )}
      {confirmDeactivate && (
        <ConfirmDeactivate
          employee={confirmDeactivate}
          onClose={() => setConfirmDeactivate(null)}
          onConfirm={() => handleToggleActive(confirmDeactivate)}
        />
      )}

      {/* Hidden CSV input */}
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleCsvUpload}
      />

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
          {/* Card header with action buttons */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Directorio de Empleados</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {employees.length} empleados en el sistema
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Download template */}
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
                title="Descargar plantilla CSV"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar plantilla
              </button>

              {/* Import CSV */}
              <button
                onClick={() => csvInputRef.current?.click()}
                disabled={importing}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                {importing ? 'Importando...' : 'Importar CSV'}
              </button>

              {/* Add employee */}
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Añadir empleado
              </button>
            </div>
          </div>

          <DataTable
            headers={[
              'Empleado',
              'Departamento',
              'Rol',
              'Email',
              'Presupuesto Mensual',
              '',
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
            {employees.map((e) => {
              const inactive = e.is_active === false;
              return (
                <tr
                  key={e.id}
                  className={`border-t border-slate-50 ${inactive ? 'opacity-50' : 'row-hover cursor-pointer'}`}
                  onClick={inactive ? undefined : () => router.push(`/employees/${e.id}`)}
                >
                  {/* Empleado */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 ${avatarBg(e.name)} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                      >
                        {initials(e.name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-slate-800 hover:text-indigo-600 transition-colors">
                            {e.name}
                          </p>
                          {inactive && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-500">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{String(e.id).slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>

                  {/* Departamento */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        DEPT_BADGE[e.department || ''] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {e.department || '—'}
                    </span>
                  </td>

                  {/* Rol */}
                  <td className="px-4 py-3 text-sm text-slate-500">{e.role || '—'}</td>

                  {/* Email */}
                  <td className="px-4 py-3 text-sm text-slate-500">{e.email}</td>

                  {/* Presupuesto */}
                  <td className="px-4 py-3">
                    {e.monthly_budget ? (
                      <span className="text-sm font-semibold text-slate-800">
                        {fmt.money(e.monthly_budget)}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-300">Sin limite</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    {inactive ? (
                      <button
                        disabled={togglingId === e.id}
                        onClick={() => handleToggleActive(e)}
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-500 disabled:opacity-40 transition-colors"
                        title="Activar empleado"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Activar
                      </button>
                    ) : (
                      <button
                        disabled={togglingId === e.id}
                        onClick={() => setConfirmDeactivate(e)}
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                        title="Desactivar empleado"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </Card>
      </div>
    </>
  );
}
