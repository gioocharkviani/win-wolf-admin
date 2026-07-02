'use client';

import { useEffect, useState, useCallback } from 'react';
import { gamesApi, type Game } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';

function useDemoLaunch() {
  const [launching, setLaunching] = useState<string | null>(null);

  const launch = async (gameHumanReadableId: string | undefined) => {
    if (!gameHumanReadableId) return;
    setLaunching(gameHumanReadableId);
    try {
      const res = await gamesApi.demoUrl(gameHumanReadableId);
      if (res?.url) {
        window.open(res.url, '_blank', 'noopener');
      }
    } finally {
      setLaunching(null);
    }
  };

  return { launch, launching };
}

const GAME_CATEGORIES = [
  'new', 'top', 'popular', 'slots', 'live_casino',
  'table_games', 'jackpot', 'virtual_sports', 'crash',
];

function GameDetailModal({
  game,
  onClose,
  onLaunchDemo,
  launching,
}: {
  game: Game;
  onClose: () => void;
  onLaunchDemo: (id: string) => void;
  launching: string | null;
}) {
  const provider = game.gameProvider ?? game.provider;
  const meta = game.metaData;

  return (
    <Modal title={game.gameName} onClose={onClose}>
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Thumbnail + header */}
        <div className="flex gap-4">
          {game.thumbnail ? (
            <img
              src={game.thumbnail}
              alt={game.gameName}
              className="w-28 h-28 rounded-xl object-cover bg-gray-800 flex-shrink-0"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-28 h-28 rounded-xl bg-gray-800 flex items-center justify-center text-gray-600 flex-shrink-0">
              No image
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge label={game.isActive ? 'Active' : 'Hidden'} variant={game.isActive ? 'success' : 'gray'} />
              {meta?.supports_promo_freespins && (
                <span className="badge bg-purple-900/50 text-purple-300 text-xs">Free Spins</span>
              )}
            </div>
            {game.gameHumanReadableId && (
              <div className="text-xs text-gray-500 font-mono truncate">{game.gameHumanReadableId}</div>
            )}
            <div className="text-xs text-gray-500 font-mono break-all">{game.gameUUID}</div>
          </div>
        </div>

        {/* Demo launch */}
        {game.gameHumanReadableId && (
          <button
            onClick={() => onLaunchDemo(game.gameHumanReadableId!)}
            disabled={launching === game.gameHumanReadableId}
            className="btn-primary w-full justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {launching === game.gameHumanReadableId ? 'Opening…' : 'Launch Demo (New Tab)'}
          </button>
        )}

        {/* Provider */}
        {provider && (
          <div className="section-block">
            <div className="label mb-1">Provider</div>
            <div className="flex items-center gap-3">
              {provider.logo && (
                <img src={provider.logo} alt={provider.name} className="h-6 object-contain"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              )}
              <span className="text-sm text-white font-medium">{provider.name}</span>
              {game.gameProvider?.prefix && (
                <span className="text-xs text-gray-500 font-mono">{game.gameProvider.prefix}</span>
              )}
            </div>
          </div>
        )}

        {/* Categories */}
        {(game.categories ?? []).length > 0 && (
          <div className="section-block">
            <div className="label mb-1">Categories</div>
            <div className="flex flex-wrap gap-1.5">
              {game.categories!.map(c => (
                <span key={c.category} className="badge bg-gray-700 text-gray-300 text-xs capitalize">
                  {c.category}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        {meta && (
          <div className="section-block">
            <div className="label mb-2">Game Metadata</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {meta.reelsWidth != null && (
                <><span className="text-gray-500">Reels Width</span><span className="text-white">{meta.reelsWidth}</span></>
              )}
              {meta.reelsHeight != null && (
                <><span className="text-gray-500">Reels Height</span><span className="text-white">{meta.reelsHeight}</span></>
              )}
              {meta.lines != null && (
                <><span className="text-gray-500">Lines</span><span className="text-white">{meta.lines}</span></>
              )}
              <span className="text-gray-500">Free Spins</span>
              <span className={meta.supports_promo_freespins ? 'text-emerald-400' : 'text-gray-500'}>
                {meta.supports_promo_freespins ? 'Supported' : 'Not supported'}
              </span>
            </div>
          </div>
        )}

        {/* Description */}
        {game.description && (
          <div className="section-block">
            <div className="label mb-1">Description</div>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{game.description}</p>
          </div>
        )}

        {/* Rules */}
        {game.rules && (
          <div className="section-block">
            <div className="label mb-1">Rules</div>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{game.rules}</p>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {game.createdAt && (
            <div>
              <div className="label mb-0.5">Created</div>
              <div className="text-gray-300">{new Date(game.createdAt).toLocaleDateString()}</div>
            </div>
          )}
          {game.updatedAt && (
            <div>
              <div className="label mb-0.5">Updated</div>
              <div className="text-gray-300">{new Date(game.updatedAt).toLocaleDateString()}</div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function GamesPage() {
  const [games, setGames]         = useState<Game[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [syncing, setSyncing]     = useState(false);
  const [syncMsg, setSyncMsg]     = useState('');

  // detail modal
  const [viewGame, setViewGame] = useState<Game | null>(null);

  // category modal
  const [catGame, setCatGame] = useState<Game | null>(null);
  const [catValue, setCatValue] = useState('slots');

  const { launch, launching } = useDemoLaunch();

  const limit = 25;

  const load = useCallback(() => {
    setLoading(true);
    gamesApi.list({
      page,
      limit,
      search: search || undefined,
      isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
    }).then(res => {
      setGames(res?.data ?? []);
      setTotal(res?.total ?? 0);
      setTotalPages(res?.totalPages ?? Math.ceil((res?.total ?? 0) / limit));
      setLoading(false);
    });
  }, [page, search, activeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (g: Game) => {
    if (g.isActive) {
      await gamesApi.hide(g.id);
    } else {
      await gamesApi.show(g.id);
    }
    load();
  };

  const handleAddCategory = async () => {
    if (!catGame) return;
    await gamesApi.addCategory(catGame.id, catValue);
    setCatGame(null);
    load();
  };

  const handleRemoveCategory = async (gameId: number, cat: string) => {
    await gamesApi.removeCategory(gameId, cat);
    load();
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await gamesApi.syncRevolver();
      setSyncMsg((res as any)?.message ?? 'Sync completed');
      load();
    } catch {
      setSyncMsg('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="section-title">Games</h1>
          <p className="section-sub">{total} total games</p>
        </div>
        <div className="flex items-center gap-3">
          {syncMsg && <span className="text-sm text-emerald-400">{syncMsg}</span>}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-outline gap-2"
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? 'Syncing…' : 'Sync from Revolver'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form
          className="flex gap-2"
          onSubmit={e => { e.preventDefault(); setPage(1); setSearch(searchInput); }}
        >
          <input
            className="input max-w-xs"
            placeholder="Search game name…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn-primary">Search</button>
          {search && (
            <button type="button" className="btn-outline" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
              Clear
            </button>
          )}
        </form>

        {(['all', 'active', 'inactive'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setActiveFilter(f); setPage(1); }}
            className={`btn capitalize ${activeFilter === f ? 'btn-primary' : 'btn-outline'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 border-b border-gray-800">
                  <tr>
                    <th className="th">Game</th>
                    <th className="th">Provider</th>
                    <th className="th">Categories</th>
                    <th className="th">Status</th>
                    <th className="th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {games.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-500 py-16">No games found</td>
                    </tr>
                  ) : (
                    games.map(g => (
                      <tr key={g.id} className="tr-hover">
                        <td className="td">
                          <button
                            onClick={() => setViewGame(g)}
                            className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity w-full"
                          >
                            {g.thumbnail ? (
                              <img
                                src={g.thumbnail}
                                alt={g.gameName}
                                className="w-9 h-9 rounded-lg object-cover bg-gray-700 flex-shrink-0"
                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-gray-800 flex-shrink-0" />
                            )}
                            <div>
                              <div className="font-medium text-white text-sm hover:text-primary-400 transition-colors">{g.gameName}</div>
                              <div className="text-xs text-gray-500 font-mono">
                                {g.gameUUID?.slice(0, 14)}…
                              </div>
                            </div>
                          </button>
                        </td>
                        <td className="td text-gray-400">{(g.gameProvider ?? g.provider)?.name ?? '—'}</td>
                        <td className="td">
                          <div className="flex flex-wrap gap-1">
                            {(g.categories ?? []).map(c => (
                              <span
                                key={c.category}
                                className="badge bg-gray-700 text-gray-300 text-xs cursor-pointer hover:bg-red-900/50 hover:text-red-300 transition-colors"
                                title="Click to remove"
                                onClick={() => handleRemoveCategory(g.id, c.category)}
                              >
                                {c.category} ×
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="td">
                          <Badge
                            label={g.isActive ? 'Active' : 'Hidden'}
                            variant={g.isActive ? 'success' : 'gray'}
                          />
                        </td>
                        <td className="td">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggle(g)}
                              className={`text-xs font-medium ${
                                g.isActive
                                  ? 'text-red-400 hover:text-red-300'
                                  : 'text-emerald-400 hover:text-emerald-300'
                              }`}
                            >
                              {g.isActive ? 'Hide' : 'Show'}
                            </button>
                            <button
                              onClick={() => { setCatGame(g); setCatValue('slots'); }}
                              className="text-xs text-primary-400 hover:text-primary-300 font-medium"
                            >
                              + Category
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800">
              <span className="text-sm text-gray-400">Page {page} of {totalPages} · {total} games</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-outline text-xs disabled:opacity-40">← Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-outline text-xs disabled:opacity-40">Next →</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Game Detail Modal */}
      {viewGame && (
        <GameDetailModal
          game={viewGame}
          onClose={() => setViewGame(null)}
          onLaunchDemo={launch}
          launching={launching}
        />
      )}

      {/* Add Category Modal */}
      {catGame && (
        <Modal title={`Add Category — ${catGame.gameName}`} onClose={() => setCatGame(null)}>
          <div className="space-y-3">
            <label className="label">Category</label>
            <select className="input" value={catValue} onChange={e => setCatValue(e.target.value)}>
              {GAME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setCatGame(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleAddCategory} className="btn-primary flex-1">Add</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
