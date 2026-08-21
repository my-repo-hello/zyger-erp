export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea';
  options?: string[];
  required?: boolean;
  span2?: boolean;
}

export interface LineFieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  readonly?: boolean;
}

export interface ColumnDef {
  label: string;
  field: string;
  numeric?: boolean;
}

export interface DocScreenConfig {
  docType: string;
  title: string;
  subtitle: string;
  columns: ColumnDef[];
  statusField: string;
  statusOptions: string[];
  typeFilter?: { field: string; label: string; options: string[] };
  fields: FieldDef[];
  lines?: {
    title: string;
    fields: LineFieldDef[];
    seed?: Record<string, string>[];
  };
}

export const PRODUCTION_BOM_CONFIG: DocScreenConfig = {
  docType: 'production-bom',
  title: 'Production BOM',
  subtitle: 'Bill of Materials with multi-level sub-assembly support',
  columns: [
    { label: 'Doc No', field: 'docNo' },
    { label: 'Date', field: 'date' },
    { label: 'Item', field: 'itemCode' },
    { label: 'Revision', field: 'itemRevision' },
    { label: 'Version', field: 'bomVersion' },
    { label: 'Status', field: 'status' },
  ],
  statusField: 'status',
  statusOptions: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
  fields: [
    { key: 'itemCode', label: 'Item Code *', type: 'text', required: true },
    { key: 'itemRevision', label: 'Revision', type: 'text' },
    { key: 'bomVersion', label: 'Version', type: 'text' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'baseQuantity', label: 'Base Quantity', type: 'number' },
    { key: 'baseUom', label: 'UOM', type: 'text' },
    { key: 'effectiveFrom', label: 'Effective From', type: 'date' },
    { key: 'effectiveTo', label: 'Effective To', type: 'date' },
    { key: 'approvedBy', label: 'Approved By', type: 'text' },
    { key: 'releaseDate', label: 'Release Date', type: 'date' },
    { key: 'obsoleteDate', label: 'Obsolete Date', type: 'date' },
    { key: 'parentBomId', label: 'Parent BOM ID', type: 'number', span2: true },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
  lines: {
    title: 'BOM Components',
    fields: [
      { key: 'lineNo', label: 'Line #', type: 'number' },
      { key: 'componentItemCode', label: 'Component Item *', type: 'text' },
      { key: 'componentRevision', label: 'Revision', type: 'text' },
      { key: 'quantityPer', label: 'Qty/Unit *', type: 'number' },
      { key: 'uom', label: 'UOM', type: 'text' },
      { key: 'scrapPercentage', label: 'Scrap %', type: 'number' },
      { key: 'yieldPercentage', label: 'Yield %', type: 'number' },
      { key: 'operationSequenceLink', label: 'Op Link', type: 'number' },
      { key: 'issueMethod', label: 'Issue Method', type: 'select', options: ['Manual', 'Backflush', 'Auto'] },
      { key: 'supplyType', label: 'Supply Type', type: 'select', options: ['Make', 'Buy', 'Subcontract'] },
      { key: 'alternateGroup', label: 'Alt Group', type: 'text' },
      { key: 'substituteItem', label: 'Substitute', type: 'text' },
      { key: 'priority', label: 'Priority', type: 'number' },
      { key: 'warehouse', label: 'Warehouse', type: 'text' },
      { key: 'childBomId', label: 'Child BOM ID', type: 'number' },
      { key: 'remarks', label: 'Remarks', type: 'text' },
    ],
  },
};

export const ROUTE_SHEET_CONFIG: DocScreenConfig = {
  docType: 'route-sheet',
  title: 'Route Sheet',
  subtitle: 'Manufacturing operations sequence with work center assignments',
  columns: [
    { label: 'Doc No', field: 'docNo' },
    { label: 'Date', field: 'date' },
    { label: 'Item', field: 'itemCode' },
    { label: 'Revision', field: 'itemRevision' },
    { label: 'Version', field: 'routeVersion' },
    { label: 'Status', field: 'status' },
  ],
  statusField: 'status',
  statusOptions: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
  fields: [
    { key: 'itemCode', label: 'Item Code *', type: 'text', required: true },
    { key: 'itemRevision', label: 'Revision', type: 'text' },
    { key: 'routeVersion', label: 'Version', type: 'text' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'baseQuantity', label: 'Base Quantity', type: 'number' },
    { key: 'baseUom', label: 'UOM', type: 'text' },
    { key: 'effectiveFrom', label: 'Effective From', type: 'date' },
    { key: 'effectiveTo', label: 'Effective To', type: 'date' },
    { key: 'approvedBy', label: 'Approved By', type: 'text' },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
  lines: {
    title: 'Operations',
    fields: [
      { key: 'sequenceNo', label: 'Seq # *', type: 'number' },
      { key: 'operationCode', label: 'Operation *', type: 'text' },
      { key: 'operationDescription', label: 'Description', type: 'text' },
      { key: 'workCenterCode', label: 'Work Center', type: 'text' },
      { key: 'machineCode', label: 'Machine', type: 'text' },
      { key: 'setupTime', label: 'Setup (min)', type: 'number' },
      { key: 'cycleTime', label: 'Cycle (min)', type: 'number' },
      { key: 'runBasis', label: 'Run Basis', type: 'select', options: ['Per Piece', 'Per Batch', 'Per Hour'] },
      { key: 'overlapPercentage', label: 'Overlap %', type: 'number' },
      { key: 'queueTime', label: 'Queue (min)', type: 'number' },
      { key: 'moveTime', label: 'Move (min)', type: 'number' },
      { key: 'inspectionRequired', label: 'Inspection', type: 'select', options: ['true', 'false'] },
      { key: 'subcontractFlag', label: 'Subcontract', type: 'select', options: ['true', 'false'] },
      { key: 'toolRequired', label: 'Tool Required', type: 'select', options: ['true', 'false'] },
      { key: 'fixtureRequired', label: 'Fixture Required', type: 'select', options: ['true', 'false'] },
      { key: 'skillRequired', label: 'Skill Required', type: 'text' },
      { key: 'ncProgramReference', label: 'NC Program', type: 'text' },
      { key: 'standardCostRate', label: 'Cost Rate', type: 'number' },
      { key: 'remarks', label: 'Remarks', type: 'text' },
    ],
  },
};

export const WORK_ORDER_CONFIG: DocScreenConfig = {
  docType: 'work-order',
  title: 'Work Order',
  subtitle: 'Production work order with operation tracking and material requirements',
  columns: [
    { label: 'Doc No', field: 'docNo' },
    { label: 'Date', field: 'date' },
    { label: 'Item', field: 'itemCode' },
    { label: 'Order Qty', field: 'orderQuantity', numeric: true },
    { label: 'Due Date', field: 'dueDate' },
    { label: 'Priority', field: 'priority' },
    { label: 'Status', field: 'status' },
  ],
  statusField: 'status',
  statusOptions: ['DRAFT', 'SUBMITTED', 'APPROVED', 'RELEASED', 'IN_PROCESS', 'COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED'],
  fields: [
    { key: 'itemCode', label: 'Item Code *', type: 'text', required: true },
    { key: 'itemRevision', label: 'Revision', type: 'text' },
    { key: 'drawingNumber', label: 'Drawing No', type: 'text' },
    { key: 'orderQuantity', label: 'Order Quantity *', type: 'number', required: true },
    { key: 'uom', label: 'UOM', type: 'text' },
    { key: 'woType', label: 'WO Type', type: 'select', options: ['Standard', 'Rework', 'Sample', 'Urgent', 'Internal', 'Subcontract'] },
    { key: 'priority', label: 'Priority', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    { key: 'dueDate', label: 'Due Date *', type: 'date', required: true },
    { key: 'plannedStartDate', label: 'Planned Start', type: 'date' },
    { key: 'plannedEndDate', label: 'Planned End', type: 'date' },
    { key: 'actualStartDate', label: 'Actual Start', type: 'date' },
    { key: 'actualEndDate', label: 'Actual End', type: 'date' },
    { key: 'bomId', label: 'BOM ID', type: 'number' },
    { key: 'routeId', label: 'Route ID', type: 'number' },
    { key: 'plant', label: 'Plant', type: 'text' },
    { key: 'productionLine', label: 'Production Line', type: 'text' },
    { key: 'customerCode', label: 'Customer', type: 'text' },
    { key: 'customerOrderNo', label: 'Customer Order No', type: 'text' },
    { key: 'sourceType', label: 'Source Type', type: 'select', options: ['Manual', 'Sales Order', 'Forecast'] },
    { key: 'sourceDocNo', label: 'Source Doc No', type: 'text' },
    { key: 'approvedBy', label: 'Approved By', type: 'text' },
    { key: 'releasedBy', label: 'Released By', type: 'text' },
    { key: 'closedBy', label: 'Closed By', type: 'text' },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
  lines: {
    title: 'Operations',
    fields: [
      { key: 'operationSequence', label: 'Seq # *', type: 'number' },
      { key: 'operationCode', label: 'Operation', type: 'text' },
      { key: 'operationDescription', label: 'Description', type: 'text' },
      { key: 'workCenterCode', label: 'Work Center', type: 'text' },
      { key: 'machineCode', label: 'Machine', type: 'text' },
      { key: 'plannedQuantity', label: 'Planned Qty', type: 'number' },
      { key: 'completedQuantity', label: 'Completed Qty', type: 'number' },
      { key: 'goodQuantity', label: 'Good Qty', type: 'number' },
      { key: 'scrapQuantity', label: 'Scrap Qty', type: 'number' },
      { key: 'reworkQuantity', label: 'Rework Qty', type: 'number' },
      { key: 'setupTimePlanned', label: 'Setup Planned', type: 'number' },
      { key: 'setupTimeActual', label: 'Setup Actual', type: 'number' },
      { key: 'cycleTimePlanned', label: 'Cycle Planned', type: 'number' },
      { key: 'cycleTimeActual', label: 'Cycle Actual', type: 'number' },
      { key: 'operator', label: 'Operator', type: 'text' },
      { key: 'ncProgramReference', label: 'NC Program', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed', 'On Hold'] },
      { key: 'remarks', label: 'Remarks', type: 'text' },
    ],
  },
};

export interface MaterialLineDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  readonly?: boolean;
}

export interface WorkOrderConfig extends DocScreenConfig {
  materialLines: {
    title: string;
    fields: MaterialLineDef[];
  };
}

export const WORK_ORDER_MATERIAL_FIELDS: MaterialLineDef[] = [
  { key: 'lineNo', label: 'Line #', type: 'number' },
  { key: 'componentItemCode', label: 'Component Item *', type: 'text' },
  { key: 'componentRevision', label: 'Revision', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'requiredQuantity', label: 'Required Qty', type: 'number' },
  { key: 'issuedQuantity', label: 'Issued Qty', type: 'number' },
  { key: 'returnedQuantity', label: 'Returned Qty', type: 'number' },
  { key: 'shortageQuantity', label: 'Shortage', type: 'number' },
  { key: 'requiredDate', label: 'Required Date', type: 'date' },
  { key: 'issueMethod', label: 'Issue Method', type: 'select', options: ['Manual', 'Backflush', 'Auto'] },
  { key: 'batchNumber', label: 'Batch No', type: 'text' },
  { key: 'reservationStatus', label: 'Reservation', type: 'select', options: ['None', 'Reserved', 'Partial'] },
  { key: 'issueStatus', label: 'Issue Status', type: 'select', options: ['Pending', 'Issued', 'Partial'] },
  { key: 'remarks', label: 'Remarks', type: 'text' },
];

export const SHOP_FLOOR_ENTRY_CONFIG: DocScreenConfig = {
  docType: 'shop-floor-entry',
  title: 'Shop Floor Entry',
  subtitle: 'Record operator activity, machine time, and production quantities',
  columns: [
    { label: 'Doc No', field: 'docNo' },
    { label: 'Date', field: 'date' },
    { label: 'Work Order', field: 'workOrderNo' },
    { label: 'Operation', field: 'operationCode' },
    { label: 'Operator', field: 'operatorCode' },
    { label: 'Good Qty', field: 'goodQuantity', numeric: true },
    { label: 'Status', field: 'status' },
  ],
  statusField: 'status',
  statusOptions: ['DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED'],
  fields: [
    { key: 'workOrderNo', label: 'Work Order No *', type: 'text', required: true },
    { key: 'operationSequence', label: 'Operation Seq', type: 'number' },
    { key: 'operationCode', label: 'Operation Code', type: 'text' },
    { key: 'operatorCode', label: 'Operator *', type: 'text', required: true },
    { key: 'machineCode', label: 'Machine', type: 'text' },
    { key: 'startTime', label: 'Start Time', type: 'date' },
    { key: 'endTime', label: 'End Time', type: 'date' },
    { key: 'goodQuantity', label: 'Good Quantity', type: 'number' },
    { key: 'scrapQuantity', label: 'Scrap Quantity', type: 'number' },
    { key: 'reworkQuantity', label: 'Rework Quantity', type: 'number' },
    { key: 'inspectionResult', label: 'Inspection Result', type: 'select', options: ['PASS', 'FAIL', 'HOLD', 'PENDING'] },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
};
