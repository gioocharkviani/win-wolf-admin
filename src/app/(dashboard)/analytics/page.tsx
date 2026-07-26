'use client';

import { useEffect, useState } from 'react';
import {
  analyticsApi,
  type PlatformAnalyticsData,
  type TopGame,
  type TxTypeBreakdown,
} from '@/lib/api';
import { PageSpinner } from '@/components/ui/Spinner';

// ─── formatting helpers ──────────────────────────────────────────────────────

const c = (n: number) =>
  '₺' + (n / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtNum = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
};

function last30(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
}

// ─── KPI tile ────────────────────────────────────────────────────────────────

type KpiColor = 'green' | 'red' | 'blue' | 'yellow' | 'purple' | 'cyan' | 'orange';

const KPI_COLORS: Record<KpiColor, string> = {
  green:  'border-green-800  bg-green-900/20  text-green-400',
  red:    'border-red-800    bg-red-900/20    text-red-400',
  blue:   'border-blue-800   bg-blue-900/20   text-blue-400',
  yellow: 'border-yellow-800 bg-yellow-900/20 text-yellow-400',
  purple: 'border-purple-800 bg-purple-900/20 text-purple-400',
  cyan:   'border-cyan-800   bg-cyan-900/20   text-cyan-400',
  orange: 'border-orange-800 bg-orange-900/20 text-orange-400',
};

function Kpi({
  label, value, sub, color, icon,
}: {
  label: string; value: string; sub?: string; color: KpiColor; icon?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${KPI_COLORS[color]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wider opacity-60 font-medium">{label}</p>
        {icon && <span className="text-lg opacity-70">{icon}</span>}
      </div>
      <p className="text-2xl font-bold text-white mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-50">{sub}</p>}
    </div>
  );
}

// ─── bar chart ───────────────────────────────────────────────────────────────

interface Series { label: string; values: number[]; color: string }

function BarChart({
  labels, series, height = 160, formatY,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  formatY?: (v: number) => string;
}) {
  const allVals = series.flatMap((s) => s.values);
  const max = Math.max(...allVals, 1);

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 480 }}>
        <div className="flex items-end gap-px" style={{ height }}>
          {labels.map((lbl, i) => (
            <div key={lbl} className="flex-1 flex flex-col items-stretch justify-end gap-px group relative">
              {series.map((s) => {
                const h = Math.max((s.values[i] / max) * (height - 20), s.values[i] > 0 ? 2 : 0);
                const tip = formatY ? formatY(s.values[i]) : fmtNum(s.values[i]);
                return (
                  <div
                    key={s.label}
                    title={`${lbl}\n${s.label}: ${tip}`}
                    className="w-full rounded-t-sm transition-opacity hover:opacity-70 cursor-default"
                    style={{ height: h, backgroundColor: s.color }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex gap-px mt-1">
          {labels.map((l, i) => (
            <div key={l} className="flex-1 text-center text-gray-600" style={{ fontSize: 9 }}>
              {i % 5 === 0 ? l.slice(5) : ''}
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 flex-wrap">
          {series.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── transaction type breakdown ──────────────────────────────────────────────

const TX_COLOR: Record<string, string> = {
  deposit:        '#22c55e',
  withdrawal:     '#ef4444',
  debit:          '#3b82f6',
  credit:         '#8b5cf6',
  'debit&credit': '#06b6d4',
  bonus:          '#f59e0b',
  rollback:       '#6b7280',
  adjustment:     '#ec4899',
};

function TxBreakdown({ items }: { items: TxTypeBreakdown[] }) {
  const totalCount = items.reduce((s, i) => s + i.count, 0);
  if (!totalCount) return <p className="text-gray-500 text-sm">No data</p>;
  return (
    <div className="space-y-3">
      {[...items].sort((a, b) => b.count - a.count).map((item) => {
        const pct = ((item.count / totalCount) * 100).toFixed(1);
        const col = TX_COLOR[item.type] ?? '#6b7280';
        return (
          <div key={item.type} className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: col }} />
            <span className="text-sm text-gray-300 capitalize w-28 truncate">{item.type}</span>
            <div className="flex-1 bg-gray-800 rounded-full h-1.5">
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: col }} />
            </div>
            <span className="text-xs text-gray-400 tabular-nums w-14 text-right">{item.count.toLocaleString()}</span>
            <span className="text-xs text-gray-500 w-12 text-right">{pct}%</span>
            <span className="text-xs text-gray-500 w-24 text-right tabular-nums">{c(item.totalAmount)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── top games table ─────────────────────────────────────────────────────────

function TopGamesTable({ games }: { games: TopGame[] }) {
  if (!games.length) return <p className="text-gray-500 text-sm py-4 text-center">No game data yet</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
            <th className="text-left py-2 pr-4">#</th>
            <th className="text-left py-2 pr-4">Game</th>
            <th className="text-right py-2 pr-4">Wagered</th>
            <th className="text-right py-2 pr-4">Won</th>
            <th className="text-right py-2 pr-4">GGR</th>
            <th className="text-right py-2">Players</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {games.map((g, i) => (
            <tr key={g.gameId} className="hover:bg-gray-800/30">
              <td className="py-2.5 pr-4 text-gray-500">{i + 1}</td>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  {g.thumbnail && (
                    <img src={g.thumbnail} alt="" className="w-7 h-7 rounded object-cover opacity-80" />
                  )}
                  <span className="text-gray-200 font-medium truncate max-w-[180px]">{g.gameName}</span>
                </div>
              </td>
              <td className="py-2.5 pr-4 text-right text-gray-300 tabular-nums">{c(g.wagered)}</td>
              <td className="py-2.5 pr-4 text-right text-gray-300 tabular-nums">{c(g.won)}</td>
              <td className={`py-2.5 pr-4 text-right font-medium tabular-nums ${g.ggr >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {c(g.ggr)}
              </td>
              <td className="py-2.5 text-right text-gray-400 tabular-nums">{g.uniquePlayers.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<PlatformAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    analyticsApi.get().then((res) => {
      if (res?.data) setData(res.data);
      else setError('Failed to load analytics');
      setLoading(false);
    });
  }, []);

  if (loading) return <PageSpinner />;
  if (error || !data) return <div className="p-6 text-red-400">{error || 'No data'}</div>;

  const labels = last30();

  // build aligned time series
  const byDate = <T extends { date: string }>(arr: T[], key: keyof T) => {
    const m: Record<string, number> = {};
    arr.forEach((d) => {
      const k = String(d.date).slice(0, 10);
      m[k] = Number(d[key]);
    });
    return labels.map((l) => m[l] ?? 0);
  };

  const deposits30    = byDate(data.timeSeries?.dailyFinancial ?? [], 'deposits');
  const withdrawals30 = byDate(data.timeSeries?.dailyFinancial ?? [], 'withdrawals');
  const ggr30         = byDate(data.timeSeries?.dailyFinancial ?? [], 'ggr');
  const wagered30     = byDate(data.timeSeries?.dailyFinancial ?? [], 'wagered');
  const sessions30    = byDate(data.timeSeries?.dailySessions  ?? [], 'sessions');
  const dau30         = byDate(data.timeSeries?.dailyActiveUsers ?? [], 'count');
  const regs30        = byDate(data.userRegistrations?.dailyRegistrations ?? [], 'count');

  const fin = data.financial ?? null;
  const games = data.games ?? null;
  const regs = data.userRegistrations ?? null;

  if (!fin || !games) return <div className="p-6 text-yellow-400">Analytics data is still loading — no financial data yet.</div>;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Platform overview — last 30 days</p>
      </div>

      {/* ── Revenue KPIs ── */}
      <div className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Revenue</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon="💰" label="Total Deposits" value={c(fin.deposits.total)}
            sub={`${fin.deposits.count.toLocaleString()} txns · avg ${c(fin.deposits.average)}`} color="green" />
          <Kpi icon="💸" label="Total Withdrawals" value={c(fin.withdrawals.total)}
            sub={`${fin.withdrawals.count.toLocaleString()} txns`} color="red" />
          <Kpi icon="📈" label="GGR" value={c(fin.ggr)}
            sub="Deposits − withdrawals" color={fin.ggr >= 0 ? 'green' : 'red'} />
          <Kpi icon="⏳" label="Pending Withdrawals" value={c(fin.pendingWithdrawals.total)}
            sub={`${fin.pendingWithdrawals.count} pending`} color="yellow" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          <Kpi icon="🎁" label="Bonus Payouts" value={c(fin.bonusPayouts.total)}
            sub={`${fin.bonusPayouts.count.toLocaleString()} issued`} color="purple" />
          <Kpi icon="🎮" label="Total Sessions" value={fmtNum(games.totalSessions)}
            sub={`${games.activeSessions} active now`} color="blue" />
          <Kpi icon="🏆" label="Top Game GGR" value={games.topGames[0] ? c(games.topGames[0].ggr) : '—'}
            sub={games.topGames[0]?.gameName ?? ''} color="cyan" />
        </div>
      </div>

      {/* ── User KPIs ── */}
      <div className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Users</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Kpi icon="🆕" label="New This Week"  value={fmtNum(regs?.newThisWeek  ?? 0)} color="blue" />
          <Kpi icon="📅" label="New This Month" value={fmtNum(regs?.newThisMonth ?? 0)} color="purple" />
          <Kpi icon="👥" label="Active Today"   value={fmtNum(dau30[dau30.length - 1] ?? 0)}
            sub="Unique users with transactions" color="cyan" />
        </div>
      </div>

      {/* ── Revenue chart ── */}
      <Section title="Daily Revenue — Deposits / Withdrawals / GGR">
        <BarChart
          labels={labels}
          series={[
            { label: 'Deposits',    values: deposits30,    color: '#22c55e' },
            { label: 'Withdrawals', values: withdrawals30, color: '#ef4444' },
            { label: 'GGR',         values: ggr30,         color: '#f59e0b' },
          ]}
          height={180}
          formatY={c}
        />
      </Section>

      {/* ── Wagered per day ── */}
      <Section title="Daily Wagered (Bets Placed)">
        <BarChart
          labels={labels}
          series={[{ label: 'Wagered', values: wagered30, color: '#3b82f6' }]}
          height={140}
          formatY={c}
        />
      </Section>

      {/* ── Sessions + DAU + Registrations ── */}
      <Section title="Daily Activity — Sessions / Active Users / New Registrations">
        <BarChart
          labels={labels}
          series={[
            { label: 'Sessions',       values: sessions30, color: '#8b5cf6' },
            { label: 'Active Users',   values: dau30,      color: '#06b6d4' },
            { label: 'Registrations',  values: regs30,     color: '#22c55e' },
          ]}
          height={160}
        />
      </Section>

      {/* ── Top Games ── */}
      <Section title="Top 10 Games by Revenue">
        <TopGamesTable games={data.games.topGames} />
      </Section>

      {/* ── Transaction type breakdown ── */}
      <Section title="Transaction Breakdown">
        <div className="text-xs text-gray-500 mb-1 flex justify-end gap-6 pr-1">
          <span>Count</span><span className="w-12 text-right">%</span><span className="w-24 text-right">Volume</span>
        </div>
        <TxBreakdown items={data.typeBreakdown ?? []} />
      </Section>
    </div>
  );
}
