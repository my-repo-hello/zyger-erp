import { ISSUE_AGAINST_RECEIPT_CONFIG } from '../../../../config/stockIssueConfig';
import StockIssueScreen from '../shared/StockIssueScreen';

export default function IssueAgainstReceiptPage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <StockIssueScreen config={ISSUE_AGAINST_RECEIPT_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}