import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

interface PurchaseDashboardData {
  openPR: number;
  openEnquiries: number;
  pendingQuotations: number;
  openPO: number;
  pendingPOApproval: number;
  partiallyReceived: number;
  delayedPO: number;
  openJobOrders: number;
  overdueJobOrders: number;
  totalPR: number;
  totalPO: number;
  totalJO: number;
}

const KPI_CARDS: { key: keyof PurchaseDashboardData; icon: string; label: string; color: string; bg: string }[] = [
  { key: 'openPR', icon: 'assignment', label: 'Open PR', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'openEnquiries', icon: 'mark_email_unread', label: 'Open Enquiries', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'pendingQuotations', icon: 'request_quote', label: 'Pending Quotations', color: '#b45309', bg: '#fef3c7' },
  { key: 'openPO', icon: 'shopping_cart_checkout', label: 'Open PO', color: '#166534', bg: '#d4edda' },
  { key: 'pendingPOApproval', icon: 'hourglass_top', label: 'PO Approval Pending', color: '#b45309', bg: '#fef3c7' },
  { key: 'partiallyReceived', icon: 'inventory_2', label: 'Partially Received', color: '#b45309', bg: '#fef3c7' },
  { key: 'delayedPO', icon: 'event_busy', label: 'Delayed PO', color: '#991b1b', bg: '#fde2e2' },
  { key: 'openJobOrders', icon: 'engineering', label: 'Open Job Orders', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'overdueJobOrders', icon: 'report', label: 'Overdue Job Orders', color: '#991b1b', bg: '#fde2e2' },
  { key: 'totalPR', icon: 'description', label: 'Total PR', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'totalPO', icon: 'receipt_long', label: 'Total PO', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'totalJO', icon: 'work', label: 'Total Job Orders', color: '#6b7280', bg: '#f3f4f6' },
];

const EMPTY: PurchaseDashboardData = {
  openPR: 0, openEnquiries: 0, pendingQuotations: 0, openPO: 0,
  pendingPOApproval: 0, partiallyReceived: 0, delayedPO: 0,
  openJobOrders: 0, overdueJobOrders: 0, totalPR: 0, totalPO: 0, totalJO: 0,
};

export default function PurchaseDashboard() {
  const { toast } = useToast();
  const [data, setData] = useState<PurchaseDashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: d } = await apiClient.get('/v1/purchase/dashboard');
        setData((c) => ({ ...c, ...d }));
      } catch (e) { toast(getApiErrorMessage(e, 'Dashboard load failed.'), 'error'); }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <>
      <div className="pg-head">
        <h1>Purchase Dashboard</h1>
        <p>Procurement and subcontract order monitoring</p>
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
