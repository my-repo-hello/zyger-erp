import { RECEIPT_RETURN_CONFIG } from '../../../../config/returnManagementConfig';
import ReturnManagementScreen from '../shared/ReturnManagementScreen';

export default function ReceiptReturnPage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <ReturnManagementScreen config={RECEIPT_RETURN_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}