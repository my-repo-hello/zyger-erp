import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import { printDocument as printDoc } from '../../../utils/printDocument';

interface ProductConversion {
  id: number;
  conversionNumber: string;
  conversionDate: string;
  conversionType: string;
  sourceWarehouse: string;
  destinationWarehouse: string;
  workOrderNumber: string;
  jobCardNumber: string;
  reference: string;
  inputItemCode: string;
  inputBatchNumber: string;
  inputQuantity: number;
  inputUom: string;
  outputItemCode: string;
  outputBatchNumber: string;
  outputQuantity: number;
  outputUom: string;
  processLossQty: number;
  scrapQty: number;
  lossReason: string;
  status: string;
  remarks: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' }, COMPLETED: { color: '#22c55e', bg: '#d4edda' },
  CANCELLED: { color: '#991b1b', bg: '#fde2e2' },
};

export default function ProductConversionScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ProductConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductConversion | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/production/conversions');
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!String(form.inputItemCode ?? '').trim()) { toast('Input Item Code is required.', 'error'); return; }
    if (!String(form.outputItemCode ?? '').trim()) { toast('Output Item Code is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) { await apiClient.put(`/v1/production/conversions/${editId}`, form); toast('Conversion updated.'); }
      else { await apiClient.post('/v1/production/conversions', form); toast('Conversion created.'); }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/production/conversions/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    try { await apiClient.post(`/v1/production/conversions/${id}/actions/${act}`); toast(`Conversion ${act}.`); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  const printDocument = (id: number | string, mode: 'print' | 'download' = 'print') => {
    const base = import.meta.env.VITE_API_BASE_URL || '/api';
    printDoc(`${base}/v1/production/conversions/${id}/print?download=${mode === 'download'}`, mode);
  };

  const filtered = rows.filter((r) => !search || (r.conversionNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.inputItemCode ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head"><h1>Product Conversion</h1><p>Convert raw material to semi-finished / finished products</p></div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Conversion</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Conversion Date</span><input className="in" type="date" value={String(form.conversionDate ?? '').slice(0, 10)} onChange={(e) => set('conversionDate', e.target.value)} /></label>
            <label className="fld"><span>Conversion Type</span>
              <select className="in" value={String(form.conversionType ?? 'RM_TO_SFG')} onChange={(e) => set('conversionType', e.target.value)}>
                <option value="RM_TO_SFG">Raw to Semi-Finished</option><option value="SFG_TO_FG">Semi-Finished to Finished</option><option value="OTHER">Other</option>
              </select>
            </label>
            <label className="fld"><span>Source Warehouse</span><input className="in" value={String(form.sourceWarehouse ?? '')} onChange={(e) => set('sourceWarehouse', e.target.value)} /></label>
            <label className="fld"><span>Destination Warehouse</span><input className="in" value={String(form.destinationWarehouse ?? '')} onChange={(e) => set('destinationWarehouse', e.target.value)} /></label>
            <label className="fld"><span>Work Order No</span><input className="in" value={String(form.workOrderNumber ?? '')} onChange={(e) => set('workOrderNumber', e.target.value)} /></label>
            <label className="fld"><span>Job Card No</span><input className="in" value={String(form.jobCardNumber ?? '')} onChange={(e) => set('jobCardNumber', e.target.value)} /></label>
            <hr style={{ gridColumn: '1 / -1', border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
            <label className="fld"><span>Input Item Code *</span><input className="in" value={String(form.inputItemCode ?? '')} onChange={(e) => set('inputItemCode', e.target.value)} /></label>
            <label className="fld"><span>Input Batch No</span><input className="in" value={String(form.inputBatchNumber ?? '')} onChange={(e) => set('inputBatchNumber', e.target.value)} /></label>
            <label className="fld"><span>Input Quantity</span><input className="in" type="number" value={String(form.inputQuantity ?? '')} onChange={(e) => set('inputQuantity', Number(e.target.value))} /></label>
            <label className="fld"><span>Input UOM</span><input className="in" value={String(form.inputUom ?? '')} onChange={(e) => set('inputUom', e.target.value)} /></label>
            <hr style={{ gridColumn: '1 / -1', border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
            <label className="fld"><span>Output Item Code *</span><input className="in" value={String(form.outputItemCode ?? '')} onChange={(e) => set('outputItemCode', e.target.value)} /></label>
            <label className="fld"><span>Output Batch No</span><input className="in" value={String(form.outputBatchNumber ?? '')} onChange={(e) => set('outputBatchNumber', e.target.value)} /></label>
            <label className="fld"><span>Output Quantity</span><input className="in" type="number" value={String(form.outputQuantity ?? '')} onChange={(e) => set('outputQuantity', Number(e.target.value))} /></label>
            <label className="fld"><span>Output UOM</span><input className="in" value={String(form.outputUom ?? '')} onChange={(e) => set('outputUom', e.target.value)} /></label>
            <hr style={{ gridColumn: '1 / -1', border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
            <label className="fld"><span>Process Loss Qty</span><input className="in" type="number" value={String(form.processLossQty ?? '')} onChange={(e) => set('processLossQty', Number(e.target.value))} /></label>
            <label className="fld"><span>Scrap Qty</span><input className="in" type="number" value={String(form.scrapQty ?? '')} onChange={(e) => set('scrapQty', Number(e.target.value))} /></label>
            <label className="fld"><span>Loss Reason</span><input className="in" value={String(form.lossReason ?? '')} onChange={(e) => set('lossReason', e.target.value)} /></label>
            <label className="fld"><span>Remarks</span><input className="in" value={String(form.remarks ?? '')} onChange={(e) => set('remarks', e.target.value)} /></label>
          </div>
          <div className="actbar">
            <span className="lft">{editId && <button className="btn" onClick={() => { setForm({}); setEditId(null); setTab('list'); }} disabled={busy}>Cancel</button>}</span>
            <button className="btn" onClick={() => { setForm({}); setEditId(null); setTab('list'); }}>Back</button>
            <button className="btn btn-p" onClick={save} disabled={busy}>{editId ? 'Update' : 'Create'}</button>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <div className="panel">
          <div className="toolbar">
            <input className="in" placeholder="Search conversions..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn btn-p" onClick={() => { setForm({}); setEditId(null); setTab('form'); }}>+ New Conversion</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>Conversion No</th><th>Type</th><th>Input Item</th><th>Input Qty</th><th>Output Item</th><th>Output Qty</th><th>Loss</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={9}><div className="empty"><span className="material-symbols-rounded">description</span> No conversions.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.conversionNumber}</b></td>
                      <td>{r.conversionType}</td>
                      <td>{r.inputItemCode}</td>
                      <td>{r.inputQuantity} {r.inputUom}</td>
                      <td>{r.outputItemCode}</td>
                      <td>{r.outputQuantity} {r.outputUom}</td>
                      <td>{r.processLossQty ?? 0}</td>
                      <td><span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: (SC[r.status] ?? SC.DRAFT).color, background: (SC[r.status] ?? SC.DRAFT).bg }}>{r.status}</span></td>
                      <td>
                        {r.status === 'DRAFT' && <button className="ibtn" title="Complete" onClick={() => action(r.id, 'complete')}><span className="material-symbols-rounded">check_circle</span></button>}
                        <button className="ibtn" title="Edit" onClick={() => { setForm(r as unknown as Record<string, unknown>); setEditId(r.id); setTab('form'); }}><span className="material-symbols-rounded">edit</span></button>
                        <button className="ibtn" title="Print" onClick={() => printDocument(r.id, 'print')}><span className="material-symbols-rounded">print</span></button>
                        <button className="ibtn" title="Download PDF" onClick={() => printDocument(r.id, 'download')}><span className="material-symbols-rounded">download</span></button>
                        {r.status === 'DRAFT' && <button className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(r)}><span className="material-symbols-rounded">delete</span></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.conversionNumber ?? ''}`} body="Permanently delete?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
