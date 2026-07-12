'use client';

import { useEffect, useState } from 'react';
import { levelsApi, type Level } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';

interface LevelForm {
  name: string;
  minPoints: number;
  maxPoints: number;
  order: number;
  description: string;
  badgeUrl: string;
  isActive: boolean;
}

const EMPTY: LevelForm = {
  name: '',
  minPoints: 0,
  maxPoints: 0,
  order: 0,
  description: '',
  badgeUrl: '',
  isActive: true,
};

export default function LevelsPage() {
  const [levels, setLevels]       = useState<Level[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Level | null>(null);
  const [form, setForm]           = useState<LevelForm>(EMPTY);

  const load = async () => {
    setLoading(true);
    const res = await levelsApi.list();
    setLevels(res?.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setShowModal(true);
  };

  const openEdit = (level: Level) => {
    setEditing(level);
    setForm({
      name:        level.name,
      minPoints:   level.minPoints,
      maxPoints:   level.maxPoints,
      order:       level.order,
      description: level.description ?? '',
      badgeUrl:    level.badgeUrl ?? '',
      isActive:    level.isActive,
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (form.minPoints > form.maxPoints) { setError('Min points must be ≤ max points'); return; }

    setSaving(true);
    setError('');
    try {
      if (editing) {
        await levelsApi.update(editing.id, {
          name:        form.name,
          minPoints:   form.minPoints,
          maxPoints:   form.maxPoints,
          order:       form.order,
          description: form.description || undefined,
          badgeUrl:    form.badgeUrl || undefined,
          isActive:    form.isActive,
        });
      } else {
        await levelsApi.create({
          name:        form.name,
          minPoints:   form.minPoints,
          maxPoints:   form.maxPoints,
          order:       form.order,
          description: form.description || undefined,
          badgeUrl:    form.badgeUrl || undefined,
        } as any);
      }
      setShowModal(false);
      load();
    } catch {
      setError('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this level?')) return;
    await levelsApi.remove(id);
    load();
  };

  const field = (k: keyof LevelForm, v: string | number | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Levels</h1>
          <p className="text-gray-400 text-sm mt-1">{levels.length} level{levels.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Level
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {levels.length === 0 ? (
          <div className="py-16 text-center text-gray-500">No levels yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                  <th className="text-left px-4 py-3">Order</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Min XP</th>
                  <th className="text-left px-4 py-3">Max XP</th>
                  <th className="text-left px-4 py-3">Badge</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {levels.map(lv => (
                  <tr key={lv.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-gray-400">{lv.order}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{lv.name}</div>
                      {lv.description && (
                        <div className="text-xs text-gray-500 mt-0.5">{lv.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{lv.minPoints.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-300">{lv.maxPoints.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {lv.badgeUrl ? (
                        <img src={lv.badgeUrl} alt={lv.name} className="w-8 h-8 object-contain rounded" />
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                        ${lv.isActive
                          ? 'bg-green-900/40 text-green-400 border border-green-800'
                          : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                        {lv.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(lv)}
                          className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-900/20 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(lv.id)}
                          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && <Modal onClose={() => setShowModal(false)} title={editing ? 'Edit Level' : 'New Level'}>
        <div className="space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Name *</label>
              <input
                className="input w-full"
                value={form.name}
                onChange={e => field('name', e.target.value)}
                placeholder="Bronze"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Min XP *</label>
              <input
                className="input w-full"
                type="number"
                value={form.minPoints}
                onChange={e => field('minPoints', +e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max XP *</label>
              <input
                className="input w-full"
                type="number"
                value={form.maxPoints}
                onChange={e => field('maxPoints', +e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Order</label>
              <input
                className="input w-full"
                type="number"
                value={form.order}
                onChange={e => field('order', +e.target.value)}
              />
            </div>
            {editing && (
              <div className="flex items-center gap-2 mt-5">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => field('isActive', e.target.checked)}
                  className="w-4 h-4 accent-primary-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-300">Active</label>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Badge URL</label>
              <input
                className="input w-full"
                value={form.badgeUrl}
                onChange={e => field('badgeUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <textarea
                className="input w-full resize-none"
                rows={2}
                value={form.description}
                onChange={e => field('description', e.target.value)}
                placeholder="Starter level for new players"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Level'}
            </button>
          </div>
        </div>
      </Modal>}
    </div>
  );
}
