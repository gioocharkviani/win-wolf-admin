'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { withdrawalsApi, type Transaction } from '@/lib/api';
import Badge, { txStatusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';

const STATUS_TABS = [
  { key: 'PENDING',    label: 'Pending Approval' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'SUCCEEDED',  label: 'Succeeded' },
  { key: 'FAILD',      label: 'Failed' },
  { key: '',           label: 'All' },
];

const LIMIT = 50;

function fmt(n?: number) {
  if (n === undefined || n === null) return '—';
  return '₺' + (Number(n) / 100).toFixed(2);
}

function parseIban(reason?: string): string {
  if (!reason) return '—';
  const match = reason.match(/iban:([^|]+)/);
  return match ? match[1] : '—';
}

function parseHolder(reason?: string): string {
  if (!reason) return '—';
  const match = reason.match(/holder:([^|]+)/);
  return match ? match[1] : '—';
}

type ActionState = { id: string; action: 'approve' | 'reject' } | null;

export default function WithdrawalsPage() {
  const [txs, setTxs]               = useState<Transaction[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [statusTab, setStatusTab]   = useState('PENDING');
  const [actionState, setActionState] = useState<ActionState>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await withdrawalsApi.list({ page, limit: LIMIT, status: statusTab || undefined });
    setTxs(res?.data ?? []);
    setTotal(res?.total ?? 0);
    setTotalPages(res?.totalPages ?? 1);
    setLoading(false);
  }, [page, statusTab]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleApprove = async (tx: Transaction) => {
    setActionState({ id: tx.id, action: 'approve' });
  };

  const handleReject = async (tx: Transaction) => {
    setActionState({ id: tx.id, action: 'reject' });
    setRejectReason('');
  };

  const confirmAction = async () => {
    if (!actionState) return;
    setProcessing(true);
    try {
      let res: any;
      if (actionState.action === 'approve') {
        res = await withdrawalsApi.approve(actionState.id);
      } else {
        res = await withdrawalsApi.reject(actionState.id, rejectReason || 'Rejected by admin');
      }
      const ok = res?.code === 200 || res?.statusCode === 200;
      showToast(res?.message ?? (ok ? 'Done' : 'Failed'), ok);
      if (ok) load();
    } finally {
      setProcessing(false);
      setActionState(null);
    }
  };

  const pendingCount = statusTab === 'PENDING' ? total : null;

  return (
    <div className="p-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium transition-all
          ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Withdrawals</h1>
          <p className="section-sub">
            {pendingCount !== null
              ? <span className="text-amber-400 font-semibold">{pendingCount} pending approval</span>
              : `${total.toLocaleString()} withdrawals`
            }
          </p>
        </div>
        <button onClick={load} className="btn-outline text-sm">Refresh</button>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => { setStatusTab(t.key); setPage(1); }}
            className={`btn text-xs ${statusTab === t.key ? 'btn-primary' : 'btn-outline'}`}>
            {t.label}
          </button>
        ))}
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
                    <th className="th">Amount</th>
                    <th className="th">IBAN</th>
                    <th className="th">Holder</th>
                    <th className="th">Status</th>
                    <th className="th">Date</th>
                    {statusTab === 'PENDING' && <th className="th">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {txs.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-gray-500 py-16">No withdrawals found</td></tr>
                  ) : txs.map(tx => (
                    <tr key={tx.id} className="tr-hover">
                      <td className="td">
                        <Link href={`/users/${tx.userId}`}
                          className="text-primary-400 hover:text-primary-300 font-mono text-xs">
                          {tx.userId?.slice(0, 12)}…
                        </Link>
                      </td>
                      <td className="td font-mono font-bold text-white text-base">{fmt(tx.amount)}</td>
                      <td className="td font-mono text-xs text-gray-300">{parseIban(tx.reason)}</td>
                      <td className="td text-sm text-gray-400">{parseHolder(tx.reason)}</td>
                      <td className="td"><Badge {...txStatusBadge(tx.status ?? '')} /></td>
                      <td className="td text-xs text-gray-500 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      {statusTab === 'PENDING' && (
                        <td className="td">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleApprove(tx)}
                              className="btn text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg font-medium">
                              Approve
                            </button>
                            <button onClick={() => handleReject(tx)}
                              className="btn text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 px-3 py-1 rounded-lg font-medium">
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800">
              <span className="text-sm text-gray-400">Page {page} of {totalPages} · {total.toLocaleString()} total</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-outline text-xs disabled:opacity-40">← Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-outline text-xs disabled:opacity-40">Next →</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirm modal */}
      {actionState && (
        <Modal
          title={actionState.action === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
          onClose={() => setActionState(null)}
        >
          <div className="space-y-4">
            {actionState.action === 'approve' ? (
              <p className="text-gray-300 text-sm">
                This will send the withdrawal to the payment provider and deduct from the user&apos;s balance.
                Are you sure?
              </p>
            ) : (
              <>
                <p className="text-gray-300 text-sm">
                  The user&apos;s balance will be refunded. Please provide a reason:
                </p>
                <textarea
                  className="input w-full h-24 resize-none"
                  placeholder="Reason for rejection…"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              </>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setActionState(null)} className="btn-outline">Cancel</button>
              <button
                onClick={confirmAction}
                disabled={processing}
                className={`btn text-white font-medium px-5 py-2 rounded-lg disabled:opacity-50
                  ${actionState.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
              >
                {processing ? 'Processing…' : actionState.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
