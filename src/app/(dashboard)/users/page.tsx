'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usersApi, type User } from '@/lib/api';
import Badge, { statusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';

const LIMIT = 25;
type FilterTab = 'all' | 'active' | 'blocked' | 'unverified';

export default function UsersPage() {
  const [users, setUsers]             = useState<User[]>([]);
  const [total, setTotal]             = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState<FilterTab>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const isBlocked = filter === 'blocked'    ? true  : filter === 'active' ? false : undefined;
    const verified  = filter === 'active'     ? true  : filter === 'unverified' ? false : undefined;
    const res = await usersApi.list({ page, limit: LIMIT, search: search || undefined, isBlocked, verified });
    setUsers(res?.data ?? []);
    setTotal(res?.total ?? 0);
    setTotalPages(res?.totalPages ?? 1);
    setLoading(false);
  }, [page, search, filter]);

  useEffect(() => { load(); }, [load]);

  const applySearch = () => { setPage(1); setSearch(searchInput.trim()); };

  const handleBlock = async (u: User) => {
    if (u.isBlocked) {
      await usersApi.unblock(u.id);
    } else {
      const reason = prompt('Block reason:') ?? 'Admin action';
      await usersApi.block(u.id, reason);
    }
    load();
  };

  const handleActivate = async (id: string) => {
    await usersApi.activate(id);
    load();
  };

  const setTab = (t: FilterTab) => { setFilter(t); setPage(1); };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Users</h1>
          <p className="section-sub">{total.toLocaleString()} total</p>
        </div>
        <button onClick={load} className="btn-outline text-sm">Refresh</button>
      </div>

      {/* Search + filter tabs */}
      <div className="space-y-3">
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); applySearch(); }}>
          <input className="input max-w-xs" placeholder="Search name, email, username…"
            value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          <button type="submit" className="btn-primary">Search</button>
          {search && (
            <button type="button" className="btn-outline"
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
              Clear
            </button>
          )}
        </form>

        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'blocked', 'unverified'] as FilterTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`btn capitalize text-sm ${filter === t ? 'btn-primary' : 'btn-outline'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? <PageSpinner /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 border-b border-gray-800">
                  <tr>
                    <th className="th">User</th>
                    <th className="th">Username</th>
                    <th className="th">Phone</th>
                    <th className="th">Balance</th>
                    <th className="th">Status</th>
                    <th className="th">Joined</th>
                    <th className="th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-gray-500 py-16">No users found</td>
                    </tr>
                  ) : users.map(u => {
                    const b = statusBadge(u.isBlocked, u.verified ?? false);
                    return (
                      <tr key={u.id} className="tr-hover">
                        <td className="td">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300 uppercase flex-shrink-0">
                              {u.firstName?.[0]}{u.lastName?.[0]}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{u.firstName} {u.lastName}</div>
                              <div className="text-xs text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="td text-sm text-gray-400">@{u.userName}</td>
                        <td className="td text-sm text-gray-400">{u.phone ?? '—'}</td>
                        <td className="td font-mono text-sm text-emerald-400">
                          {u.wallet ? `${(u.wallet.balance / 100).toFixed(2)}` : '—'}
                        </td>
                        <td className="td"><Badge {...b} /></td>
                        <td className="td text-xs text-gray-500 whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="td">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Link href={`/users/${u.id}`}
                              className="text-xs text-primary-400 hover:text-primary-300 font-medium">
                              View
                            </Link>
                            {!u.verified && !u.isBlocked && (
                              <button onClick={() => handleActivate(u.id)}
                                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                                Activate
                              </button>
                            )}
                            <button onClick={() => handleBlock(u)}
                              className={`text-xs font-medium ${u.isBlocked ? 'text-emerald-400 hover:text-emerald-300' : 'text-red-400 hover:text-red-300'}`}>
                              {u.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800">
              <span className="text-sm text-gray-400">
                Page {page} of {totalPages} · {total.toLocaleString()} users
              </span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="btn-outline text-xs disabled:opacity-40">← Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="btn-outline text-xs disabled:opacity-40">Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
