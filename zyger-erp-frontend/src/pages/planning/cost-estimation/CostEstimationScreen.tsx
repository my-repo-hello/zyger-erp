import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

interface CostEstimation {
  id: number;
  itemCode: string;
  itemDescription?: string;
  customerName?: string;
  batchQty?: number;
  currencyCode?: string;
  profitMarginPercent?: number;
  status: string;
  remarks?: string;
  totalMaterialCost?: number;
  totalMachineCost?: number;
  totalManufacturingCost?: number;
  estimatedSellingPrice?: number;
}

interface CostLine {
  id: number;
  lineType: string;
  componentCode?: string;
  componentDescription?: string;
  uom?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
  machineCode?: string;
  machineDescription?: string;
  setupTime?: number;
  runTime?: number;
  operationDescription?: string;
}

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  DRAFT:      { color: '#888',    bg: '#e9ecef' },
  SUBMITTED:  { color: '#6f42c1', bg: '#e8daef' },
  APPROVED:   { color: '#28a745', bg: '#d4edda' },
  OBSOLETE:   { color: '#dc3545', bg: '#f8d7da' },
};

const fmt = (v?: number) => v != null ? `$${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

export default function CostEstimationScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<CostEstimation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CostEstimation | null>(null);
  const [actionTarget, setActionTarget] = useState<{ est: CostEstimation; action: string } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lines, setLines] = useState<CostLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      const { data } = await apiClient.get(`/v1/planning/cost-estimations?${params}`);
      const items = data.content ?? (Array.isArray(data) ? data : []);
      setRows(items);
      setTotal(data.totalElements ?? items.length);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load cost estimations.'), 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  const save = async () => {
    if (!String(form.itemCode ?? '').trim()) { toast('Item code is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/v1/planning/cost-estimations/${editId}`, form);
        toast('Cost estimation updated.');
      } else {
        await apiClient.post('/v1/planning/cost-estimations', form);
        toast('Cost estimation created.');
      }
      setForm({}); setEditId(null); load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Save failed.'), 'error');
    }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/v1/planning/cost-estimations/${deleteTarget.id}`);
      toast('Deleted.');
      setDeleteTarget(null); load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Delete failed.'), 'error');
    }
    setBusy(false);
  };

  const calculate = async (est: CostEstimation) => {
    setBusy(true);
    try {
      await apiClient.post(`/v1/planning/cost-estimations/${est.id}/calculate`);
      toast('Cost estimation calculated.');
      load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Calculate failed.'), 'error');
    }
    setBusy(false);
  };

  const performAction = async () => {
    if (!actionTarget) return;
    setBusy(true);
    try {
      await apiClient.post(`/v1/planning/cost-estimations/${actionTarget.est.id}/actions/${actionTarget.action}`);
      toast(`Action "${actionTarget.action}" performed.`);
      setActionTarget(null); load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Action failed.'), 'error');
    }
    setBusy(false);
  };

  const toggleLines = async (est: CostEstimation) => {
    if (expandedId === est.id) { setExpandedId(null); setLines([]); return; }
    setExpandedId(est.id);
    setLinesLoading(true);
    try {
      const { data } = await apiClient.get(`/v1/planning/cost-estimations/${est.id}/lines`);
      setLines(data.content ?? (Array.isArray(data) ? data : []));
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load cost lines.'), 'error');
      setLines([]);
    }
    setLinesLoading(false);
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  return (
    <>
      <div className="pg-head">
        <h1>Cost Estimation</h1>
        <p>Estimate product costs and pricing</p>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{editId ? 'Edit' : 'Add'} Cost Estimation</h2>
        </div>
        <div className="fgrid">
          <label className="fld">
            <span>Item Code *</span>
            <input className="in" value={String(form.itemCode ?? '')} onChange={(e) => set('itemCode', e.target.value)} />
          </label>
          <label className="fld">
            <span>Item Description</span>
            <input className="in" value={String(form.itemDescription ?? '')} onChange={(e) => set('itemDescription', e.target.value)} />
          </label>
          <label className="fld">
            <span>Customer Name</span>
            <input className="in" value={String(form.customerName ?? '')} onChange={(e) => set('customerName', e.target.value)} />
          </label>
          <label className="fld">
            <span>Batch Qty</span>
            <input className="in" type="number" step="1" value={String(form.batchQty ?? '')} onChange={(e) => set('batchQty', e.target.value ? Number(e.target.value) : null)} />
          </label>
          <label className="fld">
            <span>Currency Code</span>
            <input className="in" value={String(form.currencyCode ?? '')} onChange={(e) => set('currencyCode', e.target.value)} />
          </label>
          <label className="fld">
            <span>Profit Margin %</span>
            <input className="in" type="number" step="0.01" value={String(form.profitMarginPercent ?? '')} onChange={(e) => set('profitMarginPercent', e.target.value ? Number(e.target.value) : null)} />
          </label>
          <label className="fld">
            <span>Status</span>
            <select className="in" value={String(form.status ?? 'DRAFT')} onChange={(e) => set('status', e.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="OBSOLETE">Obsolete</option>
            </select>
          </label>
          <label className="fld">
            <span>Remarks</span>
            <textarea className="in" rows={2} value={String(form.remarks ?? '')} onChange={(e) => set('remarks', e.target.value)} />
          </label>
        </div>
        <div className="actbar">
          <span className="lft">
            {editId && <button className="btn" onClick={() => { setForm({}); setEditId(null); }} disabled={busy}>Cancel</button>}
          </span>
          <button className="btn btn-p" onClick={save} disabled={busy}>{editId ? 'Update' : 'Create'}</button>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <input className="in" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <span className="count">{total} estimations</span>
        </div>
        <div className="twrap">
          {loading ? (
            <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Item Code</th>
                  <th>Description</th>
                  <th>Customer</th>
                  <th>Batch Qty</th>
                  <th>Total Cost</th>
                  <th>Selling Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={9}><div className="empty"><span className="material-symbols-rounded">search_off</span> No cost estimations.</div></td></tr>
                ) : rows.map((r) => {
                  const sc = STATUS_COLORS[r.status] ?? { color: '#888', bg: '#e9ecef' };
                  return (
                    <>
                      <tr key={r.id} onClick={() => toggleLines(r)} style={{ cursor: 'pointer' }}>
                        <td>
                          <span className="material-symbols-rounded">{expandedId === r.id ? 'expand_less' : 'expand_more'}</span>
                        </td>
                        <td>{r.itemCode}</td>
                        <td>{r.itemDescription ?? '—'}</td>
                        <td>{r.customerName ?? '—'}</td>
                        <td>{r.batchQty ?? '—'}</td>
                        <td>{fmt(r.totalManufacturingCost)}</td>
                        <td>{fmt(r.estimatedSellingPrice)}</td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: sc.color, background: sc.bg }}>
                            {r.status}
                          </span>
                        </td>
                        <td>
                          <button className="ibtn" title="Calculate" onClick={(e) => { e.stopPropagation(); calculate(r); }}>
                            <span className="material-symbols-rounded">functions</span>
                          </button>
                          <button className="ibtn" title="Submit" onClick={(e) => { e.stopPropagation(); setActionTarget({ est: r, action: 'submit' }); }}>
                            <span className="material-symbols-rounded">send</span>
                          </button>
                          <button className="ibtn" title="Approve" onClick={(e) => { e.stopPropagation(); setActionTarget({ est: r, action: 'approve' }); }}>
                            <span className="material-symbols-rounded">check_circle</span>
                          </button>
                          <button className="ibtn" title="Edit" onClick={(e) => { e.stopPropagation(); setForm(r as unknown as Record<string, unknown>); setEditId(r.id); }}>
                            <span className="material-symbols-rounded">edit</span>
                          </button>
                          <button className="ibtn danger" title="Delete" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}>
                            <span className="material-symbols-rounded">delete</span>
                          </button>
                        </td>
                      </tr>
                      {expandedId === r.id && (
                        <tr key={`${r.id}-lines`}>
                          <td colSpan={9}>
                            <div style={{ background: '#f9fafb', padding: 12, borderBottom: '1px solid #e5e7eb' }}>
                              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>Cost Breakdown</h4>
                              {linesLoading ? (
                                <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading lines...</div>
                              ) : lines.length === 0 ? (
                                <div className="empty"><span className="material-symbols-rounded">info</span> No cost lines. Click Calculate first.</div>
                              ) : (
                                <table className="tbl">
                                  <thead>
                                    <tr>
                                      <th>Type</th>
                                      <th>Code</th>
                                      <th>Description</th>
                                      <th>UOM</th>
                                      <th>Qty</th>
                                      <th>Rate</th>
                                      <th>Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lines.map((ln) => (
                                      <tr key={ln.id}>
                                        <td>
                                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: ln.lineType === 'MATERIAL' ? '#007bff' : '#6f42c1', background: ln.lineType === 'MATERIAL' ? '#d1ecf1' : '#e8daef' }}>
                                            {ln.lineType}
                                          </span>
                                        </td>
                                        <td>{ln.componentCode ?? ln.machineCode ?? '—'}</td>
                                        <td>{ln.componentDescription ?? ln.operationDescription ?? '—'}</td>
                                        <td>{ln.uom ?? '—'}</td>
                                        <td>{ln.quantity ?? '—'}</td>
                                        <td>{fmt(ln.rate)}</td>
                                        <td>{fmt(ln.amount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {total > PAGE_SIZE && (
          <div className="pager">
            <button className="btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span className="sp">Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
            <button className="btn" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>

      <ConfirmActionModal open={Boolean(deleteTarget)} title="Delete Cost Estimation" body="Permanently delete this cost estimation?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />

      <ConfirmActionModal
        open={Boolean(actionTarget)}
        title={actionTarget ? `${actionTarget.action.charAt(0).toUpperCase() + actionTarget.action.slice(1)} Estimation` : ''}
        body={actionTarget ? `Perform "${actionTarget.action}" on this estimation?` : ''}
        okLabel={actionTarget?.action ?? ''}
        busy={busy}
        onClose={() => setActionTarget(null)}
        onConfirm={performAction}
      />
    </>
  );
}
