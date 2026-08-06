'use client';

import { useEffect, useState, useCallback } from 'react';
import { reportsApi, type GameReportItem, type ProviderReportItem } from '@/lib/api';
import { PageSpinner } from '@/components/ui/Spinner';

function fmt(n: number) {
  return '₺' + (Number(n) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function RtpBar({ rtp }: { rtp: number }) {
  const pct = Math.min(100, Math.max(0, rtp));
  const color = rtp > 98 ? 'bg-red-500' : rtp > 95 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-300 font-mono w-12 text-right">{rtp.toFixed(1)}%</span>
    </div>
  );
}

type Tab = 'games' | 'providers';

export default function ReportsPage() {
  const [perGame, setPerGame]         = useState<GameReportItem[]>([]);
  const [perProvider, setPerProvider] = useState<ProviderReportItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<Tab>('games');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo]     = useState('');
  const [search, setSearch]           = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await reportsApi.games(appliedFrom || undefined, appliedTo || undefined);
    setPerGame(res?.data?.perGame ?? []);
    setPerProvider(res?.data?.perProvider ?? []);
    setLoading(false);
  }, [appliedFrom, appliedTo]);

  useEffect(() => { load(); }, [load]);

  const applyFilter = () => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
  };

  const clearFilter = () => {
    setDateFrom(''); setDateTo('');
    setAppliedFrom(''); setAppliedTo('');
  };

  const filteredGames = perGame.filter(g =>
    !search || g.gameName.toLowerCase().includes(search.toLowerCase()) ||
    (g.provider ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalWagered  = perGame.reduce((s, g) => s + g.wagered, 0);
  const totalGgr      = perGame.reduce((s, g) => s + g.ggr, 0);
  const totalSessions = perGame.reduce((s, g) => s + g.txCount, 0);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="section-title">Game Performance Report</h1>
        <p className="section-sub">Per-game and per-provider revenue analytics</p>
      </div>

      {/* Date filter */}
      <div className="card flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">From</label>
          <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">To</label>
          <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <button onClick={applyFilter} className="btn-primary">Apply</button>
        {(appliedFrom || appliedTo) && (
          <button onClick={clearFilter} className="btn-outline">All Time</button>
        )}
        <div className="ml-auto">
          <input className="input" placeholder="Search game or provider…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Wagered</div>
          <div className="text-2xl font-bold text-white">{fmt(totalWagered)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total GGR</div>
          <div className={`text-2xl font-bold ${totalGgr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(totalGgr)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Game Rounds</div>
          <div className="text-2xl font-bold text-blue-400">{totalSessions.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Active Games</div>
          <div className="text-2xl font-bold text-primary-400">{perGame.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('games')}
          className={`btn text-sm ${tab === 'games' ? 'btn-primary' : 'btn-outline'}`}>
          Per Game
        </button>
        <button onClick={() => setTab('providers')}
          className={`btn text-sm ${tab === 'providers' ? 'btn-primary' : 'btn-outline'}`}>
          Per Provider
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? <PageSpinner /> : tab === 'games' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-800">
                <tr>
                  <th className="th">Game</th>
                  <th className="th">Provider</th>
                  <th className="th text-right">Wagered</th>
                  <th className="th text-right">Won</th>
                  <th className="th text-right">GGR</th>
                  <th className="th">RTP</th>
                  <th className="th text-right">Players</th>
                  <th className="th text-right">Rounds</th>
                </tr>
              </thead>
              <tbody>
                {filteredGames.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-gray-500 py-16">No data</td></tr>
                ) : filteredGames.map(g => (
                  <tr key={g.gameId} className="tr-hover">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        {g.thumbnail && (
                          <img src={g.thumbnail} alt="" className="w-8 h-8 rounded object-cover bg-gray-800" />
                        )}
                        <span className="text-sm text-white font-medium">{g.gameName}</span>
                      </div>
                    </td>
                    <td className="td text-xs text-gray-400">{g.provider ?? '—'}</td>
                    <td className="td font-mono text-sm text-right text-gray-300">{fmt(g.wagered)}</td>
                    <td className="td font-mono text-sm text-right text-gray-300">{fmt(g.won)}</td>
                    <td className={`td font-mono text-sm font-bold text-right ${g.ggr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmt(g.ggr)}
                    </td>
                    <td className="td"><RtpBar rtp={g.rtp} /></td>
                    <td className="td font-mono text-sm text-right text-gray-400">{g.uniquePlayers.toLocaleString()}</td>
                    <td className="td font-mono text-sm text-right text-gray-400">{g.txCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-800">
                <tr>
                  <th className="th">Provider</th>
                  <th className="th text-right">Games</th>
                  <th className="th text-right">Wagered</th>
                  <th className="th text-right">Won</th>
                  <th className="th text-right">GGR</th>
                  <th className="th">RTP</th>
                </tr>
              </thead>
              <tbody>
                {perProvider.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-gray-500 py-16">No data</td></tr>
                ) : perProvider.map(p => (
                  <tr key={p.provider} className="tr-hover">
                    <td className="td text-sm font-semibold text-white">{p.provider}</td>
                    <td className="td font-mono text-sm text-right text-gray-400">{p.gameCount}</td>
                    <td className="td font-mono text-sm text-right text-gray-300">{fmt(p.wagered)}</td>
                    <td className="td font-mono text-sm text-right text-gray-300">{fmt(p.won)}</td>
                    <td className={`td font-mono text-sm font-bold text-right ${p.ggr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmt(p.ggr)}
                    </td>
                    <td className="td"><RtpBar rtp={p.rtp} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
