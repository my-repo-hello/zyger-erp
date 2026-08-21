import { INWARD_TYPE_LIST, type InwardType } from '../../../config/inwardConfig';
import type { InwardDashboardSummary } from '../../../types/inward.types';
import { formatMoney, formatNumber } from '../../../utils/format';

interface InwardSummaryCardsProps {
  summary?: InwardDashboardSummary;
  activeType: InwardType | 'ALL' | null;
  onSelectType: (type: InwardType | 'ALL') => void;
  onOpenPending?: () => void;
}

export default function InwardSummaryCards({
  summary,
  activeType,
  onSelectType,
  onOpenPending,
}: InwardSummaryCardsProps) {
  const total = summary?.total ?? { count: 0, qty: 0, amount: 0 };
  const pending = summary?.pending ?? { count: 0, qty: 0, amount: 0 };

  return (
    <div className="stats inward-cards">
      <div
        className={`stat ${activeType === 'ALL' ? 'active' : ''}`}
        onClick={() => onSelectType('ALL')}
      >
        <div className="ic" style={{ background: 'var(--dark-nav)' }}>
          <span className="material-symbols-rounded">inventory</span>
        </div>
        <div>
          <div className="l">Total Inward</div>
          <div className="v">{formatNumber(total.count)}</div>
          <div className="s">
            Qty {formatNumber(total.qty)} • {formatMoney(total.amount)}
          </div>
        </div>
      </div>

      <div
        className="stat"
        onClick={() => onOpenPending?.()}
        title="Open pending inward documents"
        style={{ cursor: 'pointer' }}
      >
        <div className="ic" style={{ background: 'var(--yellow)' }}>
          <span className="material-symbols-rounded">hourglass_top</span>
        </div>
        <div>
          <div className="l">Pending Approval</div>
          <div className="v">{formatNumber(pending.count)}</div>
          <div className="s">
            Qty {formatNumber(pending.qty)} • {formatMoney(pending.amount)}
          </div>
        </div>
      </div>

      {INWARD_TYPE_LIST.map((config) => {
        const value =
          summary?.byType?.[config.type] ?? { count: 0, qty: 0, amount: 0 };

        return (
          <div
            key={config.type}
            className={`stat ${activeType === config.type ? 'active' : ''}`}
            onClick={() => onSelectType(config.type)}
          >
            <div className="ic" style={{ background: config.color }}>
              <span className="material-symbols-rounded">{config.icon}</span>
            </div>
            <div>
              <div className="l">{config.label}</div>
              <div className="v">{formatNumber(value.count)}</div>
              <div className="s">
                Qty {formatNumber(value.qty)} • {formatMoney(value.amount)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}