import type { DeliveryChallanTypeConfig } from '../types/inventory/deliveryChallan.types';

export const SALES_DC_CONFIG: DeliveryChallanTypeConfig = {
  screenId: 'sales-dc',
  title: 'Sales DC',
  prefix: 'SDC',
  icon: 'local_shipping',
  subtitle: 'Sales DC dispatch document',
  apiPath: '/inventory/delivery-challan/sales-dc',
  transactionType: 'DC_DISPATCH',
  partySource: 'customers',
  partyLabel: 'Customer',
};

export const JO_DC_CONFIG: DeliveryChallanTypeConfig = {
  screenId: 'jo-dc',
  title: 'JO DC',
  prefix: 'JDC',
  icon: 'local_shipping',
  subtitle: 'JO DC dispatch document',
  apiPath: '/inventory/delivery-challan/jo-dc',
  transactionType: 'JO_ISSUE',
  partySource: 'suppliers',
  partyLabel: 'Vendor',
};

export const GENERAL_DC_CONFIG: DeliveryChallanTypeConfig = {
  screenId: 'general-dc',
  title: 'General DC',
  prefix: 'GDC',
  icon: 'local_shipping',
  subtitle: 'General DC dispatch document',
  apiPath: '/inventory/delivery-challan/general-dc',
  transactionType: 'DC_DISPATCH',
  partySource: 'suppliers',
  partyLabel: 'Vendor',
};

export const RETURN_DC_CONFIG: DeliveryChallanTypeConfig = {
  screenId: 'return-dc',
  title: 'Return DC',
  prefix: 'RDC',
  icon: 'local_shipping',
  subtitle: 'Return DC dispatch document',
  apiPath: '/inventory/delivery-challan/return-dc',
  transactionType: 'DC_RETURN_OUT',
  partySource: 'suppliers',
  partyLabel: 'Vendor',
};

export const TRANSFER_DC_CONFIG: DeliveryChallanTypeConfig = {
  screenId: 'transfer-dc',
  title: 'Transfer DC',
  prefix: 'TDC',
  icon: 'local_shipping',
  subtitle: 'Transfer DC dispatch document',
  apiPath: '/inventory/delivery-challan/transfer-dc',
  transactionType: 'TRANSFER_OUT',
  partySource: 'suppliers',
  partyLabel: 'Vendor',
};