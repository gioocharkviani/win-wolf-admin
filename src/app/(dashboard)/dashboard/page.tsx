'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usersApi, platformApi, type User, type PlatformStats } from '@/lib/api';
import StatCard from '@/components/ui/StatCard';
import Badge, { statusBadge, txTypeBadge, txStatusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';

export default function DashboardPage() {
  const [users, setUsers]           = useState<User[]>([]);
  const [stats, setStats]           = useState<PlatformStats | null>(null);
  const [recentTxs, setRecentTxs]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      usersApi.list(),
      platformApi.stats(),
      platformApi.allTransactions({ limit: 8, page: 1 }),
    ]).then(([uRes, sRes, txRes]) => {
      setUsers(uRes?.data ?? []);
      setStats(sRes?.data ?? null);
      setRecentTxs(txRes?.data ?? []);
      setLoading(false);
    });
  }, []);

  const total      = stats?.users.total      ?? users.length;
  const active     = stats?.users.active     ?? users.filter(u => u.verified && !u.isBlocked).length;
  const blocked    = stats?.users.blocked    ?? users.filter(u => u.isBlocked).length;
  const unverified = stats?.users.unverified ?? users.filter(u => !u.verified && !u.isBlocked).length;
  const totalGames = stats?.games.total ?? 0;

  const recent = [...users]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  if (loading) return <PageSpinner />;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="section-title">Dashboard</h1>
        <p className="section-sub">Platform overview</p>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={total}
          color="text-primary-400"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          label="Active Users"
          value={active}
          color="text-emerald-400"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Blocked"
          value={blocked}
          color="text-red-400"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
        />
        <StatCard
          label="Pending KYC"
          value={unverified}
          color="text-amber-400"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
      </div>

      {/* ── Second row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/games" className="block">
          <div className="card hover:border-gray-600 transition-colors cursor-pointer">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Games</div>
            <div className="text-3xl font-bold text-blue-400">{totalGames}</div>
          </div>
        </Link>
        <Link href="/promotions" className="block">
          <div className="card hover:border-gray-600 transition-colors cursor-pointer">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Quick Links</div>
            <div className="text-sm text-primary-400 font-medium">Promotions →</div>
          </div>
        </Link>
        <Link href="/categories" className="block">
          <div className="card hover:border-gray-600 transition-colors cursor-pointer">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Landing Page</div>
            <div className="text-sm text-emerald-400 font-medium">Categories →</div>
          </div>
        </Link>
        <Link href="/transactions" className="block">
          <div className="card hover:border-gray-600 transition-colors cursor-pointer">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Payments</div>
            <div className="text-sm text-amber-400 font-medium">Transactions →</div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Recent Registrations ── */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-base font-semibold text-white">Recent Registrations</h2>
            <Link href="/users" className="text-sm text-primary-400 hover:text-primary-300">View all →</Link>
          </div>
          <div className="divide-y divide-gray-800">
            {recent.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-sm">No users yet</div>
            ) : recent.map(u => {
              const b = statusBadge(u.isBlocked, u.verified ?? false);
              return (
                <div key={u.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-800/50 transition-colors">
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300 uppercase flex-shrink-0">
                    {u.firstName?.[0]}{u.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-gray-500 truncate">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge {...b} />
                    <Link href={`/users/${u.id}`} className="text-xs text-primary-400 hover:text-primary-300">View</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Recent Transactions ── */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-base font-semibold text-white">Recent Transactions</h2>
            <Link href="/transactions" className="text-sm text-primary-400 hover:text-primary-300">View all →</Link>
          </div>
          <div className="divide-y divide-gray-800">
            {recentTxs.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-sm">No transactions yet</div>
            ) : recentTxs.map((tx: any) => (
              <div key={tx.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-800/50 transition-colors">
                <Badge {...txTypeBadge(tx.type)} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono font-medium text-white">
                    {tx.amount !== undefined ? (tx.amount / 100).toFixed(2) : '—'}
                  </div>
                  <div className="text-xs text-gray-500 font-mono truncate">{tx.userId?.slice(0, 16)}…</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge {...txStatusBadge(tx.status)} />
                  <span className="text-xs text-gray-500">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pending KYC (needs activation) ── */}
      {unverified > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-base font-semibold text-white">
              Pending KYC / Activation
              <span className="ml-2 bg-amber-500/20 text-amber-400 text-xs font-medium px-2 py-0.5 rounded-full">{unverified}</span>
            </h2>
            <Link href="/users?filter=unverified" className="text-sm text-amber-400 hover:text-amber-300">View all →</Link>
          </div>
          <div className="divide-y divide-gray-800">
            {users.filter(u => !u.verified && !u.isBlocked).slice(0, 5).map(u => (
              <div key={u.id} className="flex items-center gap-3 px-6 py-3">
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300 uppercase flex-shrink-0">
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{u.firstName} {u.lastName}</div>
                  <div className="text-xs text-gray-500 truncate">{u.email}</div>
                </div>
                <div className="text-xs text-gray-500 flex-shrink-0">
                  {new Date(u.createdAt).toLocaleDateString()}
                </div>
                <Link href={`/users/${u.id}`} className="btn-primary text-xs flex-shrink-0">
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
