'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { wageringApi, type WageringEntry } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';

const STATUS_TABS = [
  { key: '',          label: 'Active + Assigned' },
  { key: 'active',    label: 'Active' },
  { key: 'assigned',  label: 'Assigned' },
  { key: 'completed', label: 'Completed' },
  { key: 'expired',   label: 'Expired' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

function fmt(n: number) {
  return (Number(n) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function WageringBar({ completed, required }: { completed: number; required: number }) {
  const pct = required > 0 ? Math.min(100, Math.round((Number(completed) / Number(required)) * 100)) : 0;
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-primary-500';
  return (
    <div className="space-y-1 min-w-[140px]">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{fmt(completed)}</span>
        <span className="font-medium text-white">{pct}%</span>
        <span>{fmt(required)}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function statusBadge(s: string) {
  const map: Record<string, { label: string; variant: any }> = {
    active:    { label: 'Active',    variant: 'success' },
    assigned:  { label: 'Assigned',  variant: 'blue' },
    completed: { label: 'Completed', variant: 'gray' },
    expired:   { label: 'Expired',   variant: 'red' },
    cancelled: { label: 'Cancelled', variant: 'gray' },
  };
  return map[s] ?? { label: s, variant: 'gray' };
}

export default function WageringPage() {
  const [rows, setRows]           = useState<WageringEntry[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [statusTab, setStatusTab] = useState('');
  const [loading, setLoading]     = useState(true);
  const limit = 50;

  const load = useCallback(() => {
    setLoading(true);
    wageringApi.list({ page, limit, status: statusTab || undefined }).then(res => {
      setRows(res?.data ?? []);
      setTotal(res?.total ?? 0);
      setTotalPages(res?.totalPages ?? 1);
      setLoading(false);
    });
  }, [page, statusTab]);

  useEffect(() => { load(); }, [load]);

  const changeTab = (key: string) => { setStatusTab(key); setPage(1); };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="section-title">Wagering</h1>
        <p className="section-sub">{total} bonus wagering records</p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => changeTab(t.key)}
            className={`btn text-xs ${statusTab === t.key ? 'btn-primary' : 'btn-outline'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <PageSpinner /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 border-b border-gray-800">
                  <tr>
                    <th className="th">User</th>
                    <th className="th">Bonus</th>
                    <th className="th">Type</th>
                    <th className="th">Bonus Balance</th>
                    <th className="th">Wagering Progress</th>
                    <th className="th">Multiplier</th>
                    <th className="th">Expires</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-gray-500 py-16">No records</td>
                    </tr>
                  ) : rows.map(r => {
                    const sb = statusBadge(r.status);
                    const isExpiringSoon = r.expiresAt && r.status === 'active'
                      && new Date(r.expiresAt).getTime() - Date.now() < 24 * 3600 * 1000;
                    return (
                      <tr key={r.id} className="tr-hover">
                        <td className="td">
                          <Link href={`/users/${r.userId}`} className="text-primary-400 hover:text-primary-300 text-sm font-mono">
                            {r.userId.slice(0, 8)}…
                          </Link>
                        </td>
                        <td className="td">
                          <div className="text-sm text-white font-medium">{r.promotion?.name ?? '—'}</div>
                          {r.promotion?.allowedGameUUIDs?.length ? (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {r.promotion.allowedGameUUIDs.length} restricted game{r.promotion.allowedGameUUIDs.length > 1 ? 's' : ''}
                            </div>
                          ) : null}
                        </td>
                        <td className="td">
                          <span className="badge bg-gray-700 text-gray-300 capitalize text-xs">
                            {r.promotion?.type ?? '—'}
                          </span>
                        </td>
                        <td className="td font-mono text-white">{fmt(r.bonusBalance)}</td>
                        <td className="td">
                          {Number(r.wageringRequired) > 0
                            ? <WageringBar completed={r.wageringCompleted} required={r.wageringRequired} />
                            : <span className="text-xs text-gray-500">No wagering</span>
                          }
                        </td>
                        <td className="td text-center text-gray-300">
                          {r.promotion?.wageringMultiplier ?? 0}×
                        </td>
                        <td className={`td text-xs ${isExpiringSoon ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                          {r.expiresAt ? new Date(r.expiresAt).toLocaleString() : '—'}
                          {isExpiringSoon && <div className="text-red-400">⚠ Expiring soon</div>}
                        </td>
                        <td className="td">
                          <Badge label={sb.label} variant={sb.variant} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800">
              <span className="text-sm text-gray-400">Page {page} of {totalPages} · {total} records</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-outline text-xs disabled:opacity-40">← Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-outline text-xs disabled:opacity-40">Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
