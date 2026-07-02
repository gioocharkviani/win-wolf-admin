'use client';

import { useEffect, useState } from 'react';
import { adminsApi, type Admin, type CreateAdminBody } from '@/lib/api';
import { getMe, isSuperAdmin } from '@/lib/auth';
import Badge from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';

const ROLE_VARIANT: Record<string, 'purple' | 'info' | 'gray'> = {
  super_admin: 'purple',
  admin:       'info',
  moderator:   'gray',
};

const EMPTY: CreateAdminBody = {
  username: '', email: '', password: '',
  firstName: '', lastName: '', role: 'moderator',
};

export default function AdminsPage() {
  const [admins, setAdmins]   = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe]           = useState<Admin | null>(null);
  const [superAdmin, setSuperAdmin] = useState(false);

  // create
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState<CreateAdminBody>(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');

  // edit
  const [editAdmin, setEditAdmin] = useState<Admin | null>(null);
  const [editForm, setEditForm]   = useState({ email: '', firstName: '', lastName: '', role: '', newPassword: '' });
  const [editSaving, setEditSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminsApi.list().then(res => {
      setAdmins(res?.data ?? []);
      setLoading(false);
    });
  };

  useEffect(() => {
    setMe(getMe());
    setSuperAdmin(isSuperAdmin());
    load();
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    setErr('');
    const res = await adminsApi.create(form);
    setSaving(false);
    if (res?.statusCode === 200) {
      setShowCreate(false);
      setForm(EMPTY);
      load();
    } else {
      setErr(res?.message ?? 'Error creating admin');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this admin?')) return;
    await adminsApi.deactivate(id);
    load();
  };

  const openEdit = (a: Admin) => {
    setEditAdmin(a);
    setEditForm({ email: a.email, firstName: a.firstName ?? '', lastName: a.lastName ?? '', role: a.role, newPassword: '' });
  };

  const handleEdit = async () => {
    if (!editAdmin) return;
    setEditSaving(true);
    const body: Record<string, string> = {
      email: editForm.email,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      role: editForm.role,
    };
    if (editForm.newPassword) body.newPassword = editForm.newPassword;
    await adminsApi.update(editAdmin.id, body);
    setEditSaving(false);
    setEditAdmin(null);
    load();
  };

  const setField = <K extends keyof CreateAdminBody>(k: K, v: CreateAdminBody[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Admin Management</h1>
          <p className="section-sub">{admins.length} admins</p>
        </div>
        {superAdmin && (
          <button onClick={() => { setShowCreate(true); setErr(''); setForm(EMPTY); }} className="btn-primary">
            + New Admin
          </button>
        )}
      </div>

      {!superAdmin && (
        <div className="bg-amber-900/30 border border-amber-700 text-amber-300 text-sm px-4 py-3 rounded-lg">
          Only super_admins can create or deactivate accounts. You can still view the list.
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-800">
                <tr>
                  <th className="th">Admin</th>
                  <th className="th">Email</th>
                  <th className="th">Role</th>
                  <th className="th">Status</th>
                  <th className="th">Created</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(a => (
                  <tr
                    key={a.id}
                    className={`tr-hover ${a.id === me?.id ? 'bg-primary-600/5' : ''}`}
                  >
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300 uppercase flex-shrink-0">
                          {a.username[0]}
                        </div>
                        <div>
                          <div className="font-medium text-white text-sm">
                            {a.username}
                            {a.id === me?.id && <span className="ml-2 text-xs text-primary-400">(you)</span>}
                          </div>
                          <div className="text-xs text-gray-500">{a.firstName} {a.lastName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td">{a.email}</td>
                    <td className="td">
                      <Badge label={a.role} variant={ROLE_VARIANT[a.role] ?? 'gray'} />
                    </td>
                    <td className="td">
                      <Badge label={a.isActive ? 'Active' : 'Inactive'} variant={a.isActive ? 'success' : 'gray'} />
                    </td>
                    <td className="td text-xs text-gray-400">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-3">
                        {superAdmin && (
                          <button
                            onClick={() => openEdit(a)}
                            className="text-xs text-gray-400 hover:text-gray-200 font-medium"
                          >
                            Edit
                          </button>
                        )}
                        {superAdmin && a.id !== me?.id && a.isActive && (
                          <button
                            onClick={() => handleDeactivate(a.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-medium"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Create New Admin" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            {err && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-3 py-2 rounded-lg">{err}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name</label>
                <input className="input" value={form.firstName ?? ''} onChange={e => setField('firstName', e.target.value)} />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input" value={form.lastName ?? ''} onChange={e => setField('lastName', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Username *</label>
              <input className="input" value={form.username} onChange={e => setField('username', e.target.value)} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input className="input" type="email" value={form.email} onChange={e => setField('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Password *</label>
              <input className="input" type="password" value={form.password} onChange={e => setField('password', e.target.value)} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setField('role', e.target.value as CreateAdminBody['role'])}>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowCreate(false)} className="btn-outline flex-1">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.username || !form.email || !form.password}
                className="btn-primary flex-1"
              >
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editAdmin && (
        <Modal title={`Edit — ${editAdmin.username}`} onClose={() => setEditAdmin(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name</label>
                <input className="input" value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input" value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="label">New Password (leave empty to keep current)</label>
              <input className="input" type="password" value={editForm.newPassword} onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditAdmin(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleEdit} disabled={editSaving} className="btn-primary flex-1">
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
