import { JO_DC_ISSUE_CONFIG } from '../../../../config/stockIssueConfig';
import StockIssueScreen from '../shared/StockIssueScreen';

export default function JoDcIssuePage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <StockIssueScreen config={JO_DC_ISSUE_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}