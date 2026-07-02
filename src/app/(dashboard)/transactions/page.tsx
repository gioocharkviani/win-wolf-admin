'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { platformApi, type Transaction } from '@/lib/api';
import Badge, { txTypeBadge, txStatusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';

const TX_TYPES    = ['', 'deposit', 'withdrawal', 'credit', 'debit', 'bonus', 'rollback', 'adjustment'];
const TX_STATUSES = ['', 'PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILD'];
const LIMIT = 50;

function fmt(n?: number) {
  if (n === undefined || n === null) return '—';
  return (Number(n) / 100).toFixed(2);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-gray-800 last:border-0">
      <span className="text-gray-500 text-sm flex-shrink-0 w-36">{label}</span>
      <span className="text-gray-100 text-sm text-right break-all font-mono">{value ?? '—'}</span>
    </div>
  );
}

function TransactionModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const typeBadge   = txTypeBadge(tx.type);
  const statusBadge = txStatusBadge(tx.status);

  return (
    <Modal title="Transaction Detail" onClose={onClose}>
      <div className="space-y-1 max-h-[75vh] overflow-y-auto pr-1">

        {/* Header badges */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-800 mb-1">
          <Badge {...typeBadge} />
          <Badge {...statusBadge} />
          <span className="text-2xl font-bold text-white font-mono ml-auto">
            {fmt(tx.amount)}
          </span>
        </div>

        <Row label="Transaction ID"  value={tx.id} />
        <Row label="Internal Tx ID"  value={tx.transactionId} />
        <Row label="User ID"         value={
          tx.userId
            ? <Link href={`/users/${tx.userId}`} className="text-primary-400 hover:text-primary-300">{tx.userId}</Link>
            : '—'
        } />
        <Row label="Type"            value={tx.type} />
        <Row label="Status"          value={tx.status} />
        <Row label="Amount"          value={`${fmt(tx.amount)}`} />
        <Row label="Balance Before"  value={fmt(tx.balanceBefore)} />
        <Row label="Balance After"   value={fmt(tx.balanceAfter)} />
        <Row label="Payment ID"      value={tx.paymentId} />
        <Row label="Round ID"        value={tx.roundId} />
        <Row label="Game Session"    value={tx.gameSessionId} />
        <Row label="Game"            value={tx.game?.gameName} />
        <Row label="Game UUID"       value={tx.gameId} />
        <Row label="Reason"          value={tx.reason} />
        <Row label="Date"            value={new Date(tx.createdAt).toLocaleString()} />
      </div>
    </Modal>
  );
}

export default function TransactionsPage() {
  const [txs, setTxs]               = useState<Transaction[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Transaction | null>(null);

  const [typeFilter, setTypeFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter]     = useState('');
  const [userInput, setUserInput]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await platformApi.allTransactions({
      page,
      limit: LIMIT,
      type:   typeFilter   || undefined,
      status: statusFilter || undefined,
      userId: userFilter   || undefined,
    });
    setTxs(res?.data ?? []);
    setTotal(res?.total ?? 0);
    setTotalPages(res?.totalPages ?? 1);
    setLoading(false);
  }, [page, typeFilter, statusFilter, userFilter]);

  useEffect(() => { load(); }, [load]);

  const applyUserFilter = () => { setPage(1); setUserFilter(userInput.trim()); };
  const clearFilters    = () => { setPage(1); setTypeFilter(''); setStatusFilter(''); setUserFilter(''); setUserInput(''); };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Transactions</h1>
          <p className="section-sub">{total.toLocaleString()} total</p>
        </div>
        <button onClick={() => { setPage(1); load(); }} className="btn-outline text-sm">Refresh</button>
      </div>

      {/* Filters */}
      <div className="card space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2 flex-1 min-w-[260px]">
            <input
              className="input flex-1"
              placeholder="Filter by User ID…"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyUserFilter()}
            />
            <button onClick={applyUserFilter} className="btn-primary flex-shrink-0">Filter</button>
            {(typeFilter || statusFilter || userFilter) && (
              <button onClick={clearFilters} className="btn-outline flex-shrink-0">Clear</button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 self-center mr-1">Type:</span>
          {TX_TYPES.map(t => (
            <button key={t} onClick={() => { setPage(1); setTypeFilter(t); }}
              className={`btn text-xs uppercase ${typeFilter === t ? 'btn-primary' : 'btn-outline'}`}>
              {t || 'All'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 self-center mr-1">Status:</span>
          {TX_STATUSES.map(s => (
            <button key={s} onClick={() => { setPage(1); setStatusFilter(s); }}
              className={`btn text-xs ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}>
              {s || 'All'}
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
                    <th className="th">Type</th>
                    <th className="th">Amount</th>
                    <th className="th">Status</th>
                    <th className="th">User ID</th>
                    <th className="th">Bal. Before</th>
                    <th className="th">Bal. After</th>
                    <th className="th">Game</th>
                    <th className="th">Payment ID</th>
                    <th className="th">Reason</th>
                    <th className="th">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.length === 0 ? (
                    <tr><td colSpan={10} className="text-center text-gray-500 py-16">No transactions found</td></tr>
                  ) : txs.map(tx => (
                    <tr
                      key={tx.id}
                      className="tr-hover cursor-pointer"
                      onClick={() => setSelected(tx)}
                    >
                      <td className="td"><Badge {...txTypeBadge(tx.type)} /></td>
                      <td className="td font-mono font-medium text-white">{fmt(tx.amount)}</td>
                      <td className="td"><Badge {...txStatusBadge(tx.status)} /></td>
                      <td className="td font-mono text-xs text-gray-400">{tx.userId?.slice(0, 16)}…</td>
                      <td className="td font-mono text-xs text-gray-400">{fmt(tx.balanceBefore)}</td>
                      <td className="td font-mono text-xs text-gray-400">{fmt(tx.balanceAfter)}</td>
                      <td className="td text-xs text-gray-500">{tx.game?.gameName ?? '—'}</td>
                      <td className="td font-mono text-xs text-gray-500 max-w-[100px] truncate">{tx.paymentId ?? '—'}</td>
                      <td className="td text-xs text-gray-500 max-w-[120px] truncate">{tx.reason ?? '—'}</td>
                      <td className="td text-xs text-gray-400 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800">
              <span className="text-sm text-gray-400">
                Page {page} of {totalPages} · {total.toLocaleString()} transactions
              </span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-outline text-xs disabled:opacity-40">← Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-outline text-xs disabled:opacity-40">Next →</button>
              </div>
            </div>
          </>
        )}
      </div>

      {selected && <TransactionModal tx={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
