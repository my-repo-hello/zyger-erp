import { RETURN_DC_CONFIG } from '../../../../config/deliveryChallanConfig';
import DeliveryChallanScreen from '../shared/DeliveryChallanScreen';

export default function ReturnDcPage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <DeliveryChallanScreen config={RETURN_DC_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}