export type GrnSourceType =
  | 'PO_INWARD'
  | 'LO_INWARD'
  | 'JO_INWARD'
  | 'GENERAL_INWARD'
  | 'RETURN_INWARD';

export type GrnDocumentAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'post'
  | 'cancel'
  | 'reopen';

export interface GrnSourceTypeOption {
  value: GrnSourceType;
  label: string;
}

export const GRN_SOURCE_TYPES: GrnSourceTypeOption[] = [
  { value: 'PO_INWARD', label: 'PO Inward' },
  { value: 'LO_INWARD', label: 'LO Inward' },
  { value: 'JO_INWARD', label: 'JO Inward' },
  { value: 'GENERAL_INWARD', label: 'General Inward' },
  { value: 'RETURN_INWARD', label: 'Return Inward' },
];

export function getGrnSourceTypeLabel(value?: string): string {
  return (
    GRN_SOURCE_TYPES.find((item) => item.value === value)?.label ??
    value ??
    '—'
  );
}

export interface GrnSourceDocumentOption {
  docNo: string;
  party?: string;
  date?: string;
}

export interface GrnNextNumber {
  prefix?: string;
  nextNumber: string;
}

export interface GrnLinePayload {
  itemCode: string;
  inspectedQty?: number;
  acceptedQty: number;
  rate?: number;
  rejectedQty?: number;
  batchNo?: string;
  heatNo?: string;
  location: string;
  remarks?: string;
}

export interface GrnPayload {
  date: string;
  sourceType: GrnSourceType;
  sourceDocumentNo: string;
  party: string;
  inspectionRef?: string;
  remarks?: string;
  lines: GrnLinePayload[];
}

export interface GrnLineDto {
  itemCode: string;
  itemDesc?: string;
  uom?: string;
  inspectedQty?: number;
  acceptedQty?: number;
  rate?: number;
  amount?: number;
  rejectedQty?: number;
  batchNo?: string;
  heatNo?: string;
  location?: string;
  remarks?: string;
}

export interface GrnDto {
  id?: string;
  docNo?: string;
  date: string;
  sourceType: GrnSourceType;
  sourceDocumentNo: string;
  party: string;
  inspectionRef?: string;
  remarks?: string;
  status: string;
  lines: GrnLineDto[];
}

export interface GrnListRowDto {
  id: string;
  docNo: string;
  date: string;
  sourceType?: string;
  sourceDocumentNo?: string;
  party?: string;
  qty?: number;
  status: string;
}

export interface GrnListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  status?: string;
}