import PurchaseDocScreen from '../PurchaseDocScreen';
import { PURCHASE_ORDER_CONFIG } from '../purchaseDocConfigs';

export default function PurchaseOrderPage() {
  return <PurchaseDocScreen config={PURCHASE_ORDER_CONFIG} />;
}
