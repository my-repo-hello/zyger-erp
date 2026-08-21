import type { StockIssueTypeConfig } from '../types/inventory/stockIssue.types';

export const GENERAL_ISSUE_CONFIG: StockIssueTypeConfig = {
  screenId: 'general-issue',
  title: 'General Stock Issue',
  prefix: 'GEI',
  icon: 'outbox',
  subtitle: 'General Issue — select Stock Issue Request to auto-fill, stock reduces on posting',
  apiPath: '/inventory/stock-issue/general-issue',
  transactionType: 'GENERAL_ISSUE',
  headerFields: [
    {
      key: 'department',
      label: 'Department',
      type: 'select',
      required: true,
      options: 'departments',
    },
    {
      key: 'purpose',
      label: 'Purpose',
      type: 'text',
      required: true,
    },
  ],
};

export const JO_DC_ISSUE_CONFIG: StockIssueTypeConfig = {
  screenId: 'jo-dc-issue',
  title: 'JO DC Issue',
  prefix: 'JDI',
  icon: 'outbox',
  subtitle: 'JO DC — select Stock Issue Request to auto-fill, stock reduces on posting',
  apiPath: '/inventory/stock-issue/jo-dc-issue',
  transactionType: 'JO_ISSUE',
  headerFields: [
    {
      key: 'vendor',
      label: 'Vendor',
      type: 'select',
      required: true,
      options: 'suppliers',
    },
    {
      key: 'jobOrderNo',
      label: 'Job Order',
      type: 'select',
      required: true,
      options: 'jobOrders',
    },
  ],
};

export const ISSUE_AGAINST_RECEIPT_CONFIG: StockIssueTypeConfig = {
  screenId: 'issue-against-receipt',
  title: 'Issue Against Receipt',
  prefix: 'IAR',
  icon: 'outbox',
  subtitle: 'Issue Against Receipt — select Stock Issue Request to auto-fill, stock reduces on posting',
  apiPath: '/inventory/stock-issue/issue-against-receipt',
  transactionType: 'ISSUE_AGAINST_RECEIPT',
  headerFields: [
    {
      key: 'originalReceiptNo',
      label: 'Original Receipt (GRN)',
      type: 'select',
      required: true,
      options: 'grns',
    },
  ],
};