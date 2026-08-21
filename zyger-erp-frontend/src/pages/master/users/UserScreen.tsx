import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

interface AppUser {
  id: number; username: string; fullName?: string; email?: string;
  phone?: string; department?: string; designation?: string;
  role?: string; active: boolean;
}

const PAGE_SIZE = 20;

export default function UserScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({ role: 'USER' });
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/master/users');
      let filtered = Array.isArray(data) ? data : [];
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter((u: AppUser) =>
          (u.username + (u.fullName ?? '') + (u.email ?? '') + (u.department ?? '')).toLowerCase().includes(s)
        );
      }
      setRows(filtered);
      setTotal(filtered.length);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, search]);

  const save = async () => {
    if (!String(form.username ?? '').trim()) { toast('Username is required.', 'error'); return; }
    if (!editId && !String(form.password ?? '').trim()) { toast('Password is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await apiClient.put(`/master/users/${editId}`, payload);
        toast('User updated.');
      } else {
        await apiClient.post('/master/users', form);
        toast('User created.');
      }
      setForm({ role: 'USER' }); setEditId(null); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/master/users/${deleteTarget.id}`);
      toast('User deleted.');
      setDeleteTarget(null); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  return (
    <>
      <div className="pg-head">
        <h1>User Management</h1>
        <p>Manage system users and roles</p>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2><span className="material-symbols-rounded">add</span> {editId ? 'Edit' : 'Add'} User</h2>
        </div>
        <div className="fgrid">
          <label className="fld"><span>Username *</span>
            <input className="in" value={String(form.username ?? '')} onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))} disabled={!!editId} />
          </label>
          {!editId && (
            <label className="fld"><span>Password *</span>
              <input className="in" type="password" value={String(form.password ?? '')} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} />
            </label>
          )}
          {editId && (
            <label className="fld"><span>New Password</span>
              <input className="in" type="password" placeholder="Leave blank to keep current" value={String(form.password ?? '')} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} />
            </label>
          )}
          <label className="fld"><span>Full Name</span>
            <input className="in" value={String(form.fullName ?? '')} onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))} />
          </label>
          <label className="fld"><span>Email</span>
            <input className="in" type="email" value={String(form.email ?? '')} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
          </label>
          <label className="fld"><span>Phone</span>
            <input className="in" value={String(form.phone ?? '')} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} />
          </label>
          <label className="fld"><span>Department</span>
            <select className="in" value={String(form.department ?? '')} onChange={(e) => setForm((c) => ({ ...c, department: e.target.value }))}>
              <option value="">Select...</option>
              <option value="Production">Production</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Quality">Quality</option>
              <option value="Planning">Planning</option>
              <option value="Purchase">Purchase</option>
              <option value="Sales">Sales</option>
              <option value="Inventory">Inventory</option>
              <option value="Accounts">Accounts</option>
              <option value="Admin">Admin</option>
            </select>
          </label>
          <label className="fld"><span>Designation</span>
            <input className="in" value={String(form.designation ?? '')} onChange={(e) => setForm((c) => ({ ...c, designation: e.target.value }))} />
          </label>
          <label className="fld"><span>Role *</span>
            <select className="in" value={String(form.role ?? 'USER')} onChange={(e) => setForm((c) => ({ ...c, role: e.target.value }))}>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </label>
          <label className="fld"><span>Active</span>
            <select className="in" value={String(form.active ?? 'true')} onChange={(e) => setForm((c) => ({ ...c, active: e.target.value === 'true' }))}>
              <option value="true">Yes</option><option value="false">No</option>
            </select>
          </label>
        </div>
        <div className="actbar" style={{ justifyContent: 'flex-end' }}>
          {editId && <button className="btn" onClick={() => { setForm({ role: 'USER' }); setEditId(null); }} disabled={busy}>Cancel</button>}
          <button className="btn btn-p" onClick={save} disabled={busy}>{editId ? 'Update' : 'Create'}</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h" style={{ gap: 12, flexWrap: 'wrap' }}>
          <input className="in" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} style={{ maxWidth: 200 }} />
          <span style={{ color: '#888', fontSize: 13 }}>{total} users</span>
        </div>
        <div className="twrap">
          {loading ? (
            <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Username</th><th>Full Name</th><th>Email</th><th>Department</th><th>Role</th><th>Active</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty"><span className="material-symbols-rounded">description</span> No users.</div></td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.username}</strong></td>
                    <td>{r.fullName ?? ''}</td>
                    <td>{r.email ?? ''}</td>
                    <td>{r.department ?? ''}</td>
                    <td><span className="badge badge-blue">{r.role ?? 'USER'}</span></td>
                    <td>{r.active ? 'Yes' : 'No'}</td>
                    <td>
                      <button className="ibtn" title="Edit" onClick={() => { setForm({ ...r, password: '' } as unknown as Record<string, unknown>); setEditId(r.id); }}>
                        <span className="material-symbols-rounded">edit</span>
                      </button>
                      <button className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(r)}>
                        <span className="material-symbols-rounded">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {total > PAGE_SIZE && (
          <div className="actbar" style={{ justifyContent: 'center', gap: 8 }}>
            <button className="btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span style={{ color: '#666' }}>Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
            <button className="btn" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.username ?? ''}`} body="Permanently delete this user?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
