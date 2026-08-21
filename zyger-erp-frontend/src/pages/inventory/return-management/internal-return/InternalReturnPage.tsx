import { INTERNAL_RETURN_CONFIG } from '../../../../config/returnManagementConfig';
import ReturnManagementScreen from '../shared/ReturnManagementScreen';

export default function InternalReturnPage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <ReturnManagementScreen config={INTERNAL_RETURN_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}