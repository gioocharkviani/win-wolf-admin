'use client';

import { useEffect, useState } from 'react';
import { promotionsApi, gamesApi, categoryDefsApi, type Promotion, type AuditEntry, type Game, type CategoryDef } from '@/lib/api';
import Badge, { promoStatusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';

const PROMO_TYPES = [
  'welcome', 'no_deposit', 'free_spins', 'reload',
  'cashback', 'high_roller', 'loyalty', 'tournament',
  'birthday', 'referral', 'no_wager',
] as const;

const REWARD_TYPES = ['bonus_balance', 'real_balance', 'free_spins'] as const;

interface PromoForm {
  name: string;
  description?: string;
  type: string;
  rewardType: string;
  status?: string;
  percentage?: number;
  fixedAmount?: number;
  maxAmount?: number;
  freeSpins?: number;
  freeSpinsGameIds: string[];
  freeSpinsBetAmount?: number;
  userChoosesGame: boolean;
  eligibleCategories: string[];
  allowedGameUUIDs: string[];
  wageringMultiplier: number;
  maxWithdrawal?: number;
  maxUsagePerUser?: number;
  validityHours?: number;
  startDate?: string;
  endDate?: string;
}

const EMPTY: PromoForm = {
  name: '',
  description: '',
  type: 'welcome',
  rewardType: 'bonus_balance',
  status: 'draft',
  wageringMultiplier: 0,
  freeSpinsGameIds: [],
  userChoosesGame: false,
  eligibleCategories: [],
  allowedGameUUIDs: [],
};

function formToDto(f: PromoForm) {
  const isFs = f.type === 'free_spins';
  return {
    name: f.name,
    description: f.description || undefined,
    type: f.type,
    rewardType: f.rewardType,
    status: f.status,
    rewardValue: {
      percentage: f.percentage,
      fixedAmount: f.fixedAmount,
      maxAmount: f.maxAmount,
      freeSpins: f.freeSpins,
    },
    freeSpinsGameIds: isFs && !f.userChoosesGame ? f.freeSpinsGameIds : [],
    freeSpinsBetAmount: isFs ? f.freeSpinsBetAmount : undefined,
    userChoosesGame: isFs ? f.userChoosesGame : false,
    eligibleCategories: isFs && f.userChoosesGame ? f.eligibleCategories : [],
    allowedGameUUIDs: f.allowedGameUUIDs,
    wageringMultiplier: f.wageringMultiplier,
    maxWithdrawal: f.maxWithdrawal,
    maxUsagePerUser: f.maxUsagePerUser,
    validityHours: f.validityHours,
    startDate: f.startDate || undefined,
    endDate: f.endDate || undefined,
  };
}

function promoToForm(p: Promotion): PromoForm {
  const rv = (p as any).rewardValue ?? {};
  return {
    name: p.name,
    description: p.description,
    type: p.type,
    rewardType: p.rewardType,
    status: p.status,
    percentage: rv.percentage,
    fixedAmount: rv.fixedAmount,
    maxAmount: rv.maxAmount,
    freeSpins: rv.freeSpins,
    freeSpinsGameIds: p.freeSpinsGameIds ?? [],
    freeSpinsBetAmount: p.freeSpinsBetAmount,
    userChoosesGame: (p as any).userChoosesGame ?? false,
    eligibleCategories: (p as any).eligibleCategories ?? [],
    allowedGameUUIDs: p.allowedGameUUIDs ?? [],
    wageringMultiplier: p.wageringMultiplier ?? 0,
    maxWithdrawal: (p as any).maxWithdrawal,
    maxUsagePerUser: (p as any).maxUsagePerUser,
    validityHours: p.validityHours,
    startDate: (p as any).startDate ?? '',
    endDate: (p as any).endDate ?? '',
  };
}

const PROMO_LIMIT = 20;

export default function PromotionsPage() {
  const [promos, setPromos]       = useState<Promotion[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [games, setGames]         = useState<Game[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<'list' | 'audit'>('list');

  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<PromoForm>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [formErr, setFormErr]     = useState('');

  const [assignPromoId, setAssignPromoId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId]   = useState('');
  const [assigning, setAssigning]         = useState(false);
  const [assignMsg, setAssignMsg]         = useState('');

  const [audit, setAudit]               = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditUser, setAuditUser]       = useState('');
  const [auditPromo, setAuditPromo]     = useState('');

  const load = (pg = page) => {
    setLoading(true);
    promotionsApi.list({ page: pg, limit: PROMO_LIMIT }).then(res => {
      setPromos(res?.data ?? []);
      setTotal(res?.total ?? 0);
      setTotalPages(res?.totalPages ?? 1);
      setLoading(false);
    });
  };

  useEffect(() => {
    load(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    gamesApi.list({ limit: 500 }).then(res => setGames(res?.data ?? []));
    categoryDefsApi.list().then(res => setCategories(res?.data ?? []));
  }, []);

  const openCreate = () => {
    setForm(EMPTY);
    setEditId(null);
    setFormErr('');
    setShowForm(true);
  };

  const openEdit = (p: Promotion) => {
    setForm(promoToForm(p));
    setEditId(p.id);
    setFormErr('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormErr('');
    const dto = formToDto(form);
    let res: any;
    if (editId) {
      res = await promotionsApi.update(editId, dto);
    } else {
      res = await promotionsApi.create(dto as any);
    }
    setSaving(false);
    const err = res?.message && (res?.statusCode ?? res?.code) !== 200 ? res.message : null;
    if (err) { setFormErr(err); return; }
    setShowForm(false);
    setPage(1); load(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this promotion?')) return;
    await promotionsApi.delete(id);
    load(page);
  };

  const handleStatusToggle = async (p: Promotion) => {
    const next = p.status === 'active' ? 'paused' : 'active';
    await promotionsApi.update(p.id, { status: next } as any);
    load(page);
  };

  const handleAssign = async () => {
    if (!assignPromoId || !assignUserId.trim()) return;
    setAssigning(true);
    setAssignMsg('');
    const res: any = await promotionsApi.assign(assignPromoId, assignUserId.trim());
    setAssigning(false);
    const ok = (res?.statusCode ?? res?.code) === 200;
    setAssignMsg(ok ? '✓ Assigned successfully' : (res?.message ?? 'Assignment failed'));
    if (ok) {
      setTimeout(() => { setAssignPromoId(null); setAssignUserId(''); setAssignMsg(''); }, 1500);
    }
  };

  const loadAudit = async () => {
    setAuditLoading(true);
    const res = await promotionsApi.audit(auditPromo || undefined, auditUser || undefined);
    setAudit(res?.data ?? []);
    setAuditLoading(false);
  };

  const num = (v: string) => (v === '' ? undefined : parseFloat(v));
  const int = (v: string) => (v === '' ? undefined : parseInt(v, 10));
  const sf = <K extends keyof PromoForm>(k: K, v: PromoForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const toggleGame = (uuid: string) => {
    setForm(f => {
      const ids = f.freeSpinsGameIds.includes(uuid)
        ? f.freeSpinsGameIds.filter(x => x !== uuid)
        : [...f.freeSpinsGameIds, uuid];
      return { ...f, freeSpinsGameIds: ids };
    });
  };

  const toggleAllowedGame = (uuid: string) => {
    setForm(f => {
      const ids = f.allowedGameUUIDs.includes(uuid)
        ? f.allowedGameUUIDs.filter(x => x !== uuid)
        : [...f.allowedGameUUIDs, uuid];
      return { ...f, allowedGameUUIDs: ids };
    });
  };

  // Game picker modal state: 'freeSpins' | 'allowed' | null
  const [gamePickerMode, setGamePickerMode] = useState<'freeSpins' | 'allowed' | null>(null);
  const [gameSearch, setGameSearch] = useState('');

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Promotions</h1>
          <p className="section-sub">{total} promotions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab(tab === 'list' ? 'audit' : 'list')} className="btn-outline">
            {tab === 'list' ? 'Audit Log' : '← Promotions'}
          </button>
          {tab === 'list' && (
            <button onClick={openCreate} className="btn-primary">+ New Promotion</button>
          )}
        </div>
      </div>

      {/* ── LIST ── */}
      {tab === 'list' && (
        <div className="card p-0 overflow-hidden">
          {loading ? <PageSpinner /> : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 border-b border-gray-800">
                  <tr>
                    <th className="th">Name</th>
                    <th className="th">Type</th>
                    <th className="th">Reward</th>
                    <th className="th">Free Spins</th>
                    <th className="th">Allowed Games</th>
                    <th className="th">Wagering</th>
                    <th className="th">Status</th>
                    <th className="th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-gray-500 py-16">No promotions</td></tr>
                  ) : promos.map(p => (
                    <tr key={p.id} className="tr-hover">
                      <td className="td">
                        <div className="font-medium text-white text-sm">{p.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{p.description}</div>
                      </td>
                      <td className="td"><Badge label={p.type} variant="info" /></td>
                      <td className="td text-gray-400 text-xs">{p.rewardType}</td>
                      <td className="td text-xs text-gray-400">
                        {p.type === 'free_spins' ? (
                          <div className="space-y-1">
                            <div className="font-medium text-gray-200">{p.rewardValue?.freeSpins ?? '—'} spins</div>
                            {(p as any).userChoosesGame ? (
                              <div className="flex items-center gap-1">
                                <span className="text-emerald-400 font-medium">User picks</span>
                                {((p as any).eligibleCategories?.length ?? 0) > 0 && (
                                  <span className="text-gray-500">({(p as any).eligibleCategories.join(', ')})</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-gray-500">Admin: {(p.freeSpinsGameIds ?? []).length} game(s)</div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="td text-xs text-gray-400">
                        {(p.allowedGameUUIDs?.length ?? 0) > 0
                          ? <span className="text-amber-400 font-medium">{p.allowedGameUUIDs!.length} game(s) only</span>
                          : <span className="text-gray-600">All games</span>}
                      </td>
                      <td className="td text-gray-400">
                        {p.wageringMultiplier ? `${p.wageringMultiplier}×` : '—'}
                      </td>
                      <td className="td"><Badge {...promoStatusBadge(p.status)} /></td>
                      <td className="td">
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            onClick={() => handleStatusToggle(p)}
                            className={`text-xs font-medium ${
                              p.status === 'active'
                                ? 'text-amber-400 hover:text-amber-300'
                                : 'text-emerald-400 hover:text-emerald-300'
                            }`}
                          >
                            {p.status === 'active' ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            onClick={() => { setAssignPromoId(p.id); setAssignUserId(''); setAssignMsg(''); }}
                            className="text-xs text-primary-400 hover:text-primary-300 font-medium"
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="text-xs text-gray-400 hover:text-gray-200 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-medium"
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800">
              <span className="text-sm text-gray-400">Page {page} of {totalPages} · {total} promotions</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-outline text-xs disabled:opacity-40">← Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-outline text-xs disabled:opacity-40">Next →</button>
              </div>
            </div>
            </>
          )}
        </div>
      )}

      {/* ── AUDIT ── */}
      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex flex-wrap gap-3">
              <input className="input max-w-xs" placeholder="Promotion ID (optional)"
                value={auditPromo} onChange={e => setAuditPromo(e.target.value)} />
              <input className="input max-w-xs" placeholder="User ID (optional)"
                value={auditUser} onChange={e => setAuditUser(e.target.value)} />
              <button onClick={loadAudit} className="btn-primary" disabled={auditLoading}>
                {auditLoading ? 'Loading…' : 'Load Audit'}
              </button>
            </div>
          </div>
          {audit.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900 border-b border-gray-800">
                    <tr>
                      <th className="th">Action</th>
                      <th className="th">Promotion ID</th>
                      <th className="th">User ID</th>
                      <th className="th">Performed By</th>
                      <th className="th">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map(a => (
                      <tr key={a.id} className="tr-hover">
                        <td className="td font-medium text-white">{a.action}</td>
                        <td className="td font-mono text-xs text-gray-400">{a.promotionId ?? '—'}</td>
                        <td className="td font-mono text-xs text-gray-400">{a.userId ?? '—'}</td>
                        <td className="td font-mono text-xs text-gray-400">{a.performedBy ?? '—'}</td>
                        <td className="td text-xs text-gray-400 whitespace-nowrap">
                          {new Date(a.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showForm && (
        <Modal title={editId ? 'Edit Promotion' : 'Create Promotion'} onClose={() => setShowForm(false)}>
          <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
            {formErr && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 text-xs px-3 py-2 rounded-lg">{formErr}</div>
            )}

            <input className="input" placeholder="Name *" value={form.name}
              onChange={e => sf('name', e.target.value)} />
            <textarea className="input resize-none" rows={2} placeholder="Description"
              value={form.description ?? ''} onChange={e => sf('description', e.target.value)} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type *</label>
                <select className="input" value={form.type} onChange={e => sf('type', e.target.value)}>
                  {PROMO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Reward Type *</label>
                <select className="input" value={form.rewardType} onChange={e => sf('rewardType', e.target.value)}>
                  {REWARD_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-400 font-medium">Reward Value</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Percentage (%)</label>
                <input className="input" type="number" min="0" max="1000"
                  value={form.percentage ?? ''} onChange={e => sf('percentage', num(e.target.value))} />
              </div>
              <div>
                <label className="label">Fixed Amount</label>
                <input className="input" type="number" min="0"
                  value={form.fixedAmount ?? ''} onChange={e => sf('fixedAmount', int(e.target.value))} />
              </div>
              <div>
                <label className="label">Max Amount</label>
                <input className="input" type="number" min="0"
                  value={form.maxAmount ?? ''} onChange={e => sf('maxAmount', int(e.target.value))} />
              </div>
              <div>
                <label className="label">Free Spins Count</label>
                <input className="input" type="number" min="0"
                  value={form.freeSpins ?? ''} onChange={e => sf('freeSpins', int(e.target.value))} />
              </div>
            </div>

            {/* ── Free Spins Config ── */}
            {form.type === 'free_spins' && (
              <div className="space-y-3 border border-amber-700/40 rounded-xl p-3 bg-amber-950/10">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Free Spins Settings</p>

                {/* Bet amount */}
                <div>
                  <label className="label">Bet Amount per Spin (minor units)</label>
                  <input className="input" type="number" min="1" placeholder="e.g. 100 = $1.00"
                    value={form.freeSpinsBetAmount ?? ''}
                    onChange={e => sf('freeSpinsBetAmount', int(e.target.value))} />
                </div>

                {/* Mode toggle */}
                <div className="rounded-lg bg-gray-800 p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-300">Game Selection Mode</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => sf('userChoosesGame', false)}
                      className={`flex-1 text-xs py-2 px-3 rounded-lg font-medium transition-all border ${
                        !form.userChoosesGame
                          ? 'bg-primary-600 border-primary-500 text-white'
                          : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      Admin picks games
                    </button>
                    <button
                      type="button"
                      onClick={() => sf('userChoosesGame', true)}
                      className={`flex-1 text-xs py-2 px-3 rounded-lg font-medium transition-all border ${
                        form.userChoosesGame
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      User picks game
                    </button>
                  </div>

                  {!form.userChoosesGame ? (
                    /* ── Admin-chosen: pick specific games via modal ── */
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-gray-400">Revolver API fires immediately on assign</p>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => { setGamePickerMode('freeSpins'); setGameSearch(''); }}
                          className="btn-outline text-xs">
                          Choose Games ({form.freeSpinsGameIds.length} selected)
                        </button>
                        {form.freeSpinsGameIds.length > 0 && (
                          <button type="button" className="text-xs text-red-400 hover:text-red-300"
                            onClick={() => sf('freeSpinsGameIds', [])}>Clear all</button>
                        )}
                      </div>
                      {form.freeSpinsGameIds.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {form.freeSpinsGameIds.map(uuid => {
                            const g = games.find(x => x.gameUUID === uuid);
                            return (
                              <span key={uuid} className="inline-flex items-center gap-1 bg-primary-900/40 border border-primary-600 text-primary-300 text-xs px-2 py-1 rounded-lg">
                                {g?.gameName ?? uuid.slice(0, 8) + '…'}
                                <button type="button" onClick={() => toggleGame(uuid)} className="text-primary-400 hover:text-red-400">×</button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── User-chosen: pick eligible categories ── */
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-gray-400">
                        User picks any game from selected categories — Revolver API fires when user selects their game
                      </p>
                      <p className="text-xs font-medium text-gray-300">Eligible categories (leave empty = all slots):</p>
                      <div className="flex flex-wrap gap-2">
                        {categories.length === 0
                          ? <p className="text-xs text-gray-500">Loading categories…</p>
                          : categories.map(cat => {
                            const active = form.eligibleCategories.includes(cat.key);
                            return (
                              <button key={cat.key} type="button"
                                onClick={() => {
                                  const list = active
                                    ? form.eligibleCategories.filter(k => k !== cat.key)
                                    : [...form.eligibleCategories, cat.key];
                                  sf('eligibleCategories', list);
                                }}
                                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                                  active
                                    ? 'border-emerald-500 bg-emerald-600/20 text-emerald-300'
                                    : 'border-gray-600 text-gray-400 hover:border-gray-500'
                                }`}>
                                {cat.label}
                              </button>
                            );
                          })}
                      </div>
                      {form.eligibleCategories.length === 0 && (
                        <p className="text-xs text-amber-400/80">No category selected → user can pick any eligible game</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Allowed Games (optional game restriction via modal) ── */}
            <div className="space-y-3 border border-gray-700 rounded-xl p-3 bg-gray-800/30">
              <div>
                <p className="text-xs font-semibold text-gray-300">Game Restriction (optional)</p>
                <p className="text-xs text-gray-500 mt-0.5">If set, bonus wagering ONLY counts on these games. Leave empty = all games allowed.</p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => { setGamePickerMode('allowed'); setGameSearch(''); }}
                  className="btn-outline text-xs border-amber-600/50 text-amber-400 hover:border-amber-500">
                  Choose Restricted Games ({form.allowedGameUUIDs.length} selected)
                </button>
                {form.allowedGameUUIDs.length > 0 && (
                  <button type="button" className="text-xs text-red-400 hover:text-red-300"
                    onClick={() => sf('allowedGameUUIDs', [])}>Clear all</button>
                )}
              </div>
              {form.allowedGameUUIDs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form.allowedGameUUIDs.map(uuid => {
                    const g = games.find(x => x.gameUUID === uuid);
                    return (
                      <span key={uuid} className="inline-flex items-center gap-1 bg-amber-900/40 border border-amber-600 text-amber-300 text-xs px-2 py-1 rounded-lg">
                        {g?.gameName ?? uuid.slice(0, 8) + '…'}
                        <button type="button" onClick={() => toggleAllowedGame(uuid)} className="text-amber-400 hover:text-red-400">×</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Wagering Multiplier *</label>
                <input className="input" type="number" min="0" max="100"
                  value={form.wageringMultiplier} onChange={e => sf('wageringMultiplier', int(e.target.value) ?? 0)} />
              </div>
              <div>
                <label className="label">Max Withdrawal</label>
                <input className="input" type="number" min="0"
                  value={form.maxWithdrawal ?? ''} onChange={e => sf('maxWithdrawal', int(e.target.value))} />
              </div>
              <div>
                <label className="label">Validity (hours)</label>
                <input className="input" type="number" min="1"
                  value={form.validityHours ?? ''} onChange={e => sf('validityHours', int(e.target.value))} />
              </div>
              <div>
                <label className="label">Max Uses / User</label>
                <input className="input" type="number" min="1"
                  value={form.maxUsagePerUser ?? ''} onChange={e => sf('maxUsagePerUser', int(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start Date</label>
                <input className="input" type="datetime-local"
                  value={form.startDate ?? ''} onChange={e => sf('startDate', e.target.value)} />
              </div>
              <div>
                <label className="label">End Date</label>
                <input className="input" type="datetime-local"
                  value={form.endDate ?? ''} onChange={e => sf('endDate', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status ?? 'draft'} onChange={e => sf('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name}
                className="btn-primary flex-1">
                {saving ? 'Saving…' : (editId ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Game Picker Modal ── */}
      {gamePickerMode && (
        <Modal
          title={gamePickerMode === 'freeSpins' ? 'Select Free Spin Games' : 'Select Restricted Games'}
          onClose={() => setGamePickerMode(null)}
        >
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              {gamePickerMode === 'freeSpins'
                ? 'Select which games free spins will be applied to (Revolver API fires on assign).'
                : 'Wagering from this bonus will only count on the selected games.'}
            </p>
            <input
              className="input"
              placeholder="Search games…"
              value={gameSearch}
              onChange={e => setGameSearch(e.target.value)}
              autoFocus
            />
            <div className="text-xs text-gray-500">
              {gamePickerMode === 'freeSpins' ? form.freeSpinsGameIds.length : form.allowedGameUUIDs.length} selected
            </div>
            <div className="max-h-96 overflow-y-auto space-y-1 pr-1">
              {games
                .filter(g => !gameSearch || g.gameName.toLowerCase().includes(gameSearch.toLowerCase()) || g.gameUUID.includes(gameSearch))
                .map(g => {
                  const sel = gamePickerMode === 'freeSpins'
                    ? form.freeSpinsGameIds.includes(g.gameUUID)
                    : form.allowedGameUUIDs.includes(g.gameUUID);
                  const toggle = gamePickerMode === 'freeSpins' ? toggleGame : toggleAllowedGame;
                  const accent = gamePickerMode === 'freeSpins' ? 'border-primary-600 bg-primary-900/40' : 'border-amber-600 bg-amber-900/40';
                  const check  = gamePickerMode === 'freeSpins' ? 'accent-primary-500' : 'accent-amber-500';
                  return (
                    <label key={g.gameUUID}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        sel ? `${accent} border` : 'bg-gray-700 border border-transparent hover:border-gray-600'
                      }`}>
                      <input type="checkbox" checked={sel} onChange={() => toggle(g.gameUUID)} className={`${check} flex-shrink-0`} />
                      {g.thumbnail && (
                        <img src={g.thumbnail} alt="" className="w-8 h-8 rounded-md object-cover bg-gray-600 flex-shrink-0"
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-gray-200 truncate">{g.gameName}</div>
                        <div className="text-xs text-gray-500 font-mono truncate">{g.provider?.name ?? ''} · {g.gameUUID}</div>
                      </div>
                      {sel && <span className="ml-auto text-emerald-400 text-xs flex-shrink-0">✓</span>}
                    </label>
                  );
                })}
            </div>
            <div className="flex gap-3 pt-2 border-t border-gray-700">
              <button
                type="button"
                onClick={() => { gamePickerMode === 'freeSpins' ? sf('freeSpinsGameIds', []) : sf('allowedGameUUIDs', []); }}
                className="btn-outline text-xs text-red-400 border-red-700/50 hover:border-red-500"
              >
                Clear all
              </button>
              <button onClick={() => setGamePickerMode(null)} className="btn-primary flex-1">
                Done ({gamePickerMode === 'freeSpins' ? form.freeSpinsGameIds.length : form.allowedGameUUIDs.length} selected)
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Assign Modal ── */}
      {assignPromoId && (
        <Modal title="Assign Promotion to User" onClose={() => { setAssignPromoId(null); setAssignMsg(''); }}>
          <div className="space-y-3">
            <div className="text-xs text-gray-400 font-mono bg-gray-800 rounded-lg px-3 py-2">
              Promotion ID: {assignPromoId}
            </div>
            {assignMsg && (
              <div className={`text-sm px-3 py-2 rounded-lg ${
                assignMsg.startsWith('✓')
                  ? 'bg-emerald-900/30 text-emerald-400'
                  : 'bg-red-900/30 text-red-400'
              }`}>
                {assignMsg}
              </div>
            )}
            <input className="input" placeholder="User ID (UUID)"
              value={assignUserId} onChange={e => setAssignUserId(e.target.value)} />
            {(() => {
              const p = promos.find(x => x.id === assignPromoId);
              if (p?.type !== 'free_spins') return null;
              return (p as any).userChoosesGame ? (
                <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg px-3 py-2 text-xs text-emerald-300 space-y-1">
                  <p className="font-semibold">User-choice free spins</p>
                  <p>The user will be prompted to pick a game. Revolver Gaming GAP will only be called when the user makes their selection.</p>
                  {((p as any).eligibleCategories?.length ?? 0) > 0 && (
                    <p>Eligible categories: <span className="font-medium">{(p as any).eligibleCategories.join(', ')}</span></p>
                  )}
                </div>
              ) : (
                <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg px-3 py-2 text-xs text-amber-300">
                  Admin-chosen free spins — Revolver Gaming GAP will be called immediately for {(p?.freeSpinsGameIds ?? []).length} selected game(s).
                </div>
              );
            })()}
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setAssignPromoId(null); setAssignMsg(''); }} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleAssign} disabled={assigning || !assignUserId.trim()}
                className="btn-primary flex-1">
                {assigning ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
