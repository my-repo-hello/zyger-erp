import { RECEIVED_AGAINST_ISSUE_CONFIG } from '../../../../config/returnManagementConfig';
import ReturnManagementScreen from '../shared/ReturnManagementScreen';

export default function ReceivedAgainstIssuePage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <ReturnManagementScreen config={RECEIVED_AGAINST_ISSUE_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}