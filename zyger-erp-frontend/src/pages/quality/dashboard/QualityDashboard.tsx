import { useQualityDashboard } from '../../../hooks/useQualityDocs';
import type { QualityDashboardData } from '../../../types/quality/quality.types';
import { formatNumber } from '../../../utils/format';

interface Card {
  key: string;
  label: string;
  icon: string;
  color: string;
  value: number;
  sub?: string;
}

const TYPE_LABELS: Record<string, string> = {
  IQC: 'IQC',
  LO: 'LO',
  JOMIN: 'JOMIN',
  FAI: 'FAI',
  IPQC: 'IPQC',
  LINE: 'Line',
  LAST_OFF: 'Last Off',
  FINAL: 'Final',
};

function buildCards(d: QualityDashboardData): Card[] {
  const decided = d.pass + d.fail + d.hold;
  const passRate = decided === 0 ? null : (d.pass / decided) * 100;

  return [
    { key: 'pending', label: 'Inspections Pending', icon: 'pending_actions', color: 'var(--yellow)', value: d.pendingTotal, sub: 'all types, awaiting decision' },
    { key: 'openNcr', label: 'Open NCR', icon: 'report', color: 'var(--red)', value: d.openNcr },
    { key: 'concession', label: 'Pending Concessions', icon: 'rule', color: '#b7791f', value: d.openConcession },
    { key: 'complaints', label: 'Customer Complaints', icon: 'support_agent', color: 'var(--red)', value: d.openComplaints, sub: 'open' },
    { key: 'capa', label: 'Open CAPA', icon: 'published_with_changes', color: 'var(--blue)', value: d.openCapa },
    { key: 'eightd', label: 'Open 8D', icon: 'article', color: 'var(--blue)', value: d.open8d },
    {
      key: 'pass',
      label: 'Decided PASS',
      icon: 'check_circle',
      color: 'var(--green)',
      value: d.pass,
      sub: passRate != null ? `first-pass yield ${passRate.toFixed(1)}%` : `${formatNumber(d.fail)} failed • ${formatNumber(d.hold)} on hold`,
    },
    { key: 'cal7', label: 'Calibration Due ≤ 7d', icon: 'event_upcoming', color: 'var(--yellow)', value: d.calibration.dueWithin7Days, sub: `${formatNumber(d.calibration.overdue)} overdue • ${formatNumber(d.calibration.failed)} failed` },
  ];
}

export default function QualityDashboard() {
  const { data, isPending, isError, refetch } = useQualityDashboard();

  if (isPending) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">hourglass_empty</span> Loading quality summary...
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">error</span> Unable to load quality summary.
          <div style={{ marginTop: '14px' }}>
            <button className="btn" onClick={() => refetch()}>
              <span className="material-symbols-rounded">refresh</span> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingRows = Object.entries(data.pendingByType ?? {}).filter(([, v]) => Number(v ?? 0) > 0);

  return (
    <>
      <div className="stats">
        {buildCards(data).map((card) => (
          <div key={card.key} className="stat">
            <div className="ic" style={{ background: card.color }}>
              <span className="material-symbols-rounded">{card.icon}</span>
            </div>
            <div>
              <div className="l">{card.label}</div>
              <div className="v">{formatNumber(card.value)}</div>
              {card.sub && <div className="s">{card.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {pendingRows.length > 0 && (
        <div className="panel">
          <div className="panel-h">
            <h2>
              <span className="material-symbols-rounded">pending_actions</span> Pending by Inspection Type
            </h2>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Inspection Type</th>
                  <th className="num">Pending</th>
                </tr>
              </thead>
              <tbody>
                {pendingRows.map(([t, v]) => (
                  <tr key={t}>
                    <td>{TYPE_LABELS[t] ?? t}</td>
                    <td className="num">{formatNumber(Number(v))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
