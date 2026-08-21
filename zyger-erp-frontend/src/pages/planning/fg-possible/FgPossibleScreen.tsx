import { useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

interface ComponentBreakdown {
  componentCode: string;
  componentDescription: string;
  uom: string;
  requiredQty: number;
  availableQty: number;
  status: 'OK' | 'SHORT';
}

interface FeasibilityResult {
  maxProducibleQty: number;
  limitingComponent: string;
  isFeasible: boolean;
  breakdown: ComponentBreakdown[];
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  OK:    { color: '#28a745', bg: '#d4edda' },
  SHORT: { color: '#dc3545', bg: '#f8d7da' },
};

export default function FgPossibleScreen() {
  const { toast } = useToast();
  const [itemCode, setItemCode] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FeasibilityResult | null>(null);
  const [checked, setChecked] = useState(false);

  const checkFeasibility = async () => {
    if (!itemCode.trim()) { toast('Item code is required.', 'error'); return; }
    setBusy(true);
    try {
      const { data: itemData } = await apiClient.get(`/api/master/items?search=${encodeURIComponent(itemCode.trim())}`);
      const items = itemData.content ?? itemData ?? [];
      const found = items.find((it: { code: string }) => it.code === itemCode.trim());

      if (!found) {
        toast(`Item "${itemCode}" not found.`, 'error');
        setBusy(false);
        return;
      }

      try {
        const payload: Record<string, unknown> = { itemCode: itemCode.trim() };
        if (targetDate) payload.targetDate = targetDate;
        if (qty) payload.quantity = qty;
        const { data } = await apiClient.post('/v1/planning/fg-possible/check', payload);
        setResult(data);
      } catch {
        setResult({
          maxProducibleQty: 0,
          limitingComponent: 'N/A',
          isFeasible: false,
          breakdown: [],
        });
      }
      setChecked(true);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Feasibility check failed.'), 'error');
    }
    setBusy(false);
  };

  return (
    <>
      <div className="pg-head">
        <h1>FG Possible</h1>
        <p>Finished Goods Feasibility Check</p>
      </div>

      <div className="panel">
        <div className="toolbar">
          <label className="fld">
            <span>Item Code *</span>
            <input className="in" placeholder="e.g. FG-001" value={itemCode} onChange={(e) => { setItemCode(e.target.value); setChecked(false); setResult(null); }} />
          </label>
          <label className="fld">
            <span>Target Date</span>
            <input className="in" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </label>
          <label className="fld">
            <span>Target Qty</span>
            <input className="in" type="number" step="1" min="1" placeholder="Leave empty for max" value={qty} onChange={(e) => setQty(e.target.value ? Number(e.target.value) : '')} />
          </label>
          <button className="btn btn-p" onClick={checkFeasibility} disabled={busy}>
            <span className="material-symbols-rounded">search</span> Check Feasibility
          </button>
        </div>
      </div>

      {!checked && (
        <div className="panel">
          <div className="empty"><span className="material-symbols-rounded">select_all</span> Select an item and click Check Feasibility</div>
        </div>
      )}

      {checked && !result && (
        <div className="panel">
          <div className="empty"><span className="material-symbols-rounded">info</span> Select an item and click Check Feasibility</div>
        </div>
      )}

      {result && (
        <>
          <div className="panel">
            <div className="panel-h">
              <h2>
                <span className="material-symbols-rounded">{result.isFeasible ? 'check_circle' : 'cancel'}</span> Feasibility Result
              </h2>
            </div>
            <div className="fgrid">
              <label className="fld">
                <span>Feasibility</span>
                <span className="in" style={{ display: 'block', padding: '8px 12px', background: result.isFeasible ? '#d4edda' : '#f8d7da', borderRadius: 4, fontWeight: 700, color: result.isFeasible ? '#28a745' : '#dc3545' }}>
                  {result.isFeasible ? 'FEASIBLE' : 'NOT FEASIBLE'}
                </span>
              </label>
              <label className="fld">
                <span>Max Producible Qty</span>
                <span className="in" style={{ display: 'block', padding: '8px 12px', background: '#fff', borderRadius: 4, fontWeight: 600 }}>{result.maxProducibleQty}</span>
              </label>
              <label className="fld">
                <span>Limiting Component</span>
                <span className="in" style={{ display: 'block', padding: '8px 12px', background: '#fff', borderRadius: 4, fontWeight: 600 }}>{result.limitingComponent}</span>
              </label>
            </div>
          </div>

          <div className="panel">
            <div className="panel-h">
              <h2>Component Breakdown</h2>
            </div>
            {result.breakdown.length > 0 ? (
              <div className="twrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Component Code</th>
                      <th>Description</th>
                      <th>UOM</th>
                      <th>Required Qty</th>
                      <th>Available Qty</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.breakdown.map((comp, idx) => {
                      const sc = STATUS_COLORS[comp.status] ?? { color: '#888', bg: '#e9ecef' };
                      return (
                        <tr key={idx}>
                          <td>{comp.componentCode}</td>
                          <td>{comp.componentDescription}</td>
                          <td>{comp.uom}</td>
                          <td>{comp.requiredQty}</td>
                          <td>{comp.availableQty}</td>
                          <td>
                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: sc.color, background: sc.bg }}>
                              {comp.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty"><span className="material-symbols-rounded">info</span> No component data available.</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
