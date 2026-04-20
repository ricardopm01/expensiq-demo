'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Store,
  Wallet,
  Calendar,
  FolderOpen,
  Receipt as ReceiptIcon,
  Tag,
  User,
  Crosshair,
  Camera,
  Search,
  Landmark,
  CheckCircle,
  XCircle,
  Pencil,
  Save,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  FolderKanban,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { StatusBadge, Btn, Spinner } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useRole } from '@/lib/role-context';
import type { Receipt, ReceiptMatch, Employee, ApproveRejectResult, Project } from '@/types';
import { CATEGORY_LABEL, PAYMENT_METHOD_LABEL, APPROVAL_LEVEL_CONFIG } from '@/types';

interface Props {
  receipt: Receipt;
  empMap: Record<string, Employee>;
  onClose: () => void;
  onUpdate?: () => void;
}

const INPUT_CLS =
  'w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  card: CreditCard,
  cash: Banknote,
  transfer: ArrowRightLeft,
};

export function ReceiptDetailModal({ receipt, empMap, onClose, onUpdate }: Props) {
  const toast = useToast();
  const { role } = useRole();
  const [matches, setMatches] = useState<ReceiptMatch[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    merchant: receipt.merchant || '',
    amount: receipt.amount?.toString() || '',
    date: receipt.date || '',
    category: receipt.category,
    tax: receipt.tax?.toString() || '',
    tax_base: receipt.tax_base?.toString() || '',
    tax_rate: receipt.tax_rate?.toString() || '',
    tax_amount: receipt.tax_amount?.toString() || '',
    notes: receipt.notes || '',
    project_id: receipt.project_id || '',
  });

  useEffect(() => {
    Promise.all([
      api.get<ReceiptMatch[]>(`/receipts/${receipt.id}/matches`),
      api.get<Project[]>('/projects?active_only=true'),
    ])
      .then(([m, p]) => {
        setMatches(Array.isArray(m) ? m : []);
        setProjects(Array.isArray(p) ? p : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [receipt.id]);

  const emp = empMap[String(receipt.employee_id)];
  const match = matches[0];
  const isPending = ['pending', 'review', 'flagged'].includes(receipt.status);
  const level = receipt.approval_level || 'auto';
  const roleCanApprove = level === 'auto' || role === 'admin';

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch<Receipt>(`/receipts/${receipt.id}`, {
        merchant: editData.merchant || null,
        amount: editData.amount ? parseFloat(editData.amount) : null,
        date: editData.date || null,
        category: editData.category,
        tax: editData.tax ? parseFloat(editData.tax) : null,
        tax_base: editData.tax_base ? parseFloat(editData.tax_base) : null,
        tax_rate: editData.tax_rate ? parseFloat(editData.tax_rate) : null,
        tax_amount: editData.tax_amount ? parseFloat(editData.tax_amount) : null,
        notes: editData.notes || null,
        project_id: editData.project_id || null,
      });
      toast.success('Recibo actualizado');
      setEditing(false);
      onUpdate?.();
      onClose();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      const res = await api.post<ApproveRejectResult>(`/receipts/${receipt.id}/approve`);
      toast.success(res.message || 'Recibo aprobado');
      onUpdate?.();
      onClose();
    } catch {
      toast.error('Error al aprobar');
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('Motivo del rechazo (opcional):');
    try {
      const url = reason
        ? `/receipts/${receipt.id}/reject?reason=${encodeURIComponent(reason)}`
        : `/receipts/${receipt.id}/reject`;
      const res = await api.post<ApproveRejectResult>(url);
      toast.success(res.message || 'Recibo rechazado');
      onUpdate?.();
      onClose();
    } catch {
      toast.error('Error al rechazar');
    }
  };

  // Parse line items if available
  let lineItems: { description: string; amount: number }[] = [];
  if (receipt.line_items) {
    try {
      lineItems = JSON.parse(receipt.line_items);
    } catch { /* ignore */ }
  }

  const PayIcon = receipt.payment_method ? PAYMENT_ICONS[receipt.payment_method] : null;

  const fields = [
    { label: 'Comercio', value: receipt.merchant, Icon: Store, editKey: 'merchant' as const, type: 'text' },
    {
      label: 'Importe',
      value: receipt.amount != null ? fmt.money(receipt.amount, receipt.currency) : '—',
      Icon: Wallet,
      editKey: 'amount' as const,
      type: 'number',
    },
    { label: 'Fecha', value: fmt.date(receipt.date), Icon: Calendar, editKey: 'date' as const, type: 'date' },
    {
      label: 'Categoria',
      value: CATEGORY_LABEL[receipt.category] || receipt.category,
      Icon: FolderOpen,
      editKey: 'category' as const,
      type: 'select',
    },
    { label: 'IVA', value: receipt.tax ? fmt.money(receipt.tax) : '—', Icon: ReceiptIcon, editKey: 'tax' as const, type: 'number' },
    { label: 'Estado', value: null, Icon: Tag, isStatus: true },
    { label: 'Empleado', value: emp ? emp.name : '—', Icon: User },
    {
      label: 'Confianza OCR',
      value: receipt.ocr_confidence != null ? fmt.pct(receipt.ocr_confidence) : '—',
      Icon: Crosshair,
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Detalle del Recibo</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ID: {String(receipt.id).slice(0, 8)}...
              </p>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="ml-2 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <Pencil className="w-3 h-3" /> Editar
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Image */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Imagen del Recibo
            </h3>
            {receipt.image_url ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receipt.image_url.startsWith('/static/') ? receipt.image_url : `/api/v1/receipts/${receipt.id}/image`}
                  alt="Recibo"
                  className="w-full h-auto max-h-72 object-contain"
                />
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50">
                <Camera className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-400 mt-2">Sin imagen adjunta</p>
              </div>
            )}

            {/* Payment Method */}
            {receipt.payment_method && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                {PayIcon && <PayIcon className="w-4 h-4 text-slate-500" />}
                <span className="text-xs text-slate-400">Metodo de pago:</span>
                <span className="text-sm font-medium text-slate-700">
                  {PAYMENT_METHOD_LABEL[receipt.payment_method] || receipt.payment_method}
                </span>
              </div>
            )}
          </div>

          {/* OCR Data */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Datos Extraidos (OCR)
            </h3>
            <div className="space-y-3">
              {fields.map(({ label, value, Icon, isStatus, editKey, type }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl"
                >
                  <Icon className="w-[18px] h-[18px] text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-400">{label}</span>
                    {isStatus ? (
                      <div className="mt-0.5">
                        <StatusBadge status={receipt.status} />
                      </div>
                    ) : editing && editKey ? (
                      type === 'select' ? (
                        <select
                          value={editData[editKey]}
                          onChange={(e) => setEditData((d) => ({ ...d, [editKey]: e.target.value }))}
                          className={INPUT_CLS + ' mt-0.5'}
                        >
                          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={type}
                          step={type === 'number' ? '0.01' : undefined}
                          value={editData[editKey]}
                          onChange={(e) => setEditData((d) => ({ ...d, [editKey]: e.target.value }))}
                          className={INPUT_CLS + ' mt-0.5'}
                        />
                      )
                    ) : (
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {value}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Notes (edit mode) */}
              {editing && (
                <div className="px-3 py-2 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-400">Notas</span>
                  <textarea
                    value={editData.notes}
                    onChange={(e) => setEditData((d) => ({ ...d, notes: e.target.value }))}
                    rows={2}
                    className={INPUT_CLS + ' mt-0.5'}
                  />
                </div>
              )}

              {/* Obra field */}
              <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl">
                <FolderKanban className="w-[18px] h-[18px] text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-slate-400">Obra</span>
                  {editing ? (
                    <select
                      value={editData.project_id}
                      onChange={(e) => setEditData((d) => ({ ...d, project_id: e.target.value }))}
                      className={INPUT_CLS + ' mt-0.5'}
                    >
                      <option value="">Sin obra</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} — {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm font-medium text-slate-700">
                      {receipt.project_code
                        ? <span className="font-mono text-indigo-700">{receipt.project_code}</span>
                        : <span className="text-slate-400">—</span>}
                      {receipt.project_name && (
                        <span className="ml-1.5 text-slate-500 font-normal">{receipt.project_name}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* IVA breakdown */}
            {(receipt.tax_base != null || receipt.tax_rate != null || receipt.tax_amount != null || editing) && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Desglose IVA
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="px-4 py-2 text-slate-500 text-xs">Base imponible</td>
                        <td className="px-4 py-2 text-right font-medium text-slate-800">
                          {editing ? (
                            <input
                              type="number" step="0.01" placeholder="0.00"
                              value={editData.tax_base}
                              onChange={(e) => setEditData((d) => ({ ...d, tax_base: e.target.value }))}
                              className="w-28 border border-slate-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          ) : (
                            receipt.tax_base != null ? fmt.money(receipt.tax_base, receipt.currency) : '—'
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="px-4 py-2 text-slate-500 text-xs">
                          IVA {receipt.tax_rate != null ? `(${receipt.tax_rate}%)` : ''}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-slate-800">
                          {editing ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number" step="0.01" placeholder="21"
                                value={editData.tax_rate}
                                onChange={(e) => setEditData((d) => ({ ...d, tax_rate: e.target.value }))}
                                className="w-16 border border-slate-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                              <span className="text-slate-400">%</span>
                              <input
                                type="number" step="0.01" placeholder="0.00"
                                value={editData.tax_amount}
                                onChange={(e) => setEditData((d) => ({ ...d, tax_amount: e.target.value }))}
                                className="w-28 border border-slate-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                            </div>
                          ) : (
                            receipt.tax_amount != null ? fmt.money(receipt.tax_amount, receipt.currency) : '—'
                          )}
                        </td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="px-4 py-2 text-slate-600 text-xs font-semibold">Total</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-800">
                          {receipt.amount != null ? fmt.money(receipt.amount, receipt.currency) : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Approval Info */}
            {receipt.approval_level && (
              <div className="px-3 py-2 bg-slate-50 rounded-xl space-y-1.5">
                <span className="text-xs text-slate-400">Nivel de aprobacion</span>
                <div>
                  {(() => {
                    const lc = APPROVAL_LEVEL_CONFIG[receipt.approval_level] || APPROVAL_LEVEL_CONFIG.auto;
                    return (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${lc.bg} ${lc.text}`}
                        title={receipt.approval_reason || lc.label}
                      >
                        {lc.label}
                      </span>
                    );
                  })()}
                </div>
                {receipt.approval_reason && isPending && (
                  <p className="text-xs text-slate-500">{receipt.approval_reason}</p>
                )}
                {receipt.approved_at && (
                  <p className="text-xs text-emerald-600">
                    {receipt.approver_name
                      ? `Aprobado por ${receipt.approver_name} el ${fmt.date(receipt.approved_at)}`
                      : `Aprobado automaticamente el ${fmt.date(receipt.approved_at)}`}
                  </p>
                )}
                {isPending && !roleCanApprove && (
                  <p className="text-xs text-amber-600">
                    Tu rol actual no tiene permiso para aprobar este nivel
                  </p>
                )}
              </div>
            )}

            {/* Save button (edit mode) */}
            {editing && (
              <div className="flex gap-2 mt-3">
                <Btn variant="primary" size="sm" onClick={handleSave} loading={saving}>
                  <Save className="w-3.5 h-3.5" /> Guardar
                </Btn>
                <Btn variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancelar
                </Btn>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        {lineItems.length > 0 && (
          <div className="px-5 pb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Detalle de Lineas
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Descripcion</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} className="border-t border-slate-50">
                      <td className="px-4 py-2 text-slate-700">{item.description}</td>
                      <td className="px-4 py-2 text-right font-medium text-slate-800">
                        {fmt.money(item.amount, receipt.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bank Match */}
        <div className="px-5 pb-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Conciliacion Bancaria
          </h3>
          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner className="w-5 h-5 text-indigo-500" />
            </div>
          ) : match ? (
            <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                  Match encontrado
                </span>
                <span className="text-xs text-emerald-600">
                  Confianza: {match.confidence != null ? fmt.pct(match.confidence) : '—'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                    <ReceiptIcon className="w-3.5 h-3.5" /> Recibo dice:
                  </p>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-slate-400">Comercio:</span>{' '}
                      <span className="font-medium">{receipt.merchant || '—'}</span>
                    </p>
                    <p>
                      <span className="text-slate-400">Importe:</span>{' '}
                      <span className="font-medium">
                        {fmt.money(receipt.amount, receipt.currency)}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Fecha:</span>{' '}
                      <span className="font-medium">{fmt.date(receipt.date)}</span>
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5" /> Banco dice:
                  </p>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-slate-400">Comercio:</span>{' '}
                      <span className="font-medium">
                        {match.transaction_merchant || '—'}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Importe:</span>{' '}
                      <span className="font-medium">
                        {fmt.money(match.transaction_amount, match.transaction_currency)}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Fecha:</span>{' '}
                      <span className="font-medium">
                        {fmt.date(match.transaction_date)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-amber-200 bg-amber-50 rounded-xl p-4 text-center">
              <Search className="w-7 h-7 text-amber-500 mx-auto" />
              <p className="text-sm text-amber-700 mt-1">Sin match bancario</p>
              <p className="text-xs text-amber-500 mt-0.5">
                Ejecuta la conciliacion para buscar transacciones coincidentes
              </p>
            </div>
          )}
        </div>

        {/* Approve / Reject Footer */}
        {isPending && !editing && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
            {roleCanApprove ? (
              <>
                <Btn variant="danger" size="sm" onClick={handleReject}>
                  <XCircle className="w-4 h-4" /> Rechazar
                </Btn>
                <Btn variant="primary" size="sm" onClick={handleApprove}>
                  <CheckCircle className="w-4 h-4" /> Aprobar
                </Btn>
              </>
            ) : (
              <span className="text-xs text-amber-600">
                Necesitas rol de Administrador para aprobar
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
