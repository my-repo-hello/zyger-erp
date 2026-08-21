import { INWARD_RETURN_CONFIG } from '../../../../config/returnManagementConfig';
import ReturnManagementScreen from '../shared/ReturnManagementScreen';

export default function InwardReturnPage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <ReturnManagementScreen config={INWARD_RETURN_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}