import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import AuditHistoryDrawer from '../../../components/common/AuditHistoryDrawer';
import { exportToCsv } from '../../../utils/exportCsv';

interface AppUser {
  id: number; username: string; fullName?: string; email?: string;
  phone?: string; department?: string; designation?: string;
  role?: string; active: boolean;
}

const FRS_ROLES: { value: string; label: string }[] = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Management', label: 'Management' },
  { value: 'Purchase', label: 'Purchase' },
  { value: 'Store', label: 'Store' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Planning', label: 'Planning' },
  { value: 'Production', label: 'Production' },
  { value: 'Quality', label: 'Quality' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Accounts', label: 'Accounts' },
  { value: 'Supervisor', label: 'Supervisor' },
  { value: 'Operator', label: 'Operator' },
  { value: 'Inspector', label: 'Inspector' },
];

const LEGACY_ROLE_MAP: Record<string, string> = {
  ADMIN: 'Admin', MANAGER: 'Management', USER: 'Supervisor', VIEWER: 'Operator',
};

function mapRole(role?: string): string {
  if (!role) return 'Supervisor';
  return LEGACY_ROLE_MAP[role.toUpperCase()] || role;
}

const DEPARTMENTS = ['Production', 'Maintenance', 'Quality', 'Planning', 'Purchase', 'Sales', 'Inventory', 'Accounts', 'Admin', 'HR', 'IT'];

const PAGE_SIZE = 15;

export default function UserScreen() {
  const { toast } = useToast();
  const { user: currentUser, can } = useAuth();
  const [rows, setRows] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({ role: 'Supervisor', active: true });
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditEntityId, setAuditEntityId] = useState<number | undefined>(undefined);

  const CSV_COLUMNS = [
    { key: 'username', label: 'Username' },
    { key: 'fullName', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'role', label: 'Role' },
    { key: 'active', label: 'Active' },
  ];

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/master/users');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((u) =>
      [u.username, u.fullName, u.email, u.department, u.role, u.designation]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }, [rows, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(0); }, [search]);

  const openNew = () => {
    setForm({ role: 'Supervisor', active: true });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (u: AppUser) => {
    setForm({ ...u, password: '' });
    setEditId(u.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!String(form.username ?? '').trim()) { toast('Username is required.', 'error'); return; }
    if (!editId && !String(form.password ?? '').trim()) { toast('Password is required.', 'error'); return; }
    const pw = String(form.password ?? '').trim();
    if (pw && pw.length < 8) { toast('Password must be at least 8 characters.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        const payload: Record<string, unknown> = {};
        for (const k of ['fullName', 'email', 'phone', 'department', 'designation', 'role', 'active']) {
          if (form[k] !== undefined) payload[k] = form[k];
        }
        if (pw) payload.password = pw;
        await apiClient.put(`/master/users/${editId}`, payload);
        toast('User updated.');
      } else {
        await apiClient.post('/master/users', {
          username: form.username,
          password: form.password,
          fullName: form.fullName || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          department: form.department || undefined,
          designation: form.designation || undefined,
          role: form.role || 'Supervisor',
        });
        toast('User created.');
      }
      setForm({ role: 'Supervisor', active: true }); setEditId(null); setShowForm(false); load();
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

  const toggleActive = async (u: AppUser) => {
    try {
      await apiClient.put(`/master/users/${u.id}`, { active: !u.active });
      toast(`User ${u.active ? 'deactivated' : 'activated'}.`);
      load();
    } catch (e) { toast(getApiErrorMessage(e, 'Update failed.'), 'error'); }
  };

  return (
    <>
      <div className="pg-head">
        <div>
          <h1>User Management</h1>
          <p>Manage system users, roles, and access</p>
        </div>
        {can('master', 'Create') && (
          <button className="btn btn-p" onClick={openNew}>
            <span className="material-symbols-rounded">person_add</span> Add User
          </button>
        )}
      </div>

      {showForm && (
        <div className="panel">
          <div className="panel-h">
            <h2><span className="material-symbols-rounded">{editId ? 'edit' : 'person_add'}</span> {editId ? 'Edit' : 'Create'} User</h2>
          </div>
          <div className="fgrid">
            <label className="fld"><span>Username *</span>
              <input className="in" value={String(form.username ?? '')} onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))} disabled={!!editId} placeholder="Unique login name" />
            </label>
            <label className="fld"><span>{editId ? 'New Password' : 'Password *'}</span>
              <input className="in" type="password" value={String(form.password ?? '')} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} placeholder={editId ? 'Leave blank to keep current' : 'Min 8 chars: A-Z, a-z, 0-9, !@#$%'} />
            </label>
            <label className="fld"><span>Full Name</span>
              <input className="in" value={String(form.fullName ?? '')} onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))} placeholder="Employee name" />
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
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="fld"><span>Designation</span>
              <input className="in" value={String(form.designation ?? '')} onChange={(e) => setForm((c) => ({ ...c, designation: e.target.value }))} placeholder="Job title" />
            </label>
            <label className="fld"><span>Role *</span>
              <select className="in" value={String(form.role ?? 'Supervisor')} onChange={(e) => setForm((c) => ({ ...c, role: e.target.value }))}>
                {FRS_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            {editId && (
              <label className="fld"><span>Status</span>
                <select className="in" value={String(form.active ?? 'true')} onChange={(e) => setForm((c) => ({ ...c, active: e.target.value === 'true' }))}>
                  <option value="true">Active</option><option value="false">Inactive</option>
                </select>
              </label>
            )}
          </div>
          <div className="actbar" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn" onClick={() => { setForm({ role: 'Supervisor', active: true }); setEditId(null); setShowForm(false); }} disabled={busy}>Cancel</button>
            <button className="btn btn-p" onClick={save} disabled={busy}>{editId ? 'Update' : 'Create User'}</button>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-h" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--muted)' }}>search</span>
            <input className="in" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, maxWidth: 300 }} />
          </div>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
          {can('master', 'Export') && (
            <button className="btn btn-sm" onClick={() => exportToCsv(filtered as unknown as Record<string, unknown>[], 'users', CSV_COLUMNS)} title="Export CSV">
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>download</span> CSV
            </button>
          )}
          {can('master', 'View') && (
            <button className="btn btn-sm" onClick={() => { setAuditEntityId(undefined); setAuditOpen(true); }} title="Audit History">
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>history</span>
            </button>
          )}
        </div>
        <div className="twrap">
          {loading ? (
            <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading users...</div>
          ) : paged.length === 0 ? (
            <div className="empty"><span className="material-symbols-rounded">group</span> {search ? 'No users match your search.' : 'No users yet. Create one to get started.'}</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((u) => (
                  <tr key={u.id} style={{ opacity: u.active ? 1 : 0.6 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 12, borderRadius: 6 }}>
                          {u.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <strong>{u.username}</strong>
                      </div>
                    </td>
                    <td>{u.fullName ?? <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                    <td>{u.email ?? <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                    <td>{u.department ?? <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                    <td><span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{mapRole(u.role)}</span></td>
                    <td>
                      <span style={{ color: u.active ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        {can('master', 'Edit') && (
                          <button className="ibtn" title="Edit" onClick={() => openEdit(u)}>
                            <span className="material-symbols-rounded">edit</span>
                          </button>
                        )}
                        {can('master', 'View') && (
                          <button className="ibtn" title="Audit History" onClick={() => { setAuditEntityId(u.id); setAuditOpen(true); }}>
                            <span className="material-symbols-rounded">history</span>
                          </button>
                        )}
                        {can('master', 'Edit') && (
                          <button className="ibtn" title={u.active ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(u)}
                            style={{ color: u.active ? 'var(--yellow)' : 'var(--green)' }}>
                            <span className="material-symbols-rounded">{u.active ? 'person_off' : 'person_check'}</span>
                          </button>
                        )}
                        {can('master', 'Delete') && u.id !== currentUser?.username as unknown as number && (
                          <button className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(u)}>
                            <span className="material-symbols-rounded">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div className="actbar" style={{ justifyContent: 'center', gap: 8 }}>
            <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>chevron_left</span>
            </button>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>Page {page + 1} of {totalPages}</span>
            <button className="btn btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>chevron_right</span>
            </button>
          </div>
        )}
      </div>

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.username ?? ''}?`}
        body="This permanently removes the user account. This action cannot be undone."
        okLabel="Delete"
        danger
        busy={busy}
        onClose={() => setDeleteTarget(null)}
        onConfirm={del}
      />

      <AuditHistoryDrawer
        open={auditOpen}
        entityType="AppUser"
        entityId={auditEntityId}
        onClose={() => setAuditOpen(false)}
      />
    </>
  );
}
