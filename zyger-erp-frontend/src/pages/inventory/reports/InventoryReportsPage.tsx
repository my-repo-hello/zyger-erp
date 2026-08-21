import { useMemo, useState } from 'react';
import { useTabs } from '../../../contexts/TabsContext';
import { getScreenComponent } from '../../../config/screenRegistry';
import { useReportsOverview } from '../../../hooks/useInventoryReports';
import { getApiErrorMessage } from '../../../utils/apiError';
import ReportKpiCards from './ReportKpiCards';
import type { KpiCardConfig } from './reportsConfig';
import DrilldownPage from './DrilldownPage';
import StatusBarChart from './charts/StatusBarChart';
import CategoryDonut from './charts/CategoryDonut';
import LocationBarChart from './charts/LocationBarChart';
import TrendLineChart from './charts/TrendLineChart';
import AccuracyGauge from './charts/AccuracyGauge';
import TopItemsBarChart from './charts/TopItemsBarChart';

type Period = 'LAST_7' | 'LAST_30' | 'THIS_MONTH' | 'THIS_YEAR';

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getRange(period: Period): { fromDate: string; toDate: string } {
  const now = new Date();
  const toDate = toDateInput(now);

  if (period === 'LAST_7') {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return { fromDate: toDateInput(from), toDate };
  }

  if (period === 'LAST_30') {
    const from = new Date(now);
    from.setDate(now.getDate() - 29);
    return { fromDate: toDateInput(from), toDate };
  }

  if (period === 'THIS_MONTH') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { fromDate: toDateInput(from), toDate };
  }

  const from = new Date(now.getFullYear(), 0, 1);
  return { fromDate: toDateInput(from), toDate };
}

export default function InventoryReportsPage() {
  const { openTab } = useTabs();

  const [period, setPeriod] = useState<Period>('LAST_30');

  const { fromDate, toDate } = useMemo(() => getRange(period), [period]);

  const overviewQuery = useReportsOverview(fromDate, toDate);

  const handleCardClick = (card: KpiCardConfig) => {
    if (card.screenId) {
      openTab({
        id: card.screenId,
        label: card.label,
        icon: card.icon,
        component: getScreenComponent(card.screenId),
        props: { title: card.label, screenId: card.screenId },
      });
      return;
    }

    if (card.drilldown) {
      openTab({
        id: `drilldown-${card.drilldown}`,
        label: card.label,
        icon: card.icon,
        component: DrilldownPage,
        props: { drilldownType: card.drilldown },
      });
    }
  };

  const openScreenTab = (screenId: string, label: string, icon: string) => {
    openTab({
      id: screenId,
      label,
      icon,
      component: getScreenComponent(screenId),
      props: { title: label, screenId },
    });
  };

  const overview = overviewQuery.data;

  return (
    <>
      <div className="pg-head">
        <h1>Inventory Reports</h1>
        <p>BI dashboard — cards, charts, ledger & current stock</p>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>Time Period:</span>
            <select
              className="in"
              value={period}
              onChange={(event) => setPeriod(event.target.value as Period)}
              style={{ width: '160px' }}
            >
              <option value="LAST_7">Last 7 Days</option>
              <option value="LAST_30">Last 30 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="THIS_YEAR">This Year</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn"
              onClick={() =>
                openScreenTab('inventory-log', 'Inventory Log', 'menu_book')
              }
            >
              <span className="material-symbols-rounded">menu_book</span>
              Inventory Log
            </button>

            <button
              className="btn"
              onClick={() =>
                openScreenTab('current-stock', 'Current Stock', 'inventory')
              }
            >
              <span className="material-symbols-rounded">inventory</span>
              Current Stock
            </button>
          </div>
        </div>
      </div>

      {overviewQuery.isPending ? (
        <div className="panel">
          <div className="empty">
            <span className="material-symbols-rounded">hourglass_empty</span>
            Loading inventory reports...
          </div>
        </div>
      ) : overviewQuery.isError ? (
        <div className="panel">
          <div className="empty">
            <span className="material-symbols-rounded">error</span>
            {getApiErrorMessage(
              overviewQuery.error,
              'Unable to load inventory reports.'
            )}
            <div style={{ marginTop: '14px' }}>
              <button className="btn" onClick={() => overviewQuery.refetch()}>
                <span className="material-symbols-rounded">refresh</span>
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <ReportKpiCards kpis={overview?.kpis} onCardClick={handleCardClick} />

          <div className="report-grid">
            <div className="panel">
              <div className="panel-h">
                <h2>
                  <span className="material-symbols-rounded">bar_chart</span>
                  Inventory Status (Monthly)
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                <StatusBarChart data={overview?.monthlyStatus ?? []} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-h">
                <h2>
                  <span className="material-symbols-rounded">donut_large</span>
                  Stock by Category
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                <CategoryDonut data={overview?.categoryDistribution ?? []} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-h">
                <h2>
                  <span className="material-symbols-rounded">show_chart</span>
                  Inward vs Issue Trend
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                <TrendLineChart data={overview?.inwardIssueTrend ?? []} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-h">
                <h2>
                  <span className="material-symbols-rounded">warehouse</span>
                  Stock by Location
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                <LocationBarChart data={overview?.locationDistribution ?? []} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-h">
                <h2>
                  <span className="material-symbols-rounded">leaderboard</span>
                  Top 10 Items by Value
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                <TopItemsBarChart data={overview?.topItemsByValue ?? []} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-h">
                <h2>
                  <span className="material-symbols-rounded">speed</span>
                  Inventory Accuracy
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                <AccuracyGauge value={overview?.kpis?.accuracyPct ?? 0} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}