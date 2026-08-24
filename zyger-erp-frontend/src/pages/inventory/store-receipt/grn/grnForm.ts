import type { ItemMasterDto } from '../../../../types/master.types';
import type {
  GrnDto,
  GrnLineDto,
  GrnPayload,
  GrnSourceType,
} from '../../../../types/inventory/grn.types';
import {
  toNumber,
  toOptionalNumber,
  todayISO,
} from '../../../../utils/format';

export interface GrnLineFormState {
  itemCode: string;
  itemDesc: string;
  uom: string;
  inspectedQty: string;
  acceptedQty: string;
  rate: string;
  amount: string;
  rejectedQty: string;
  batchNo: string;
  heatNo: string;
  location: string;
  remarks: string;
}

export interface GrnFormState {
  date: string;
  sourceType: GrnSourceType | '';
  sourceDocumentNo: string;
  party: string;
  inspectionRef: string;
  remarks: string;
  lines: GrnLineFormState[];
}

const DIRTY_LINE_KEYS: Array<keyof GrnLineFormState> = [
  'itemCode',
  'inspectedQty',
  'acceptedQty',
  'rate',
  'rejectedQty',
  'batchNo',
  'heatNo',
  'location',
  'remarks',
];

export function createEmptyLine(): GrnLineFormState {
  return {
    itemCode: '',
    itemDesc: '',
    uom: '',
    inspectedQty: '',
    acceptedQty: '',
    rate: '',
    amount: '',
    rejectedQty: '',
    batchNo: '',
    heatNo: '',
    location: '',
    remarks: '',
  };
}

export function createEmptyForm(): GrnFormState {
  return {
    date: todayISO(),
    sourceType: '',
    sourceDocumentNo: '',
    party: '',
    inspectionRef: '',
    remarks: '',
    lines: [createEmptyLine()],
  };
}

export function isLineDirty(line: GrnLineFormState): boolean {
  return DIRTY_LINE_KEYS.some(
    (key) => String(line[key] ?? '').trim() !== ''
  );
}

function lineFromDto(
  line: GrnLineDto,
  itemsMap: Map<string, ItemMasterDto>
): GrnLineFormState {
  const item = itemsMap.get(line.itemCode);

  return {
    itemCode: line.itemCode ?? '',
    itemDesc: line.itemDesc ?? item?.description ?? '',
    uom: line.uom ?? item?.uom ?? '',
    inspectedQty: line.inspectedQty?.toString() ?? '',
    acceptedQty: line.acceptedQty?.toString() ?? '',
    rate: line.rate?.toString() ?? '',
    amount: line.amount?.toString() ?? '',
    rejectedQty: line.rejectedQty?.toString() ?? '',
    batchNo: line.batchNo ?? '',
    heatNo: line.heatNo ?? '',
    location: line.location ?? '',
    remarks: line.remarks ?? '',
  };
}

export function formFromDto(
  dto: GrnDto,
  items: ItemMasterDto[]
): GrnFormState {
  const itemsMap = new Map(items.map((item) => [item.code, item]));

  return {
    date: dto.date ?? '',
    sourceType: dto.sourceType ?? '',
    sourceDocumentNo: dto.sourceDocumentNo ?? '',
    party: dto.party ?? '',
    inspectionRef: dto.inspectionRef ?? '',
    remarks: dto.remarks ?? '',
    lines:
      dto.lines && dto.lines.length > 0
        ? dto.lines.map((line) => lineFromDto(line, itemsMap))
        : [createEmptyLine()],
  };
}

export function buildPayload(form: GrnFormState): GrnPayload {
  const activeLines = form.lines.filter(isLineDirty);

  return {
    date: form.date,
    sourceType: form.sourceType as GrnSourceType,
    sourceDocumentNo: form.sourceDocumentNo.trim(),
    party: form.party.trim(),
    inspectionRef: form.inspectionRef.trim() || undefined,
    remarks: form.remarks.trim() || undefined,
    lines: activeLines.map((line) => ({
      itemCode: line.itemCode.trim(),
      inspectedQty: toOptionalNumber(line.inspectedQty),
      acceptedQty: toNumber(line.acceptedQty),
      rate: toOptionalNumber(line.rate),
      rejectedQty: toOptionalNumber(line.rejectedQty),
      batchNo: line.batchNo.trim() || undefined,
      heatNo: line.heatNo.trim() || undefined,
      location: line.location.trim(),
      remarks: line.remarks.trim() || undefined,
    })),
  };
}

export function validateGrnForm(
  form: GrnFormState,
  itemsMap: Map<string, ItemMasterDto>,
  strict: boolean
): string[] {
  const errors: string[] = [];

  if (!form.date) {
    errors.push('Date is required.');
  }

  if (!form.sourceType) {
    errors.push('Source Type is required.');
  }

  if (!form.sourceDocumentNo.trim()) {
    errors.push('Source Document is required.');
  }

  if (!form.party.trim()) {
    errors.push('Party / Supplier is required.');
  }

  const activeLines = form.lines.filter(isLineDirty);

  if (activeLines.length === 0) {
    errors.push('At least one line item is required.');
  }

  activeLines.forEach((line, index) => {
    const lineNo = index + 1;

    if (!line.itemCode.trim()) {
      errors.push(`Line ${lineNo}: Item Code is required.`);
    }

    const qty = toNumber(line.acceptedQty);

    if (!qty || qty <= 0) {
      errors.push(`Line ${lineNo}: Accepted Qty is required.`);
    }

    if (!line.location.trim()) {
      errors.push(`Line ${lineNo}: Location is required.`);
    }

    const inspected = toOptionalNumber(line.inspectedQty);
    if (inspected !== undefined) {
      const accepted = toNumber(line.acceptedQty) || 0;
      const rejected = toOptionalNumber(line.rejectedQty) ?? 0;
      if (accepted + rejected > inspected) {
        errors.push(
          `Line ${lineNo}: Accepted (${accepted}) + Rejected (${rejected}) exceeds Inspected Qty (${inspected}).`
        );
      }
    }

    if (strict && line.itemCode) {
      const item = itemsMap.get(line.itemCode);

      if (item?.requiresBatch && !line.batchNo.trim()) {
        errors.push(
          `Line ${lineNo}: Batch No mandatory for ${line.itemCode}.`
        );
      }

      if (item?.requiresHeat && !line.heatNo.trim()) {
        errors.push(
          `Line ${lineNo}: Heat No mandatory for ${line.itemCode}.`
        );
      }
    }
  });

  return [...new Set(errors)];
}