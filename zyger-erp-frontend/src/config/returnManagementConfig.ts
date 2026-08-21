import type { ReturnManagementTypeConfig } from '../types/inventory/returnManagement.types';

export const REASON_CODE_OPTIONS = [
  'Quality Rejection',
  'Wrong Material',
  'Excess Quantity',
  'Damage',
  'Other',
];

export const INWARD_RETURN_CONFIG: ReturnManagementTypeConfig = {
  screenId: 'inward-return',
  title: 'Inward Return',
  prefix: 'IRT',
  icon: 'assignment_return',
  subtitle: 'Inward Return — stock increases on posting',
  apiPath: '/inventory/return-management/inward-return',
  transactionType: 'INWARD_RETURN',
  partySource: 'suppliers',
  partyLabel: 'Supplier',
};

export const DC_RETURN_CONFIG: ReturnManagementTypeConfig = {
  screenId: 'dc-return',
  title: 'DC Return',
  prefix: 'DRT',
  icon: 'assignment_return',
  subtitle: 'DC Return — stock increases on posting',
  apiPath: '/inventory/return-management/dc-return',
  transactionType: 'DC_RETURN',
  partySource: 'customers',
  partyLabel: 'Customer',
};

export const INVOICE_RETURN_CONFIG: ReturnManagementTypeConfig = {
  screenId: 'invoice-return',
  title: 'Invoice Return',
  prefix: 'IVR',
  icon: 'assignment_return',
  subtitle: 'Invoice Return — stock increases on posting',
  apiPath: '/inventory/return-management/invoice-return',
  transactionType: 'SALES_RETURN',
  partySource: 'customers',
  partyLabel: 'Customer',
};

export const INTERNAL_RETURN_CONFIG: ReturnManagementTypeConfig = {
  screenId: 'internal-return',
  title: 'Internal Return',
  prefix: 'INR',
  icon: 'assignment_return',
  subtitle: 'Internal Return — stock increases on posting',
  apiPath: '/inventory/return-management/internal-return',
  transactionType: 'INTERNAL_RETURN',
  partySource: 'departments',
  partyLabel: 'Department',
};

export const RECEIVED_AGAINST_ISSUE_CONFIG: ReturnManagementTypeConfig = {
  screenId: 'received-against-issue',
  title: 'Received Against Issue',
  prefix: 'RAI',
  icon: 'assignment_return',
  subtitle: 'Received Against Issue — stock increases on posting',
  apiPath: '/inventory/return-management/received-against-issue',
  transactionType: 'ISSUE_RETURN',
  partySource: 'departments',
  partyLabel: 'Department',
};

export const RECEIPT_RETURN_CONFIG: ReturnManagementTypeConfig = {
  screenId: 'receipt-return',
  title: 'Receipt Return',
  prefix: 'RRT',
  icon: 'assignment_return',
  subtitle: 'Receipt Return — stock increases on posting',
  apiPath: '/inventory/return-management/receipt-return',
  transactionType: 'RECEIPT_RETURN',
  partySource: 'suppliers',
  partyLabel: 'Supplier',
};