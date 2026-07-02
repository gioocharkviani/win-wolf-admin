'use client';

import { useEffect, useState, useCallback } from 'react';
import { platformApi, gamesApi, categoryDefsApi, type Game, type CategoryDef } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';

const COLOR_OPTIONS = [
  'bg-purple-600', 'bg-red-600', 'bg-blue-600', 'bg-yellow-600',
  'bg-emerald-600', 'bg-orange-600', 'bg-pink-600', 'bg-cyan-600',
  'bg-rose-600', 'bg-indigo-600', 'bg-teal-600', 'bg-gray-600',
];

export default function CategoriesPage() {
  const [categories, setCategories]   = useState<CategoryDef[]>([]);
  const [overview, setOverview]       = useState<Record<string, number>>({});
  const [loading, setLoading]         = useState(true);

  // browse category games
  const [activeCat, setActiveCat]     = useState<CategoryDef | null>(null);
  const [catGames, setCatGames]       = useState<Game[]>([]);
  const [catLoading, setCatLoading]   = useState(false);
  const [catTotal, setCatTotal]       = useState(0);
  const [catPage, setCatPage]         = useState(1);
  const CAT_LIMIT = 20;

  // add game to category
  const [addModal, setAddModal]       = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [searching, setSearching]     = useState(false);
  const [adding, setAdding]           = useState<number | null>(null);

  // create / delete category
  const [createModal, setCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryDef | null>(null);
  const [newKey, setNewKey]           = useState('');
  const [newLabel, setNewLabel]       = useState('');
  const [newColor, setNewColor]       = useState('bg-gray-600');
  const [newOrder, setNewOrder]       = useState('99');
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [formError, setFormError]     = useState('');

  const loadAll = async () => {
    setLoading(true);
    const [catRes, ovRes] = await Promise.all([
      categoryDefsApi.list(),
      platformApi.categoryOverview(),
    ]);
    setCategories(catRes?.data ?? []);
    setOverview(ovRes?.data ?? {});
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const loadCatGames = useCallback(async () => {
    if (!activeCat) return;
    setCatLoading(true);
    const res = await gamesApi.list({ category: activeCat.key, page: catPage, limit: CAT_LIMIT });
    setCatGames(res?.data ?? []);
    setCatTotal(res?.total ?? 0);
    setCatLoading(false);
  }, [activeCat, catPage]);

  useEffect(() => { loadCatGames(); }, [loadCatGames]);

  const handleRemoveGame = async (gameId: number) => {
    if (!activeCat) return;
    await gamesApi.removeCategory(gameId, activeCat.key);
    loadCatGames();
    loadAll();
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    setSearching(true);
    const res = await gamesApi.list({ search: searchInput.trim(), limit: 30 });
    setSearchResults(res?.data ?? []);
    setSearching(false);
  };

  const handleAddGame = async (gameId: number) => {
    if (!activeCat) return;
    setAdding(gameId);
    await gamesApi.addCategory(gameId, activeCat.key);
    setAdding(null);
    loadCatGames();
    loadAll();
    setSearchResults(r => r.filter(g => g.id !== gameId));
  };

  const handleCreate = async () => {
    setFormError('');
    if (!newKey.trim() || !newLabel.trim()) {
      setFormError('Key and Label are required.');
      return;
    }
    setSaving(true);
    const res = await categoryDefsApi.create({
      key: newKey.trim(),
      label: newLabel.trim(),
      color: newColor,
      sortOrder: parseInt(newOrder) || 99,
    });
    setSaving(false);
    if ((res as any)?.code === 409 || (res as any)?.message?.includes('already')) {
      setFormError((res as any).message ?? 'Key already exists');
      return;
    }
    setCreateModal(false);
    setNewKey(''); setNewLabel(''); setNewColor('bg-gray-600'); setNewOrder('99');
    loadAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await categoryDefsApi.remove(deleteTarget.key);
    setDeleting(false);
    if ((res as any)?.code === 409) {
      alert((res as any).message);
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    if (activeCat?.key === deleteTarget.key) setActiveCat(null);
    loadAll();
  };

  const catTotalPages = Math.ceil(catTotal / CAT_LIMIT);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Landing Page Categories</h1>
          <p className="section-sub">Manage which games appear in each category section</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAll} className="btn-outline text-sm">Refresh</button>
          <button onClick={() => { setCreateModal(true); setFormError(''); }} className="btn-primary text-sm">+ New Category</button>
        </div>
      </div>

      {loading ? <PageSpinner /> : (
        <>
          {/* ── Category overview grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {categories.map(cat => (
              <div
                key={cat.key}
                className={`card text-left transition-all hover:border-gray-600 cursor-pointer relative group ${
                  activeCat?.key === cat.key ? 'border-primary-500 bg-primary-900/10' : ''
                }`}
                onClick={() => { setActiveCat(cat); setCatPage(1); }}
              >
                {/* delete button */}
                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(cat); }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all text-xs font-bold"
                  title="Delete category"
                >
                  ✕
                </button>

                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${cat.color} mb-2`}>
                  <span className="text-white text-xs font-bold">
                    {cat.label.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="text-sm font-semibold text-white">{cat.label}</div>
                <div className="text-xs font-mono text-gray-500 mb-1">{cat.key}</div>
                <div className="text-2xl font-bold text-gray-200">{overview[cat.key] ?? 0}</div>
                <div className="text-xs text-gray-500">games</div>
              </div>
            ))}

            {categories.length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-8">
                No categories yet. Click &quot;+ New Category&quot; to create the first one.
              </div>
            )}
          </div>

          {/* ── Category game list ── */}
          {activeCat && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveCat(null)} className="text-gray-400 hover:text-gray-200 text-sm">
                    ← All categories
                  </button>
                  <h2 className="text-lg font-bold text-white">{activeCat.label}</h2>
                  <Badge label={`${catTotal} games`} variant="info" />
                </div>
                <button
                  onClick={() => { setAddModal(true); setSearchInput(''); setSearchResults([]); }}
                  className="btn-primary text-sm"
                >
                  + Add Game
                </button>
              </div>

              <div className="card p-0 overflow-hidden">
                {catLoading ? <PageSpinner /> : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-900 border-b border-gray-800">
                          <tr>
                            <th className="th">Game</th>
                            <th className="th">Provider</th>
                            <th className="th">UUID</th>
                            <th className="th">Status</th>
                            <th className="th">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catGames.length === 0 ? (
                            <tr><td colSpan={5} className="text-center text-gray-500 py-12">
                              No games in this category. Click &quot;+ Add Game&quot; to add some.
                            </td></tr>
                          ) : catGames.map(g => (
                            <tr key={g.id} className="tr-hover">
                              <td className="td">
                                <div className="flex items-center gap-3">
                                  {g.thumbnail && (
                                    <img src={g.thumbnail} alt="" className="w-9 h-9 rounded-lg object-cover bg-gray-700 flex-shrink-0"
                                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                  )}
                                  <div>
                                    <div className="font-medium text-white text-sm">{g.gameName}</div>
                                    <div className="text-xs text-gray-500">{g.description ?? ''}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="td text-gray-400 text-sm">{g.provider?.name ?? '—'}</td>
                              <td className="td font-mono text-xs text-gray-500">{g.gameUUID?.slice(0, 16)}…</td>
                              <td className="td">
                                <Badge label={g.isActive ? 'Active' : 'Hidden'} variant={g.isActive ? 'success' : 'gray'} />
                              </td>
                              <td className="td">
                                <button onClick={() => handleRemoveGame(g.id)}
                                  className="text-xs text-red-400 hover:text-red-300 font-medium">
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {catTotalPages > 1 && (
                      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800">
                        <span className="text-sm text-gray-400">Page {catPage} / {catTotalPages}</span>
                        <div className="flex gap-2">
                          <button disabled={catPage <= 1} onClick={() => setCatPage(p => p - 1)} className="btn-outline text-xs disabled:opacity-40">Prev</button>
                          <button disabled={catPage >= catTotalPages} onClick={() => setCatPage(p => p + 1)} className="btn-outline text-xs disabled:opacity-40">Next</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Add Game Modal ── */}
      {addModal && activeCat && (
        <Modal title={`Add game to "${activeCat.label}"`} onClose={() => setAddModal(false)}>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Search game name…" value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()} />
              <button onClick={handleSearch} disabled={searching} className="btn-primary flex-shrink-0">
                {searching ? '…' : 'Search'}
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {searchResults.length === 0 && !searching && searchInput && (
                <p className="text-sm text-gray-500 text-center py-4">No results</p>
              )}
              {searchResults.map(g => (
                <div key={g.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2">
                  {g.thumbnail && (
                    <img src={g.thumbnail} alt="" className="w-8 h-8 rounded object-cover bg-gray-700 flex-shrink-0"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{g.gameName}</div>
                    <div className="text-xs text-gray-500">{g.provider?.name ?? ''}</div>
                  </div>
                  <button onClick={() => handleAddGame(g.id)} disabled={adding === g.id}
                    className="btn-primary text-xs flex-shrink-0">
                    {adding === g.id ? '…' : '+ Add'}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setAddModal(false)} className="btn-outline w-full">Close</button>
          </div>
        </Modal>
      )}

      {/* ── Create Category Modal ── */}
      {createModal && (
        <Modal title="Create New Category" onClose={() => setCreateModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Key <span className="text-gray-500 text-xs">(e.g. "live_dealer" → auto-lowercased)</span></label>
              <input className="input" placeholder="e.g. live_dealer"
                value={newKey} onChange={e => setNewKey(e.target.value)} />
            </div>
            <div>
              <label className="label">Label <span className="text-gray-500 text-xs">(display name)</span></label>
              <input className="input" placeholder="e.g. Live Dealer"
                value={newLabel} onChange={e => setNewLabel(e.target.value)} />
            </div>
            <div>
              <label className="label">Color</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {COLOR_OPTIONS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)}
                    className={`w-7 h-7 rounded-lg ${c} border-2 transition-all ${newColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="label">Sort Order</label>
              <input className="input" type="number" min="0" value={newOrder}
                onChange={e => setNewOrder(e.target.value)} />
            </div>
            {formError && <p className="text-sm text-red-400">{formError}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setCreateModal(false)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <Modal title="Delete Category" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              Delete <span className="font-bold text-white">{deleteTarget.label}</span> (<code className="text-xs text-gray-400">{deleteTarget.key}</code>)?
            </p>
            <p className="text-amber-400 text-xs">
              This will fail if any games are still assigned to this category. Remove all games first.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setDeleteTarget(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-medium text-sm flex-1">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
