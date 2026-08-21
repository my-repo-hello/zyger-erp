export interface ActivityLogEntry {
  id: string;
  dateTime: string;
  module: 'Sales' | 'Purchase' | 'Inventory' | 'Quality' | 'Production' | 'Master';
  activity: string;
  refNo: string;
  party: string;
  user: string;
  status: string;
  timestamp: number;
}

const STORAGE_KEY = 'zyger_recent_activity_logs';

export function getInitialDefaultLogs(): ActivityLogEntry[] {
  const now = Date.now();
  return [
    {
      id: 'act-1',
      dateTime: 'Today, 11:35 AM',
      module: 'Inventory',
      activity: 'Material Inward Entry (POI-2026-0001)',
      refNo: 'POI-2026-0001',
      party: 'Tata Steel Ltd',
      user: 'Sanjai M',
      status: 'SUBMITTED',
      timestamp: now - 1000 * 60 * 30,
    },
    {
      id: 'act-2',
      dateTime: 'Today, 11:20 AM',
      module: 'Sales',
      activity: 'New Delivery Challan Created (SDC-2026-0001)',
      refNo: 'SDC-2026-0001',
      party: 'ABC Engineering Ltd',
      user: 'Sanjai M',
      status: 'APPROVED',
      timestamp: now - 1000 * 60 * 45,
    },
    {
      id: 'act-3',
      dateTime: 'Today, 11:05 AM',
      module: 'Purchase',
      activity: 'Purchase Order Issued (PO-2026-0001)',
      refNo: 'PO-2026-0001',
      party: 'Tata Steel Ltd',
      user: 'Sanjay Kumar',
      status: 'RELEASED',
      timestamp: now - 1000 * 60 * 60,
    },
    {
      id: 'act-4',
      dateTime: 'Today, 10:45 AM',
      module: 'Inventory',
      activity: 'DC Return Logged (RET-2026-0001)',
      refNo: 'RET-2026-0001',
      party: 'Precision Auto Tech',
      user: 'Sanjai M',
      status: 'RECEIVED',
      timestamp: now - 1000 * 60 * 80,
    },
    {
      id: 'act-5',
      dateTime: 'Today, 10:15 AM',
      module: 'Quality',
      activity: 'Inward Quality Inspection (IQC-2026-0001)',
      refNo: 'IQC-2026-0001',
      party: 'Tata Steel Ltd',
      user: 'Quality Inspector',
      status: 'PASSED',
      timestamp: now - 1000 * 60 * 110,
    },
  ];
}

export function getStoredActivityLogs(): ActivityLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialDefaultLogs();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getInitialDefaultLogs();
  } catch {
    return getInitialDefaultLogs();
  }
}

export function logSystemActivity(entry: {
  module: 'Sales' | 'Purchase' | 'Inventory' | 'Quality' | 'Production' | 'Master';
  activity: string;
  refNo?: string;
  party?: string;
  user?: string;
  status?: string;
  dateTime?: string;
}): ActivityLogEntry {
  const currentLogs = getStoredActivityLogs();
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = `Today, ${timeStr}`;

  const refNumber = entry.refNo || 'N/A';
  const newLog: ActivityLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    dateTime: entry.dateTime || dateStr,
    module: entry.module,
    activity: entry.activity,
    refNo: refNumber,
    party: entry.party || 'System',
    user: entry.user || 'Sanjai M',
    status: entry.status || 'CREATED',
    timestamp: now.getTime(),
  };

  // Prepend new log, filter existing log with same refNo if present, keep top 50 logs
  const filtered = currentLogs.filter(l => !refNumber || l.refNo !== refNumber);
  const updatedLogs = [newLog, ...filtered].slice(0, 50);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    // Trigger global event so Dashboard auto-updates live
    window.dispatchEvent(new Event('zyger-activity-log-updated'));
  } catch (e) {
    console.error('Failed to save activity log:', e);
  }

  return newLog;
}
