import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

interface Oee { id: number; machineCode: string; oeeDate: string; plannedTimeMin: number; runTimeMin: number; downtimeMin: number; goodQty: number; totalQty: number; availability: number; performance: number; qualityRate: number; oee: number; }

export default function OeePage() {
  const [data, setData] = useState<Oee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ machineCode: '', oeeDate: new Date().toISOString().slice(0, 10), plannedTimeMin: '', runTimeMin: '', downtimeMin: '', goodQty: '', totalQty: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    const r = await axiosClient.get('/oee');
    setData(r.data as Oee[]);
  }

  async function save() {
    if (!form.machineCode) return;
    await axiosClient.post('/oee', { ...form, plannedTimeMin: Number(form.plannedTimeMin), runTimeMin: Number(form.runTimeMin), downtimeMin: Number(form.downtimeMin), goodQty: Number(form.goodQty), totalQty: Number(form.totalQty) });
    setForm({ machineCode: '', oeeDate: new Date().toISOString().slice(0, 10), plannedTimeMin: '', runTimeMin: '', downtimeMin: '', goodQty: '', totalQty: '' });
    setShowForm(false);
    load();
  }

  function fmt(v: number | null) { return v != null ? (v * 100).toFixed(1) + '%' : '-'; }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>OEE (Overall Equipment Effectiveness)</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">{showForm ? 'Cancel' : '+ Log OEE'}</button>
      </div>

      {showForm && (
        <div style={{ background: '#1e1e2e', border: '1px solid #313244', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr', gap: 12 }}>
            <input placeholder="Machine Code *" value={form.machineCode} onChange={e => setForm({ ...form, machineCode: e.target.value })} />
            <input type="date" value={form.oeeDate} onChange={e => setForm({ ...form, oeeDate: e.target.value })} />
            <input placeholder="Planned Min" type="number" value={form.plannedTimeMin} onChange={e => setForm({ ...form, plannedTimeMin: e.target.value })} />
            <input placeholder="Run Min" type="number" value={form.runTimeMin} onChange={e => setForm({ ...form, runTimeMin: e.target.value })} />
            <input placeholder="Downtime Min" type="number" value={form.downtimeMin} onChange={e => setForm({ ...form, downtimeMin: e.target.value })} />
            <input placeholder="Good Qty" type="number" value={form.goodQty} onChange={e => setForm({ ...form, goodQty: e.target.value })} />
            <input placeholder="Total Qty" type="number" value={form.totalQty} onChange={e => setForm({ ...form, totalQty: e.target.value })} />
          </div>
          <button onClick={save} className="btn-primary" style={{ marginTop: 12 }}>Save</button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #313244', textAlign: 'left' }}>
            <th style={{ padding: 8 }}>Machine</th><th style={{ padding: 8 }}>Date</th><th style={{ padding: 8 }}>Planned</th><th style={{ padding: 8 }}>Run</th><th style={{ padding: 8 }}>Down</th><th style={{ padding: 8 }}>Good</th><th style={{ padding: 8 }}>Total</th><th style={{ padding: 8 }}>Availability</th><th style={{ padding: 8 }}>Performance</th><th style={{ padding: 8 }}>Quality</th><th style={{ padding: 8 }}>OEE</th>
          </tr>
        </thead>
        <tbody>
          {data.map(o => (
            <tr key={o.id} style={{ borderBottom: '1px solid #313244' }}>
              <td style={{ padding: 8 }}>{o.machineCode}</td>
              <td style={{ padding: 8 }}>{o.oeeDate}</td>
              <td style={{ padding: 8 }}>{o.plannedTimeMin}m</td>
              <td style={{ padding: 8 }}>{o.runTimeMin}m</td>
              <td style={{ padding: 8 }}>{o.downtimeMin}m</td>
              <td style={{ padding: 8 }}>{o.goodQty}</td>
              <td style={{ padding: 8 }}>{o.totalQty}</td>
              <td style={{ padding: 8, color: (o.availability ?? 0) >= 0.85 ? '#a6e3a1' : '#f38ba8' }}>{fmt(o.availability)}</td>
              <td style={{ padding: 8, color: (o.performance ?? 0) >= 0.85 ? '#a6e3a1' : '#f38ba8' }}>{fmt(o.performance)}</td>
              <td style={{ padding: 8, color: (o.qualityRate ?? 0) >= 0.95 ? '#a6e3a1' : '#f38ba8' }}>{fmt(o.qualityRate)}</td>
              <td style={{ padding: 8, fontWeight: 700, color: (o.oee ?? 0) >= 0.65 ? '#a6e3a1' : '#f38ba8' }}>{fmt(o.oee)}</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan={11} style={{ padding: 16, textAlign: 'center', color: '#6c7086' }}>No OEE data</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
