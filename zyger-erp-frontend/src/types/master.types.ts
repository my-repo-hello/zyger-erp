export interface ItemMasterDto {
  code: string;
  description: string;
  uom: string;
  defaultRate?: number;
  requiresBatch?: boolean;
  requiresHeat?: boolean;
  active?: boolean;
}

export interface SupplierDto {
  code: string;
  name: string;
  active?: boolean;
}

export interface PurchaseOrderDto {
  number: string;
  supplierCode?: string;
  status?: string;
}

export interface LocationDto {
  code: string;
  name?: string;
  active?: boolean;
}