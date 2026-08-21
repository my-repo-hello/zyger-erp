import type { ItemMasterDto } from '../../../../types/master.types';
import type {
  DeliveryChallanDto,
  DeliveryChallanLineDto,
  DeliveryChallanPayload,
  DeliveryChallanTypeConfig,
} from '../../../../types/inventory/deliveryChallan.types';
import { toNumber, todayISO } from '../../../../utils/format';

export interface DeliveryChallanLineFormState {
  itemCode: string;
  itemDesc: string;
  qty: string;
  batchNo: string;
  heatNo: string;
  location: string;
  remarks: string;
}

export interface DeliveryChallanFormState {
  date: string;
  party: string;
  sourceLocation: string;
  vehicleNo: string;
  transporter: string;
  linkedDocumentNo: string;
  remarks: string;
  lines: DeliveryChallanLineFormState[];
}

const DIRTY_LINE_KEYS: Array<keyof DeliveryChallanLineFormState> = [
  'itemCode',
  'qty',
  'batchNo',
  'heatNo',
  'remarks',
];

export function createEmptyLine(
  defaultLocation = ''
): DeliveryChallanLineFormState {
  return {
    itemCode: '',
    itemDesc: '',
    qty: '',
    batchNo: '',
    heatNo: '',
    location: defaultLocation,
    remarks: '',
  };
}

export function createEmptyForm(): DeliveryChallanFormState {
  return {
    date: todayISO(),
    party: '',
    sourceLocation: '',
    vehicleNo: '',
    transporter: '',
    linkedDocumentNo: '',
    remarks: '',
    lines: [createEmptyLine()],
  };
}

export function isLineDirty(
  line: DeliveryChallanLineFormState
): boolean {
  return DIRTY_LINE_KEYS.some(
    (key) => String(line[key] ?? '').trim() !== ''
  );
}

function lineFromDto(
  line: DeliveryChallanLineDto,
  itemsMap: Map<string, ItemMasterDto>,
  fallbackLocation: string
): DeliveryChallanLineFormState {
  const item = itemsMap.get(line.itemCode);

  return {
    itemCode: line.itemCode ?? '',
    itemDesc: line.itemDesc ?? item?.description ?? '',
    qty: line.qty?.toString() ?? '',
    batchNo: line.batchNo ?? '',
    heatNo: line.heatNo ?? '',
    location: line.location ?? fallbackLocation,
    remarks: line.remarks ?? '',
  };
}

export function formFromDto(
  dto: DeliveryChallanDto,
  items: ItemMasterDto[]
): DeliveryChallanFormState {
  const itemsMap = new Map(items.map((item) => [item.code, item]));

  return {
    date: dto.date ?? '',
    party: dto.party ?? '',
    sourceLocation: dto.sourceLocation ?? '',
    vehicleNo: dto.vehicleNo ?? '',
    transporter: dto.transporter ?? '',
    linkedDocumentNo: dto.linkedDocumentNo ?? '',
    remarks: dto.remarks ?? '',
    lines:
      dto.lines && dto.lines.length > 0
        ? dto.lines.map((line) =>
            lineFromDto(line, itemsMap, dto.sourceLocation ?? '')
          )
        : [createEmptyLine(dto.sourceLocation ?? '')],
  };
}

export function buildPayload(
  form: DeliveryChallanFormState
): DeliveryChallanPayload {
  const activeLines = form.lines.filter(isLineDirty);

  return {
    date: form.date,
    party: form.party.trim(),
    sourceLocation: form.sourceLocation.trim(),
    vehicleNo: form.vehicleNo.trim() || undefined,
    transporter: form.transporter.trim() || undefined,
    linkedDocumentNo: form.linkedDocumentNo.trim() || undefined,
    remarks: form.remarks.trim() || undefined,
    lines: activeLines.map((line) => ({
      itemCode: line.itemCode.trim(),
      qty: toNumber(line.qty),
      batchNo: line.batchNo.trim() || undefined,
      heatNo: line.heatNo.trim() || undefined,
      location: line.location.trim(),
      remarks: line.remarks.trim() || undefined,
    })),
  };
}

export function validateDeliveryChallanForm(
  config: DeliveryChallanTypeConfig,
  form: DeliveryChallanFormState,
  itemsMap: Map<string, ItemMasterDto>,
  strict: boolean
): string[] {
  const errors: string[] = [];

  if (!form.date) {
    errors.push('Date is required.');
  }

  if (!form.party.trim()) {
    errors.push(`${config.partyLabel} is required.`);
  }

  if (!form.sourceLocation.trim()) {
    errors.push('From Location is required.');
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

    const qty = toNumber(line.qty);

    if (!qty || qty <= 0) {
      errors.push(`Line ${lineNo}: Qty is required.`);
    }

    if (!line.location.trim()) {
      errors.push(`Line ${lineNo}: Location is required.`);
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