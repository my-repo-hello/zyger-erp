import { useEffect, useState } from 'react';
import { planningApi } from '../../../services/planning-api';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

interface MasterRow { id: number; code: string; name: string; [k: string]: unknown; }

interface MasterCrudPageProps {
  title: string;
  subtitle: string;
  apiMethod: 'getWorkCenters' | 'getMachines' | 'getOperations' | 'getShifts';
  fields: { key: string; label: string; type?: string; required?: boolean }[];
}

export default function MasterCrudPage({ title, subtitle, apiMethod, fields }: MasterCrudPageProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<MasterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await planningApi[apiMethod]();
      setRows(data as MasterRow[]);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  const getResourcePath = () => {
    return apiMethod === 'getWorkCenters' ? 'work-centers'
      : apiMethod === 'getMachines' ? 'machines'
      : apiMethod === 'getOperations' ? 'operations'
      : 'shifts';
  };

  const openNew = async () => {
    setForm({});
    setEditId(null);
    try {
      const path = getResourcePath();
      const res = await fetch(`/api/master/${path}/next-code`);
      if (res.ok) {
        const data = await res.json();
        if (data.code) setForm({ code: data.code });
      }
    } catch { /* fallback */ }
  };

  useEffect(() => { load(); openNew(); }, []);

  const save = async () => {
    if (!String(form.code ?? '').trim()) { toast('Code is required.', 'error'); return; }
    setBusy(true);
    try {
      const path = getResourcePath();
      if (editId) {
        await fetch(`/api/master/${path}/${editId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
        toast(`${title} updated.`);
      } else {
        await fetch(`/api/master/${path}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
        toast(`${title} created.`);
      }
      openNew(); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };


  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await fetch(`/api/master/${apiMethod === 'getWorkCenters' ? 'work-centers' : apiMethod === 'getMachines' ? 'machines' : apiMethod === 'getOperations' ? 'operations' : 'shifts'}/${deleteTarget.id}`, { method: 'DELETE' });
      toast(`${title} deleted.`);
      setDeleteTarget(null); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  return (
    <>
      <div className="pg-head"><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="panel">
        <div className="panel-h"><h2><span className="material-symbols-rounded">add</span> {editId ? 'Edit' : 'Add'} {title}</h2></div>
        <div className="fgrid">
          {fields.map((f) => (
            <label key={f.key} className="fld">
              <span>{f.label}{f.required ? ' *' : ''}</span>
              <input className="in" type={f.type ?? 'text'} value={String(form[f.key] ?? '')} onChange={(e) => setForm((c) => ({ ...c, [f.key]: e.target.value }))} />
            </label>
          ))}
        </div>
        <div className="actbar" style={{ justifyContent: 'flex-end' }}>
          {editId && <button className="btn" onClick={() => { setForm({}); setEditId(null); }} disabled={busy}>Cancel</button>}
          <button className="btn btn-p" onClick={save} disabled={busy}>{editId ? 'Update' : 'Create'}</button>
        </div>
      </div>
      <div className="panel">
        <div className="twrap">
          {loading ? (
            <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Code</th><th>Name</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={3}><div className="empty"><span className="material-symbols-rounded">description</span> No records.</div></td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.code}</td>
                    <td>{r.name}</td>
                    <td>
                      <button className="ibtn" title="Edit" onClick={() => { setForm(r); setEditId(r.id); }}><span className="material-symbols-rounded">edit</span></button>
                      <button className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(r)}><span className="material-symbols-rounded">delete</span></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.code ?? ''}`} body="Permanently delete this record?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
