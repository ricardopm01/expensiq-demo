'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { Card, Btn, DataTable } from '@/components/ui';
import { useToast } from '@/components/toast';
import type { ImportPreviewResult, ImportResult } from '@/types';

type Stage = 'idle' | 'parsing' | 'preview' | 'importing' | 'result';

interface Props {
  onImportDone?: () => void;
}

export function BankImportDropzone({ onImportDone }: Props) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = async (f: File) => {
    const ext = f.name.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
      toast.error('Formato no soportado. Usa CSV o Excel (.xlsx)');
      return;
    }
    setFile(f);
    setStage('parsing');
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await api.upload<ImportPreviewResult>('/transactions/preview-import', fd);
      setPreview(res);
      setStage('preview');
      if (res.total === 0) {
        toast.error('No se encontraron transacciones en el archivo');
        reset();
      }
    } catch {
      toast.error('Error al parsear el archivo');
      reset();
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setStage('importing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('account_id', 'RURAL-KUTXA');
      const res = await api.upload<ImportResult>('/transactions/import-bank-extract', fd);
      setResult(res);
      setStage('result');
      toast.success(`${res.created} transacciones importadas (${res.skipped} duplicadas)`);
      onImportDone?.();
    } catch {
      toast.error('Error al importar transacciones');
      reset();
    }
  };

  const reset = () => {
    setStage('idle');
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Importar Extracto Bancario</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sube el CSV o Excel de Rural Kutxa / Ruralvia
          </p>
        </div>
        {stage !== 'idle' && (
          <button onClick={reset} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* IDLE — Drop zone */}
      {stage === 'idle' && (
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-indigo-500 bg-indigo-50/40'
              : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20'
          }`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">Arrastra tu extracto bancario aqui</p>
          <p className="text-xs text-slate-400 mt-1">CSV, Excel (.xlsx) &middot; Rural Kutxa / Ruralvia</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      )}

      {/* PARSING — Spinner */}
      {stage === 'parsing' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-slate-500">Analizando {file?.name}...</p>
        </div>
      )}

      {/* PREVIEW — Table with confirm */}
      {stage === 'preview' && preview && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-slate-700">
              {preview.total} transacciones encontradas
            </span>
            <span className="text-xs text-slate-400">
              ({file?.name})
            </span>
          </div>
          <div className="max-h-60 overflow-auto rounded-xl border border-slate-100">
            <DataTable headers={['Fecha', 'Concepto', 'Importe', 'Referencia']}>
              {preview.rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{r.date || '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-700 font-medium truncate max-w-[200px]">{r.merchant || '-'}</td>
                  <td className="px-3 py-2 text-xs font-bold text-slate-800">{r.amount != null ? fmt.money(r.amount) : '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-400 font-mono">{r.reference || '-'}</td>
                </tr>
              ))}
            </DataTable>
          </div>
          {preview.total > 50 && (
            <p className="text-xs text-slate-400 mt-1 text-center">
              Mostrando 50 de {preview.total} transacciones
            </p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" size="sm" onClick={reset}>Cancelar</Btn>
            <Btn size="sm" onClick={handleConfirmImport}>
              <CheckCircle className="w-3.5 h-3.5" /> Confirmar Importacion
            </Btn>
          </div>
        </div>
      )}

      {/* IMPORTING — Spinner */}
      {stage === 'importing' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-slate-500">Importando transacciones...</p>
        </div>
      )}

      {/* RESULT — Summary */}
      {stage === 'result' && result && (
        <div className="py-4">
          <div className="flex items-center gap-3 mb-3">
            {result.errors.length === 0 ? (
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            ) : (
              <XCircle className="w-6 h-6 text-amber-500" />
            )}
            <span className="text-sm font-semibold text-slate-700">Importacion completada</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              {result.created} nuevas
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              {result.skipped} duplicadas
            </span>
            {result.errors.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">
                {result.errors.length} errores
              </span>
            )}
          </div>
          <div className="mt-4">
            <Btn variant="secondary" size="sm" onClick={reset}>Importar otro extracto</Btn>
          </div>
        </div>
      )}
    </Card>
  );
}
