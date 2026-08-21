import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

interface DowntimeRow { machineCode: string; totalDowntimeMinutes: number; totalDowntimeHours: number; breakdownCount: number; avgDowntimePerBreakdown: number; }
interface MtbfRow { machineCode: string; totalFailures: number; totalDowntimeMinutes: number; mttrMinutes: number; mtbfMinutes: number; mtbfHours: number; }
interface CostRow { machineCode: string; breakdownCost: number; toolServiceCost: number; totalCost: number; }

export default function MaintenanceAnalysisScreen() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'downtime' | 'mtbf' | 'cost'>('downtime');
  const [downtime, setDowntime] = useState<DowntimeRow[]>([]);
  const [mtbf, setMtbf] = useState<MtbfRow[]>([]);
  const [cost, setCost] = useState<CostRow[]>([]);
  const [catBreakdown, setCatBreakdown] = useState<Record<string, number>>({});
  const [priorityBreakdown, setPriorityBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [dtRes, mtbfRes, costRes, catRes, priRes] = await Promise.all([
        apiClient.get('/v1/maintenance/analysis/downtime'),
        apiClient.get('/v1/maintenance/analysis/mtbf'),
        apiClient.get('/v1/maintenance/analysis/cost'),
        apiClient.get('/v1/maintenance/analysis/downtime/categories'),
        apiClient.get('/v1/maintenance/analysis/downtime/priority'),
      ]);
      setDowntime(Array.isArray(dtRes.data) ? dtRes.data : []);
      setMtbf(Array.isArray(mtbfRes.data) ? mtbfRes.data : []);
      setCost(Array.isArray(costRes.data) ? costRes.data : []);
      setCatBreakdown(catRes.data ?? {});
      setPriorityBreakdown(priRes.data ?? {});
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const totalDowntime = downtime.reduce((s, r) => s + (r.totalDowntimeMinutes ?? 0), 0);
  const totalBreakdowns = downtime.reduce((s, r) => s + (r.breakdownCount ?? 0), 0);
  const totalCost = cost.reduce((s, r) => s + (r.totalCost ?? 0), 0);
  const avgMttr = mtbf.length > 0 ? mtbf.reduce((s, r) => s + r.mttrMinutes, 0) / mtbf.length : 0;
  const avgMtbf = mtbf.length > 0 ? mtbf.reduce((s, r) => s + r.mtbfMinutes, 0) / mtbf.length : 0;

  return (
    <>
      <div className="pg-head"><h1>Maintenance Analysis</h1><p>Downtime analysis, MTBF/MTTR, failure categories, and maintenance costs</p></div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['downtime', 'mtbf', 'cost'] as const).map((t) => (
          <button key={t} className={`btn ${tab === t ? 'btn-p' : ''}`} onClick={() => setTab(t)}>
            {t === 'downtime' ? 'Downtime Analysis' : t === 'mtbf' ? 'MTBF / MTTR' : 'Maintenance Cost'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Downtime</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>{Math.round(totalDowntime / 60 * 10) / 10}h</div>
        </div>
        <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Breakdowns</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>{totalBreakdowns}</div>
        </div>
        <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg MTTR</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>{Math.round(avgMttr)} min</div>
        </div>
        <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg MTBF</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e', marginTop: 4 }}>{Math.round(avgMtbf / 60 * 10) / 10}h</div>
        </div>
        <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Maint. Cost</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6', marginTop: 4 }}>₹{totalCost.toLocaleString()}</div>
        </div>
      </div>

      {tab === 'downtime' && (
        <div className="panel">
          <div className="panel-h"><h2>Downtime by Machine</h2></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>By Category</h4>
              <div className="twrap">
                <table className="tbl"><thead><tr><th>Category</th><th>Count</th></tr></thead>
                  <tbody>{Object.entries(catBreakdown).map(([k, v]) => <tr key={k}><td>{k.replace(/_/g, ' ')}</td><td><b>{v}</b></td></tr>)}
                    {Object.keys(catBreakdown).length === 0 && <tr><td colSpan={2}><div className="empty">No data</div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>By Priority</h4>
              <div className="twrap">
                <table className="tbl"><thead><tr><th>Priority</th><th>Count</th></tr></thead>
                  <tbody>{Object.entries(priorityBreakdown).map(([k, v]) => <tr key={k}><td>{k}</td><td><b>{v}</b></td></tr>)}
                    {Object.keys(priorityBreakdown).length === 0 && <tr><td colSpan={2}><div className="empty">No data</div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="twrap">
            {loading ? <div className="empty">Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>Machine</th><th>Breakdowns</th><th>Total Downtime (min)</th><th>Total Downtime (hrs)</th><th>Avg per Breakdown (min)</th></tr></thead>
                <tbody>
                  {downtime.length === 0 ? <tr><td colSpan={5}><div className="empty"><span className="material-symbols-rounded">analytics</span> No downtime data yet.</div></td></tr> :
                    downtime.map((r) => <tr key={r.machineCode}><td><b>{r.machineCode}</b></td><td>{r.breakdownCount}</td><td>{r.totalDowntimeMinutes}</td><td>{r.totalDowntimeHours}</td><td>{r.avgDowntimePerBreakdown}</td></tr>)}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'mtbf' && (
        <div className="panel">
          <div className="panel-h"><h2>MTBF / MTTR Analysis</h2></div>
          <div className="twrap">
            {loading ? <div className="empty">Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>Machine</th><th>Total Failures</th><th>Total Downtime (min)</th><th>MTTR (min)</th><th>MTBF (min)</th><th>MTBF (hrs)</th></tr></thead>
                <tbody>
                  {mtbf.length === 0 ? <tr><td colSpan={6}><div className="empty"><span className="material-symbols-rounded">timer</span> No MTBF data yet.</div></td></tr> :
                    mtbf.map((r) => <tr key={r.machineCode}><td><b>{r.machineCode}</b></td><td>{r.totalFailures}</td><td>{r.totalDowntimeMinutes}</td><td style={{ color: r.mttrMinutes > 60 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{r.mttrMinutes}</td><td style={{ color: r.mtbfMinutes < 100 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{r.mtbfMinutes}</td><td>{r.mtbfHours}</td></tr>)}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'cost' && (
        <div className="panel">
          <div className="panel-h"><h2>Maintenance Cost by Machine</h2></div>
          <div className="twrap">
            {loading ? <div className="empty">Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>Machine</th><th>Breakdown Cost (₹)</th><th>Tool Service Cost (₹)</th><th>Total Cost (₹)</th></tr></thead>
                <tbody>
                  {cost.length === 0 ? <tr><td colSpan={4}><div className="empty"><span className="material-symbols-rounded">payments</span> No cost data yet.</div></td></tr> :
                    cost.map((r) => <tr key={r.machineCode}><td><b>{r.machineCode}</b></td><td>{r.breakdownCost.toLocaleString()}</td><td>{r.toolServiceCost.toLocaleString()}</td><td style={{ fontWeight: 700, color: '#8b5cf6' }}>₹{r.totalCost.toLocaleString()}</td></tr>)}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  );
}
