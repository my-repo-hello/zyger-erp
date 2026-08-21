import { SALES_DC_CONFIG } from '../../../../config/deliveryChallanConfig';
import DeliveryChallanScreen from '../shared/DeliveryChallanScreen';

export default function SalesDcPage({ initialDocId, viewOnly }: { initialDocId?: string; viewOnly?: boolean } = {}) {
  return <DeliveryChallanScreen config={SALES_DC_CONFIG} initialDocId={initialDocId} viewOnly={viewOnly} />;
}