import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

interface DashboardData {
  openBreakdowns: number;
  criticalBreakdowns: number;
  machinesDown: number;
  todayPM: number;
  pmOverdue: number;
  pmCompleted: number;
  calibrationDue: number;
  calibrationOverdue: number;
  mtbf: number;
  mttr: number;
  totalBreakdowns: number;
  totalPMSchedules: number;
}

const KPI_CARDS: { key: keyof DashboardData; icon: string; label: string; color: string; bg: string }[] = [
  { key: 'openBreakdowns', icon: 'warning', label: 'Open Breakdowns', color: '#991b1b', bg: '#fde2e2' },
  { key: 'criticalBreakdowns', icon: 'error', label: 'Critical Breakdowns', color: '#991b1b', bg: '#fde2e2' },
  { key: 'machinesDown', icon: 'power_off', label: 'Machines Down', color: '#991b1b', bg: '#fde2e2' },
  { key: 'todayPM', icon: 'schedule', label: "Today's PM", color: '#b45309', bg: '#fef3c7' },
  { key: 'pmOverdue', icon: 'event_busy', label: 'PM Overdue', color: '#991b1b', bg: '#fde2e2' },
  { key: 'pmCompleted', icon: 'task_alt', label: 'PM Completed', color: '#166534', bg: '#d4edda' },
  { key: 'calibrationDue', icon: 'straighten', label: 'Calibration Due', color: '#b45309', bg: '#fef3c7' },
  { key: 'calibrationOverdue', icon: 'report', label: 'Calibration Overdue', color: '#991b1b', bg: '#fde2e2' },
  { key: 'mtbf', icon: 'monitor', label: 'MTBF', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'mttr', icon: 'timer', label: 'MTTR', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'totalBreakdowns', icon: 'build', label: 'Total Breakdowns', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'totalPMSchedules', icon: 'calendar_month', label: 'Total PM Schedules', color: '#6b7280', bg: '#f3f4f6' },
];

export default function MaintenanceDashboard() {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData>({
    openBreakdowns: 0, criticalBreakdowns: 0, machinesDown: 0,
    todayPM: 0, pmOverdue: 0, pmCompleted: 0,
    calibrationDue: 0, calibrationOverdue: 0,
    mtbf: 0, mttr: 0, totalBreakdowns: 0, totalPMSchedules: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: d } = await apiClient.get('/v1/maintenance/dashboard');
        setData((c) => ({ ...c, ...d }));
      } catch (e) { toast(getApiErrorMessage(e, 'Dashboard load failed.'), 'error'); }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <>
      <div className="pg-head">
        <h1>Maintenance Dashboard</h1>
        <p>Real-time maintenance operations overview</p>
      </div>

      <div className="panel">
        {loading ? (
          <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading dashboard...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, padding: 20 }}>
            {KPI_CARDS.map((kpi) => (
              <div key={kpi.key} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 24, color: kpi.color }}>{kpi.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{data[kpi.key]}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
