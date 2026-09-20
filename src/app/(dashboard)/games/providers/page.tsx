'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { platformApi, providersApi, type Provider } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Provider | null>(null);
  const [resultMsg, setResultMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    platformApi.providers()
      .then(res => setProviders(res?.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (p: Provider) => {
    setBusy(p.id);
    try {
      if (p.isActive) {
        await providersApi.hide(p.id);
      } else {
        await providersApi.show(p.id);
      }
      load();
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(deleteTarget.id);
    try {
      const res = await providersApi.delete(deleteTarget.id);
      setResultMsg((res as any)?.message ?? 'Provider deleted');
      load();
    } finally {
      setBusy(null);
      setDeleteTarget(null);
    }
  };

  const activeCount = providers.filter(p => p.isActive).length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/games" className="hover:text-gray-300">Games</Link>
            <span>/</span>
            <span className="text-gray-400">Providers</span>
          </div>
          <h1 className="section-title">Providers</h1>
          <p className="section-sub">{providers.length} total · {activeCount} visible to players</p>
        </div>
        <Link href="/games" className="btn-outline text-sm">← Back to Games</Link>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : providers.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-500">No providers synced yet — go to Games and run a sync from Revolver or NuxGame.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-800">
                <tr>
                  <th className="th">Provider</th>
                  <th className="th">Prefix</th>
                  <th className="th">Games</th>
                  <th className="th">Status</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {providers.map(p => (
                  <tr key={p.id} className="tr-hover">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        {p.logo && (
                          <img
                            src={p.logo}
                            alt={p.name}
                            className="h-7 w-7 rounded object-contain bg-gray-800 flex-shrink-0"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <span className="font-medium text-white text-sm">{p.name}</span>
                      </div>
                    </td>
                    <td className="td text-xs text-gray-500 font-mono">{p.prefix}</td>
                    <td className="td text-sm text-gray-400">
                      <Link href={`/games?provider=${encodeURIComponent(p.name)}`} className="hover:text-primary-400">
                        View games →
                      </Link>
                    </td>
                    <td className="td">
                      <Badge label={p.isActive ? 'Visible' : 'Hidden'} variant={p.isActive ? 'success' : 'gray'} />
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggle(p)}
                          disabled={busy === p.id}
                          className={`text-xs font-medium disabled:opacity-40 ${
                            p.isActive ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'
                          }`}
                        >
                          {p.isActive ? 'Hide' : 'Show'}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          disabled={busy === p.id}
                          className="text-xs font-medium text-red-500 hover:text-red-400 disabled:opacity-40"
                        >
                          Delete
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

      {resultMsg && (
        <div className="card text-sm text-amber-300 flex items-center justify-between">
          <span>{resultMsg}</span>
          <button className="text-gray-500 hover:text-gray-300 flex-shrink-0 ml-3" onClick={() => setResultMsg('')}>Dismiss</button>
        </div>
      )}

      {deleteTarget && (
        <Modal title={`Delete "${deleteTarget.name}"?`} onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              This deletes the provider and every one of its games. Games with existing transaction/betting
              history can&apos;t be safely removed — those will be hidden instead of deleted, and if any are,
              the provider itself will only be hidden (not removed) so nothing silently disappears.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="btn-primary bg-red-600 hover:bg-red-500 border-red-600"
                onClick={handleDelete}
                disabled={busy === deleteTarget.id}
              >
                {busy === deleteTarget.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
