export type DeliveryChallanPartySource = 'customers' | 'suppliers';

export type DeliveryChallanDocumentAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'post'
  | 'cancel'
  | 'reopen';

export interface DeliveryChallanTypeConfig {
  screenId: string;
  title: string;
  prefix: string;
  icon: string;
  subtitle: string;
  apiPath: string;
  transactionType: string;
  partySource: DeliveryChallanPartySource;
  partyLabel: string;
}

export interface DeliveryChallanLinePayload {
  itemCode: string;
  qty: number;
  batchNo?: string;
  heatNo?: string;
  location: string;
  remarks?: string;
}

export interface DeliveryChallanPayload {
  date: string;
  party: string;
  sourceLocation: string;
  destinationLocation?: string;
  vehicleNo?: string;
  transporter?: string;
  linkedDocumentNo?: string;
  remarks?: string;
  lines: DeliveryChallanLinePayload[];
}

export interface DeliveryChallanLineDto {
  itemCode: string;
  itemDesc?: string;
  qty?: number;
  batchNo?: string;
  heatNo?: string;
  location?: string;
  remarks?: string;
}

export interface DeliveryChallanDto {
  id?: string;
  docNo?: string;
  date: string;
  party: string;
  sourceLocation: string;
  vehicleNo?: string;
  transporter?: string;
  linkedDocumentNo?: string;
  remarks?: string;
  status: string;
  lines: DeliveryChallanLineDto[];
}

export interface DeliveryChallanListRowDto {
  id: string;
  docNo: string;
  date: string;
  party?: string;
  vehicleNo?: string;
  qty?: number;
  status: string;
}

export interface DeliveryChallanListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  status?: string;
}