'use client';

import { useEffect, useState, useCallback } from 'react';
import { FolderKanban, Plus, PencilLine, PowerOff, Power, X, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useRole } from '@/lib/role-context';
import { useToast } from '@/components/toast';
import { Card, SectionHeader, Btn, TablePageSkeleton, EmptyState } from '@/components/ui';
import type { Project } from '@/types';

export default function ProjectsPage() {
  const { role } = useRole();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Project[]>('/projects');
      setProjects(data);
    } catch {
      toast.error('Error cargando obras');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const isAdmin = role === 'admin';

  const openCreate = () => {
    setEditingId(null);
    setForm({ code: '', name: '', description: '' });
    setShowForm(true);
  };

  const openEdit = (p: Project) => {
    setEditingId(p.id);
    setForm({ code: p.code, name: p.name, description: p.description ?? '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Código y nombre son obligatorios');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/projects/${editingId}`, {
          name: form.name.trim(),
          description: form.description.trim() || null,
        });
        toast.success('Obra actualizada');
      } else {
        await api.post('/projects', {
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
        });
        toast.success('Obra creada');
      }
      setShowForm(false);
      setEditingId(null);
      load();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Error guardando obra';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Project) => {
    try {
      await api.patch(`/projects/${p.id}`, { active: !p.active });
      toast.success(p.active ? 'Obra desactivada' : 'Obra reactivada');
      load();
    } catch {
      toast.error('Error actualizando obra');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<FolderKanban className="w-8 h-8 text-slate-400" />}
          title="Acceso restringido"
          desc="Solo administradores pueden gestionar obras."
        />
      </div>
    );
  }

  if (loading) return <TablePageSkeleton />;

  const active = projects.filter(p => p.active);
  const inactive = projects.filter(p => !p.active);

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="Obras / Proyectos"
        subtitle={`${active.length} activas · ${inactive.length} inactivas`}
        action={
          <Btn onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nueva obra
          </Btn>
        }
      />

      {showForm && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <div className="p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">
              {editingId ? 'Editar obra' : 'Nueva obra'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Código *</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white disabled:bg-slate-50"
                  placeholder="p.ej. OBR-2026-001"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  disabled={!!editingId}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nombre *</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  placeholder="Demolición Bilbao Centro"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Descripción</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  placeholder="Opcional"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Btn size="sm" onClick={handleSave} disabled={saving}>
                <Check className="w-4 h-4 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Btn>
            </div>
          </div>
        </Card>
      )}

      <Card>
        {projects.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<FolderKanban className="w-8 h-8 text-slate-300" />}
              title="Sin obras"
              desc="Crea la primera obra para asignar gastos."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Código</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Nombre</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Descripción</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {projects.map(p => (
                  <tr key={p.id} className={`hover:bg-slate-50/60 transition-colors ${!p.active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-700 font-medium">{p.code}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500">{p.description ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {p.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Editar"
                        >
                          <PencilLine className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(p)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            p.active
                              ? 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                              : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'
                          }`}
                          title={p.active ? 'Desactivar' : 'Reactivar'}
                        >
                          {p.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
