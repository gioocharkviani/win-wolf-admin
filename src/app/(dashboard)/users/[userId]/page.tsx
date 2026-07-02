'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usersApi, wageringApi, type User, type Transaction, type UserBonus, type WageringEntry } from '@/lib/api';
import Badge, { statusBadge, txTypeBadge, txStatusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';

interface EditProfileForm {
  firstName: string; lastName: string; email: string;
  phone: string; userName: string; birthday: string;
}

export default function UserDetailPage({ params }: { params: { userId: string } }) {
  const { userId } = params;

  const [user, setUser]             = useState<User | null>(null);
  const [txs, setTxs]               = useState<Transaction[]>([]);
  const [bonuses, setBonuses]       = useState<UserBonus[]>([]);
  const [wagering, setWagering]     = useState<WageringEntry[]>([]);
  const [loading, setLoading]       = useState(true);

  // balance adjustment
  const [adjAmount, setAdjAmount] = useState('');
  const [adjType, setAdjType]     = useState<'credit' | 'debit'>('credit');
  const [adjReason, setAdjReason] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);
  const [adjMsg, setAdjMsg]       = useState('');

  // personal ID
  const [pidValue, setPidValue]   = useState('');
  const [pidSaving, setPidSaving] = useState(false);

  // edit profile modal
  const [showEdit, setShowEdit]     = useState(false);
  const [editForm, setEditForm]     = useState<EditProfileForm>({ firstName: '', lastName: '', email: '', phone: '', userName: '', birthday: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg]       = useState('');

  // bonus action state
  const [bonusMsg, setBonusMsg]       = useState('');
  const [chooseGameId, setChooseGameId] = useState<string | null>(null);
  const [gameUUID, setGameUUID]         = useState('');
  const [eligibleGames, setEligibleGames] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    const [uRes, tRes, bRes, wRes] = await Promise.all([
      usersApi.getById(userId),
      usersApi.transactions(userId),
      usersApi.bonuses(userId),
      wageringApi.getForUser(userId),
    ]);
    const u = uRes?.data ?? null;
    setUser(u);
    setTxs(tRes?.data ?? []);
    setBonuses(bRes?.data ?? []);
    setWagering(wRes?.data ?? []);
    setPidValue(u?.personalId ?? '');
    if (u) {
      setEditForm({
        firstName: u.firstName ?? '',
        lastName:  u.lastName  ?? '',
        email:     u.email     ?? '',
        phone:     u.phone     ?? '',
        userName:  u.userName  ?? '',
        birthday:  u.birthday  ? u.birthday.slice(0, 10) : '',
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const handleBlock = async () => {
    if (!user) return;
    if (user.isBlocked) { await usersApi.unblock(userId); }
    else { const r = prompt('Block reason:') ?? 'Admin action'; await usersApi.block(userId, r); }
    load();
  };

  const handleActivate = async () => { await usersApi.activate(userId); load(); };

  const handleAdjust = async () => {
    if (!adjAmount || !adjReason) return;
    setAdjSaving(true);
    const res = await usersApi.adjustBalance(userId, parseFloat(adjAmount), adjType, adjReason);
    setAdjSaving(false);
    setAdjMsg(res?.message ?? (res?.code === 200 ? 'Done' : 'Error'));
    setAdjAmount(''); setAdjReason('');
    setTimeout(() => setAdjMsg(''), 3000);
    load();
  };

  const handleSetPid = async () => {
    if (!pidValue.trim()) return;
    setPidSaving(true);
    await usersApi.setPersonalId(userId, pidValue.trim());
    setPidSaving(false); load();
  };

  const handleSaveProfile = async () => {
    setEditSaving(true); setEditMsg('');
    const res = await usersApi.update(userId, {
      firstName: editForm.firstName || undefined,
      lastName:  editForm.lastName  || undefined,
      email:     editForm.email     || undefined,
      phone:     editForm.phone     || undefined,
      userName:  editForm.userName  || undefined,
      birthday:  editForm.birthday  || undefined,
    });
    setEditSaving(false);
    if (res?.code === 200) { setEditMsg('Saved!'); setTimeout(() => { setEditMsg(''); setShowEdit(false); load(); }, 1000); }
    else { setEditMsg(res?.message ?? 'Error saving'); }
  };

  const handleCancelBonus = async (id: string) => {
    const { promotionsApi } = await import('@/lib/api');
    await promotionsApi.cancelBonus(id);
    load();
  };

  const handleActivateBonus = async (bonusId: string) => {
    setBonusMsg('');
    const res = await usersApi.activateBonus(userId, bonusId);
    setBonusMsg(res?.message ?? (res?.code === 200 ? 'Bonus activated!' : 'Error'));
    setTimeout(() => setBonusMsg(''), 3000);
    load();
  };

  const handleOpenChooseGame = async (bonusId: string) => {
    setChooseGameId(bonusId); setGameUUID('');
    const res = await usersApi.eligibleGames(userId, bonusId);
    setEligibleGames(res?.data?.freeSpinsGameIds ?? []);
  };

  const handleChooseGame = async () => {
    if (!chooseGameId || !gameUUID.trim()) return;
    const res = await usersApi.chooseGameForUser(userId, chooseGameId, gameUUID.trim());
    setBonusMsg(res?.message ?? (res?.code === 200 ? 'Game chosen and free spins sent!' : 'Error'));
    setTimeout(() => setBonusMsg(''), 4000);
    setChooseGameId(null); setGameUUID(''); load();
  };

  if (loading) return <PageSpinner />;
  if (!user)   return <div className="p-8 text-red-400">User not found.</div>;

  const sb = statusBadge(user.isBlocked, user.verified ?? false);

  return (
    <div className="p-8 space-y-6">
      <Link href="/users" className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1">← Users</Link>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-16 h-16 bg-gray-700 rounded-2xl flex items-center justify-center text-2xl font-bold text-gray-300 uppercase flex-shrink-0">
          {user.firstName[0]}{user.lastName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">{user.firstName} {user.lastName}</h1>
          <div className="text-gray-400 text-sm mt-0.5">@{user.userName} · {user.email}</div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge {...sb} />
            {user.citizenship && <Badge label={user.citizenship} variant="gray" />}
            {user.country?.currency && <Badge label={user.country.currency} variant="info" />}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <button onClick={() => setShowEdit(true)} className="btn-outline text-xs">Edit Profile</button>
          {!user.verified && <button onClick={handleActivate} className="btn-success text-xs">Activate</button>}
          <button onClick={handleBlock} className={user.isBlocked ? 'btn-success text-xs' : 'btn-danger text-xs'}>
            {user.isBlocked ? 'Unblock' : 'Block'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Info card */}
        <div className="card space-y-1">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account</h2>
          {([
            ['ID',          user.id],
            ['Phone',       user.phone     ?? '—'],
            ['Birthday',    user.birthday ? new Date(user.birthday).toLocaleDateString() : '—'],
            ['Citizenship', user.citizenship ?? '—'],
            ['XP',          String(user.xp ?? 0)],
            ['Block reason',user.blockReason ?? '—'],
            ['Joined',      new Date(user.createdAt).toLocaleDateString()],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="flex justify-between items-start py-1.5 border-b border-gray-800 last:border-0 gap-2">
              <span className="text-xs text-gray-500 flex-shrink-0">{k}</span>
              <span className="text-xs text-gray-200 font-mono text-right break-all">{v}</span>
            </div>
          ))}
          <div className="pt-3">
            <label className="label">Personal ID</label>
            <div className="flex gap-2">
              <input className="input text-xs" value={pidValue} onChange={e => setPidValue(e.target.value)} placeholder="National ID number" />
              <button onClick={handleSetPid} disabled={pidSaving} className="btn-primary text-xs flex-shrink-0">{pidSaving ? '…' : 'Set'}</button>
            </div>
          </div>
        </div>

        {/* Wallet + adjust */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Wallet</h2>
            <div className="text-3xl font-bold text-emerald-400">
              {user.wallet ? `${(user.wallet.balance / 100).toFixed(2)} TRY` : '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Currency: {user.wallet?.currency ?? 'TRY'}</div>
          </div>

          <div className="card space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Adjust Balance</h2>
            {adjMsg && <div className="text-sm text-emerald-400 bg-emerald-900/30 rounded-lg px-3 py-2">{adjMsg}</div>}
            <div className="flex gap-2">
              <button onClick={() => setAdjType('credit')} className={`btn flex-1 text-xs ${adjType === 'credit' ? 'btn-success' : 'btn-outline'}`}>Credit</button>
              <button onClick={() => setAdjType('debit')}  className={`btn flex-1 text-xs ${adjType === 'debit'  ? 'btn-danger'  : 'btn-outline'}`}>Debit</button>
            </div>
            <input className="input" type="number" min="0" placeholder="Amount (TRY)" value={adjAmount} onChange={e => setAdjAmount(e.target.value)} />
            <input className="input" placeholder="Reason (required)" value={adjReason} onChange={e => setAdjReason(e.target.value)} />
            <button onClick={handleAdjust} disabled={adjSaving || !adjAmount || !adjReason} className="btn-primary w-full justify-center">
              {adjSaving ? 'Applying…' : 'Apply Adjustment'}
            </button>
          </div>
        </div>

        {/* Active Bonus Wagering */}
        {wagering.filter(w => w.status === 'active' || w.status === 'assigned').length > 0 && (
          <div className="card space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Bonus Wagering</h2>
            <div className="space-y-3">
              {wagering.filter(w => w.status === 'active' || w.status === 'assigned').map(w => {
                const pct = Number(w.wageringRequired) > 0
                  ? Math.min(100, Math.round((Number(w.wageringCompleted) / Number(w.wageringRequired)) * 100))
                  : 100;
                return (
                  <div key={w.id} className="bg-gray-800 rounded-lg p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{w.promotion?.name ?? 'Bonus'}</span>
                      <span className="text-gray-500 capitalize">{w.status}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-gray-400">
                        <span>Wagering progress</span>
                        <span className="text-white font-medium">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>{(Number(w.wageringCompleted) / 100).toFixed(2)} done</span>
                        <span>{(Number(w.wageringRequired) / 100).toFixed(2)} required</span>
                      </div>
                    </div>
                    {w.expiresAt && (
                      <div className="text-gray-500">Expires: {new Date(w.expiresAt).toLocaleString()}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bonuses */}
        <div className="card">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bonuses ({bonuses.length})</h2>
          {bonusMsg && <div className="text-sm text-emerald-400 bg-emerald-900/30 rounded-lg px-3 py-2 mb-3">{bonusMsg}</div>}
          {bonuses.length === 0 ? (
            <div className="text-sm text-gray-500">No bonuses</div>
          ) : (
            <div className="space-y-3">
              {bonuses.map(b => (
                <div key={b.id} className="bg-gray-800 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-gray-200">{b.promotion?.name ?? 'Bonus'}</div>
                    <Badge label={b.status} variant={b.status === 'ACTIVE' ? 'success' : 'warning'} />
                  </div>
                  <div className="text-gray-400">Type: <span className="text-gray-200 capitalize">{b.promotion?.type}</span></div>
                  {b.bonusBalance !== undefined && (
                    <div className="text-gray-400">Bonus balance: <span className="text-yellow-400 font-mono">{(Number(b.bonusBalance) / 100).toFixed(2)}</span></div>
                  )}
                  {Number(b.wageringRequired) > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <div className="flex justify-between text-gray-400">
                        <span>Wagering</span>
                        <span className="text-white font-medium">
                          {Math.min(100, Math.round((Number(b.wageringCompleted) / Number(b.wageringRequired)) * 100))}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.round((Number(b.wageringCompleted) / Number(b.wageringRequired)) * 100))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-gray-500 text-[10px]">
                        <span>{(Number(b.wageringCompleted) / 100).toFixed(2)} done</span>
                        <span>{(Number(b.wageringRequired) / 100).toFixed(2)} required</span>
                      </div>
                    </div>
                  )}
                  {b.expiresAt && <div className="text-gray-500">Expires: {new Date(b.expiresAt).toLocaleString()}</div>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {b.status === 'PENDING' && (
                      <button onClick={() => handleActivateBonus(b.id)} className="text-emerald-400 hover:text-emerald-300">
                        Activate for user
                      </button>
                    )}
                    {b.status === 'PENDING' && b.promotion?.userChoosesGame && (
                      <button onClick={() => handleOpenChooseGame(b.id)} className="text-blue-400 hover:text-blue-300">
                        Choose game
                      </button>
                    )}
                    <button onClick={() => handleCancelBonus(b.id)} className="text-red-400 hover:text-red-300">
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">Transactions ({txs.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-800">
              <tr>
                <th className="th">Type</th><th className="th">Amount</th><th className="th">Before</th>
                <th className="th">After</th><th className="th">Status</th><th className="th">Game</th>
                <th className="th">Round</th><th className="th">Reason</th><th className="th">Date</th>
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-gray-500 py-12">No transactions</td></tr>
              ) : txs.map(tx => (
                <tr key={tx.id} className="tr-hover">
                  <td className="td"><Badge {...txTypeBadge(tx.type)} /></td>
                  <td className="td font-mono font-medium">{tx.amount !== undefined ? (tx.amount / 100).toFixed(2) : '—'}</td>
                  <td className="td font-mono text-xs text-gray-400">{tx.balanceBefore !== undefined ? (tx.balanceBefore / 100).toFixed(2) : '—'}</td>
                  <td className="td font-mono text-xs text-gray-400">{tx.balanceAfter  !== undefined ? (tx.balanceAfter  / 100).toFixed(2) : '—'}</td>
                  <td className="td"><Badge {...txStatusBadge(tx.status)} /></td>
                  <td className="td text-xs text-gray-500">{tx.game?.gameName ?? '—'}</td>
                  <td className="td font-mono text-xs text-gray-500 max-w-[80px] truncate">{tx.roundId ?? '—'}</td>
                  <td className="td text-xs text-gray-500 max-w-[120px] truncate">{tx.reason ?? '—'}</td>
                  <td className="td text-xs text-gray-400 whitespace-nowrap">{new Date(tx.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
            {editMsg && <div className={`text-sm rounded-lg px-3 py-2 ${editMsg === 'Saved!' ? 'text-emerald-400 bg-emerald-900/30' : 'text-red-400 bg-red-900/30'}`}>{editMsg}</div>}
            {([
              ['First name', 'firstName'],
              ['Last name',  'lastName'],
              ['Email',      'email'],
              ['Phone',      'phone'],
              ['Username',   'userName'],
            ] as [string, keyof EditProfileForm][]).map(([label, key]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input className="input" value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="label">Birthday</label>
              <input type="date" className="input" value={editForm.birthday}
                onChange={e => setEditForm(f => ({ ...f, birthday: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSaveProfile} disabled={editSaving} className="btn-primary flex-1 justify-center">
                {editSaving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setShowEdit(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Choose Game Modal */}
      {chooseGameId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-white">Choose Game for User</h2>
            <p className="text-sm text-gray-400">Enter a game UUID to activate free spins on behalf of the user.</p>
            {eligibleGames.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Eligible game UUIDs:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {eligibleGames.map(g => (
                    <button key={g} onClick={() => setGameUUID(g)}
                      className={`block w-full text-left text-xs font-mono px-3 py-1.5 rounded-lg ${gameUUID === g ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="label">Game UUID</label>
              <input className="input font-mono text-xs" value={gameUUID} onChange={e => setGameUUID(e.target.value)} placeholder="Game UUID" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleChooseGame} disabled={!gameUUID.trim()} className="btn-primary flex-1 justify-center">Activate</button>
              <button onClick={() => setChooseGameId(null)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
