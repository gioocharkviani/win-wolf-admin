'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { liveApi, type LiveSession } from '@/lib/api';

function duration(createdAt: string): string {
  const secs = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

function PulseDot() {
  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  );
}

export default function LivePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [closing, setClosing]   = useState<number | null>(null);
  const [toast, setToast]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await liveApi.sessions();
    setSessions(res?.data?.sessions ?? []);
    setTotal(res?.data?.total ?? 0);
    setLastUpdated(new Date());
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => load(true), 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleClose = async (session: LiveSession) => {
    if (!confirm(`Force close session for ${session.userName ?? session.playerId?.slice(0, 8)}?`)) return;
    setClosing(session.id);
    const res = await liveApi.forceClose(session.id);
    setClosing(null);
    const ok = (res as any)?.code === 200 || (res as any)?.statusCode === 200;
    showToast(ok ? 'Session closed' : ((res as any)?.message ?? 'Failed'));
    if (ok) load(true);
  };

  const filtered = sessions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.gameName ?? '').toLowerCase().includes(q) ||
      (s.provider ?? '').toLowerCase().includes(q) ||
      (s.userName ?? '').toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q) ||
      s.playerId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 space-y-6">
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium bg-emerald-600 text-white">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="section-title mb-0">Live Players</h1>
            {!loading && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                <PulseDot />
                <span className="text-emerald-400 text-sm font-bold">{total} online</span>
              </div>
            )}
          </div>
          <p className="section-sub mt-1">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
            {' · '}auto-refresh every 10s
          </p>
        </div>
        <button onClick={() => load()} className="btn-outline text-sm">Refresh now</button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <input
          className="input max-w-xs"
          placeholder="Search player, game, provider…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="btn-outline text-xs">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-500 py-16">Loading live sessions…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            {total === 0 ? 'No players online right now' : 'No results match your search'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-800">
                <tr>
                  <th className="th">Player</th>
                  <th className="th">Game</th>
                  <th className="th">Provider</th>
                  <th className="th">Session Duration</th>
                  <th className="th">Last Active</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="tr-hover">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-900/50 border border-emerald-500/30 rounded-full flex items-center justify-center text-xs font-bold text-emerald-400 uppercase flex-shrink-0">
                          {s.firstName?.[0] ?? s.userName?.[0] ?? '?'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.userName ?? 'Unknown'}
                          </div>
                          <Link href={`/users/${s.playerId}`}
                            className="text-xs text-primary-400 hover:text-primary-300 font-mono">
                            {s.email ?? s.playerId.slice(0, 16) + '…'}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        {s.thumbnail && (
                          <img src={s.thumbnail} alt="" className="w-8 h-8 rounded object-cover bg-gray-800 flex-shrink-0" />
                        )}
                        <span className="text-sm text-white font-medium">{s.gameName}</span>
                      </div>
                    </td>
                    <td className="td text-xs text-gray-400">{s.provider ?? '—'}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <PulseDot />
                        <span className="text-sm text-emerald-400 font-mono font-medium">
                          {duration(s.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="td text-xs text-gray-500">
                      {s.updatedAt ? new Date(s.updatedAt).toLocaleTimeString() : '—'}
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <Link href={`/users/${s.playerId}`}
                          className="text-xs text-primary-400 hover:text-primary-300 font-medium">
                          Profile
                        </Link>
                        <button
                          onClick={() => handleClose(s)}
                          disabled={closing === s.id}
                          className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-40"
                        >
                          {closing === s.id ? 'Closing…' : 'Force Close'}
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

      {/* Summary cards */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const providerMap = new Map<string, number>();
            sessions.forEach(s => {
              const key = s.provider ?? 'Unknown';
              providerMap.set(key, (providerMap.get(key) ?? 0) + 1);
            });
            const topProviders = Array.from(providerMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4);
            return topProviders.map(([provider, count]) => (
              <div key={provider} className="card">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{provider}</div>
                <div className="text-2xl font-bold text-primary-400">{count}</div>
                <div className="text-xs text-gray-500">active players</div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
