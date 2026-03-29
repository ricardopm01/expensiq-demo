'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Upload, Filter, X, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import {
  Card,
  SectionHeader,
  StatusBadge,
  DataTable,
  EmptyState,
  Spinner,
} from '@/components/ui';
import { ReceiptDetailModal } from '@/components/receipt-detail-modal';
import { useToast } from '@/components/toast';
import { useRole } from '@/lib/role-context';
import { PeriodBanner } from '@/components/period-banner';
import type { Receipt, Employee } from '@/types';
import { CATEGORY_LABEL } from '@/types';

const INPUT_CLS =
  'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';

export default function ReceiptsPageWrapper() {
  return (
    <Suspense>
      <ReceiptsPage />
    </Suspense>
  );
}

function ReceiptsPage() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const { role, employeeId: currentEmployeeId } = useRole();
  const isEmployee = role === 'employee';
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empMap, setEmpMap] = useState<Record<string, Employee>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get('status') || 'all');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState({ employee_id: '', merchant: '', amount: '' });
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Advanced filters
  const [filterEmployee, setFilterEmployee] = useState(searchParams.get('employee_id') || '');
  const [filterCategory, setFilterCategory] = useState(searchParams.get('category') || '');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // Auto-set employee filter when in employee role
  useEffect(() => {
    if (isEmployee && currentEmployeeId) {
      setFilterEmployee(currentEmployeeId);
      setForm((f) => ({ ...f, employee_id: currentEmployeeId }));
    }
  }, [isEmployee, currentEmployeeId]);

  const buildQuery = useCallback(() => {
    let q = '/receipts?limit=200';
    if (filter !== 'all') q += '&status=' + filter;
    if (filterEmployee) q += '&employee_id=' + filterEmployee;
    if (filterCategory) q += '&category=' + filterCategory;
    if (filterDateFrom) q += '&date_from=' + filterDateFrom;
    if (filterDateTo) q += '&date_to=' + filterDateTo;
    if (filterSearch) q += '&search=' + encodeURIComponent(filterSearch);
    return q;
  }, [filter, filterEmployee, filterCategory, filterDateFrom, filterDateTo, filterSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, e] = await Promise.all([
        api.get<Receipt[]>(buildQuery()),
        api.get<Employee[]>('/employees'),
      ]);
      const recs = Array.isArray(r) ? r : [];
      const emps = Array.isArray(e) ? e : [];
      setReceipts(recs);
      setEmployees(emps);
      const map: Record<string, Employee> = {};
      emps.forEach((emp) => {
        map[String(emp.id)] = emp;
      });
      setEmpMap(map);
      if (emps.length > 0 && !form.employee_id) {
        setForm((f) => ({ ...f, employee_id: emps[0].id }));
      }
    } catch {
      toast.error('Error cargando recibos');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, toast, form.employee_id]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, filterEmployee, filterCategory, filterDateFrom, filterDateTo, filterSearch]);

  const handleUpload = async (file: File) => {
    if (!form.employee_id) {
      toast.error('Selecciona un empleado primero');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('employee_id', form.employee_id);
      if (form.merchant) fd.append('merchant', form.merchant);
      if (form.amount) fd.append('amount', form.amount);
      await api.upload('/receipts/upload', fd);
      toast.success('Recibo subido — OCR procesando en segundo plano');
      setForm((f) => ({ ...f, merchant: '', amount: '' }));
      if (fileRef.current) fileRef.current.value = '';
      setTimeout(load, 2000);
    } catch {
      toast.error('Error al subir recibo');
    } finally {
      setUploading(false);
    }
  };

  const clearFilters = () => {
    setFilterEmployee('');
    setFilterCategory('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterSearch('');
  };

  const hasActiveFilters =
    filterEmployee || filterCategory || filterDateFrom || filterDateTo || filterSearch;
  const totalAmount = receipts.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Period status banner — employees only */}
      {isEmployee && <PeriodBanner />}

      {/* Upload */}
      <Card className="p-5">
        <SectionHeader
          title="Subir Recibo"
          subtitle="Sube una imagen o PDF para extraer datos automaticamente con OCR"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {!isEmployee && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Empleado *
            </label>
            <select
              value={form.employee_id}
              onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
              className={INPUT_CLS}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Comercio (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Amazon, Uber..."
              value={form.merchant}
              onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Importe (opcional)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className={INPUT_CLS}
            />
          </div>
        </div>
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-indigo-500 bg-indigo-50/30'
              : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
          }`}
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleUpload(f);
          }}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Spinner className="w-7 h-7 text-indigo-500" />
              <p className="text-sm text-slate-500 font-medium">
                Subiendo y procesando OCR...
              </p>
            </div>
          ) : (
            <div>
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">
                Arrastra tu recibo aqui
              </p>
              <p className="text-xs text-slate-400 mt-1">
                o haz clic para seleccionar · JPG, PNG, PDF · max 10MB
              </p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
        </div>
      </Card>

      {/* Excel Template — Employee view */}
      {isEmployee && <ExcelTemplateSection employeeId={currentEmployeeId} onImport={load} />}

      {/* Advanced Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowFilters((p) => !p)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
          >
            <Filter className="w-4 h-4 text-slate-500" />
            Filtros Avanzados
            <span
              className={`text-slate-400 transition-transform text-xs ${
                showFilters ? 'rotate-180' : ''
              }`}
            >
              ▾
            </span>
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
            >
              <X className="w-3 h-3" /> Limpiar filtros
            </button>
          )}
        </div>
        {showFilters && (
          <div className={`grid grid-cols-2 ${isEmployee ? 'md:grid-cols-4' : 'md:grid-cols-5'} gap-3`}>
            {!isEmployee && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Empleado</label>
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">Todos</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            )}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Categoria</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">Todas</option>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Desde</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Hasta</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Buscar comercio</label>
              <input
                type="text"
                placeholder="Ej: Uber..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Receipts Table */}
      <Card>
        {/* Status Tabs */}
        <div className="flex items-center border-b border-slate-100 px-5 gap-1 overflow-x-auto">
          {(['all', 'pending', 'matched', 'review', 'flagged'] as const).map((id) => {
            const labels: Record<string, string> = {
              all: 'Todos',
              pending: 'Pendiente',
              matched: 'Conciliado',
              review: 'Revisar',
              flagged: 'Marcado',
            };
            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  filter === id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                {labels[id]}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-3 flex-shrink-0 py-3 pr-1">
            {receipts.length > 0 && (
              <span className="text-xs text-slate-400">
                {receipts.length} recibos · Total:{' '}
                <span className="font-semibold text-slate-700">{fmt.money(totalAmount)}</span>
              </span>
            )}
            <button
              onClick={() => {
                const q = buildQuery().replace('/receipts?', '');
                window.open(`/api/v1/receipts/export/csv?${q}`, '_blank');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>
        </div>

        <DataTable
          headers={[
            'Comercio',
            ...(isEmployee ? [] : ['Empleado']),
            'Fecha',
            'Importe',
            'Categoria',
            'Estado',
            'Confianza OCR',
          ]}
          loading={loading}
          empty={
            receipts.length === 0 ? (
              <EmptyState
                icon={<Upload className="w-12 h-12" />}
                title="Sin recibos"
                desc={
                  hasActiveFilters
                    ? 'No hay recibos que coincidan con los filtros.'
                    : filter === 'all'
                    ? 'Sube tu primer recibo arriba.'
                    : 'No hay recibos con este estado.'
                }
              />
            ) : undefined
          }
        >
          {receipts.map((r) => {
            const emp = empMap[String(r.employee_id)];
            return (
              <tr
                key={r.id}
                className="row-hover border-t border-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedReceipt(r)}
              >
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">
                    {r.merchant || (
                      <span className="text-slate-400 font-normal italic">Procesando...</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.currency || 'EUR'}</p>
                </td>
                {!isEmployee && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {emp ? emp.name[0] : '?'}
                    </div>
                    <span className="text-sm text-slate-600 truncate max-w-[120px]">
                      {emp ? emp.name : '—'}
                    </span>
                  </div>
                </td>
                )}
                <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                  {fmt.date(r.date || r.upload_timestamp)}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-bold text-slate-800">
                    {r.amount != null ? fmt.money(r.amount, r.currency) : '—'}
                  </p>
                  {r.tax != null && r.tax > 0 && (
                    <p className="text-xs text-slate-400">IVA: {fmt.money(r.tax)}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                    {CATEGORY_LABEL[r.category] || r.category || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3">
                  {r.ocr_confidence != null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: fmt.pct(r.ocr_confidence),
                            background:
                              r.ocr_confidence > 0.8
                                ? '#10B981'
                                : r.ocr_confidence > 0.5
                                ? '#F59E0B'
                                : '#EF4444',
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {fmt.pct(r.ocr_confidence)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </DataTable>
      </Card>

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <ReceiptDetailModal
          receipt={selectedReceipt}
          empMap={empMap}
          onClose={() => setSelectedReceipt(null)}
          onUpdate={load}
        />
      )}
    </div>
  );
}

/* ── Excel Template Section (Employee only) ──────────────────────── */

function ExcelTemplateSection({ employeeId, onImport }: { employeeId: string | null; onImport: () => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleDownloadTemplate = () => {
    window.open('/api/v1/receipts/template/expense-excel', '_blank');
  };

  const handleImportExcel = async (file: File) => {
    if (!employeeId) {
      toast.error('No hay empleado seleccionado');
      return;
    }
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('employee_id', employeeId);
      const res = await api.upload<{ created: number; errors: string[] }>('/receipts/import-expense-excel', fd);
      toast.success(`${res.created} gastos importados desde Excel`);
      if (res.errors.length > 0) {
        toast.error(res.errors[0]);
      }
      onImport();
    } catch {
      toast.error('Error al importar Excel');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Plantilla Excel de Gastos</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Descarga la plantilla, rellenala con tus gastos y subela
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Descargar Plantilla
          </button>
          <button
            onClick={() => !importing && fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-50"
          >
            {importing ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importando...</>
            ) : (
              <><Upload className="w-3.5 h-3.5" /> Importar Excel</>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportExcel(f);
            }}
          />
        </div>
      </div>
    </Card>
  );
}
