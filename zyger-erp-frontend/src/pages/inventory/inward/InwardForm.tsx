import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import {
  buildLineFields,
  INWARD_TYPE_LIST,
  INWARD_TYPES,
  type InwardFieldConfig,
  type InwardType,
} from '../../../config/inwardConfig';
import {
  useInwardDocument,
  useInwardMutations,
  useInwardNextNumber,
  useInwardOptions,
} from '../../../hooks/useInward';
import { getApiErrorMessage } from '../../../utils/apiError';
import { toNumber, todayISO } from '../../../utils/format';
import { lookupDocumentByNumber } from '../../../utils/documentLookup';
import { logSystemActivity } from '../../../utils/activityLog';
import StatusBadge from '../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

interface InwardFormProps {
  inwardType?: InwardType;
  documentId?: string | null;
  viewOnly?: boolean;
  onBack: () => void;
  onSaved?: (id: string) => void;
}

type HeaderState = Record<string, string>;
type LineState = Record<string, string>;

interface ActionModalState {
  action: string;
  title: string;
  body: string;
  okLabel: string;
  danger?: boolean;
}

function emptyLine(): LineState {
  return {};
}

function valueOf(doc: Record<string, any>, line: Record<string, any>, key: string): string {
  const raw = line[key] ?? doc[key] ?? '';
  return raw === null || raw === undefined ? '' : String(raw);
}

function formFromDto(
  doc: Record<string, any>,
  config: (typeof INWARD_TYPES)[InwardType],
  items: Array<{ code: string; uom?: string }>
): { header: HeaderState; lines: LineState[] } {
  const header: HeaderState = {};
  const lineFields = buildLineFields(config.qtyField, config.type);

  config.headerFields.forEach((field) => {
    if (field.type === 'auto') {
      return;
    }
    if (field.key === 'date') {
      header.date = valueOf(doc, {}, 'date') || todayISO();
      return;
    }
    if (field.key === 'qcRequired') {
      header.qcRequired = valueOf(doc, {}, 'qcRequired') || 'Yes';
      return;
    }
    header[field.key] = valueOf(doc, {}, field.key);
  });

  const lines: LineState[] = (doc.lines ?? []).map((line: Record<string, any>) => {
    const state: LineState = {};
    lineFields.forEach((field) => {
      if (field.type === 'item') {
        state.itemCode = valueOf(doc, line, 'itemCode');
        return;
      }
      if (field.type === 'auto') {
        if (field.key === 'itemDesc') {
          state.itemDesc = valueOf(doc, line, 'itemDesc');
          return;
        }
        if (field.key === 'uom') {
          const item = items.find((entry) => entry.code === line.itemCode);
          state.uom = item?.uom ?? '';
          return;
        }
        if (field.key === 'amount') {
          const qty = toNumber(line.qty ?? line[config.qtyField]);
          const rate = toNumber(line.rate);
          state.amount = String(Math.round(qty * rate));
          return;
        }
        return;
      }
      if (field.key === config.qtyField) {
        state[field.key] = line.qty ?? line[config.qtyField] ?? '';
        return;
      }
      state[field.key] = valueOf(doc, line, field.key);
    });
    return state;
  });

  return { header, lines: lines.length > 0 ? lines : [emptyLine()] };
}

export default function InwardForm({
  inwardType: lockedType,
  documentId,
  viewOnly = false,
  onBack,
  onSaved,
}: InwardFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const options = useInwardOptions();
  const mutations = useInwardMutations();

  const [inwardType, setInwardType] = useState<InwardType>(lockedType ?? 'PO_INWARD');
  const config = INWARD_TYPES[inwardType];
  const lineFields = useMemo(
    () => buildLineFields(config.qtyField, inwardType),
    [config.qtyField, inwardType]
  );

  const [header, setHeader] = useState<HeaderState>({ date: todayISO() });
  const [lines, setLines] = useState<LineState[]>([emptyLine()]);
  const [errors, setErrors] = useState<string[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Record<string, any> | null>(null);
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);

  // File Attachment State & Handlers
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; size: string; url?: string }>>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newAtts = Array.from(files).map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      url: URL.createObjectURL(file),
    }));
    setAttachments(prev => [...prev, ...newAtts]);
    toast(`${newAtts.length} file(s) attached.`);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
    toast('Attachment removed.');
  };

  const documentQuery = useInwardDocument(inwardType, documentId);
  const nextNumberQuery = useInwardNextNumber(lockedType ? null : inwardType);

  const status = currentDocument?.status ?? 'DRAFT';
  const editable = !viewOnly && (status === 'DRAFT' || status === 'REJECTED');

  const docNo =
    currentDocument?.docNo ??
    nextNumberQuery.data?.nextNumber ??
    `${config.prefix}-${new Date().getFullYear()}-…`;

  useEffect(() => {
    if (!documentId) {
      setCurrentDocument(null);
      setHeader({ date: todayISO() });
      setLines([emptyLine()]);
      setErrors([]);
      return;
    }

    if (documentQuery.data) {
      setCurrentDocument(documentQuery.data);
      setHeader(formFromDto(documentQuery.data, config, options.items).header);
      setLines(formFromDto(documentQuery.data, config, options.items).lines);
      setErrors([]);
    }
  }, [documentId, documentQuery.data, config, options.items]);

  useEffect(() => {
    if (documentId) {
      return;
    }
    setHeader({ date: todayISO() });
    setLines([emptyLine()]);
    setErrors([]);
  }, [inwardType, documentId]);

  const isBusy =
    mutations.createMutation.isPending ||
    mutations.updateMutation.isPending ||
    mutations.actionMutation.isPending;

  const resolveOptions = (source?: InwardFieldConfig['options']) => {
    if (!source) return [];

    if (Array.isArray(source)) {
      return source.map((value) => ({ value, label: value }));
    }

    switch (source) {
      case 'suppliers':
        return options.suppliers.map((s) => ({
          value: s.code,
          label: `${s.code} — ${s.name}`,
        }));
      case 'customers':
        return options.customers.map((c) => ({
          value: c.code,
          label: `${c.code} — ${c.name}`,
        }));
      case 'locations':
        return options.locations.map((l) => ({ value: l.code, label: l.code }));
      case 'pos':
        return options.purchaseOrders.map((p: any) => {
          const num = p.docNo || p.number || '';
          const supp = p.supplier || p.supplierName ? ` — ${p.supplier || p.supplierName}` : '';
          return {
            value: num,
            label: `${num}${supp}`,
          };
        });
      case 'jos':
        return options.jobOrders.map((j) => ({ value: j.number, label: j.number }));
      case 'los':
        return options.labourOrders.map((l) => ({
          value: l.number,
          label: l.number,
        }));
      case 'yn':
        return [
          { value: 'Yes', label: 'Yes' },
          { value: 'No', label: 'No' },
        ];
      default:
        return [];
    }
  };

  const updateHeader = (key: string, value: string) => {
    setHeader((prev) => ({ ...prev, [key]: value }));

    if ((key === 'poNumber' || key === 'purchaseOrderNo' || key === 'jobOrderNo' || key === 'labourOrderNo') && value) {
      const docTypeKey = (key === 'poNumber' || key === 'purchaseOrderNo') ? 'purchase-order' : key === 'jobOrderNo' ? 'job-order' : 'labour-order';
      
      const foundPo = options.purchaseOrders.find((p: any) => p.docNo === value || p.number === value);
      if (foundPo) {
        const supp = foundPo.supplier || foundPo.supplierName || foundPo.party;
        if (supp) {
          const matchedSupplier = options.suppliers.find((s: any) => s.code === supp || s.name === supp || s.code === foundPo.supplierCode);
          setHeader((prev) => ({ ...prev, supplier: matchedSupplier ? matchedSupplier.code : supp }));
        }
      }

      void lookupDocumentByNumber(docTypeKey, value).then((doc) => {
        if (!doc) return;
        const supp = doc.supplier || doc.party;
        if (supp) {
          const matchedSupplier = options.suppliers.find((s: any) => s.code === supp || s.name === supp || s.code === (doc.raw as any)?.supplierCode);
          setHeader((prev) => ({ ...prev, supplier: matchedSupplier ? matchedSupplier.code : supp }));
        }
        if (doc.subcontractor) {
          setHeader((prev) => ({ ...prev, subcontractor: doc.subcontractor }));
        }

        if (doc.lines && doc.lines.length > 0) {
          const defaultLoc = options.locations[0]?.code ?? 'MAIN';
          setLines(
            doc.lines.map((l) => {
              const item = options.items.find((i) => i.code === l.itemCode);
              const qty = String(l.orderQty ?? l.qty ?? '');
              const rate = String(l.unitPrice ?? l.rate ?? item?.defaultRate ?? '');
              const amount = qty && rate ? String(Math.round(toNumber(qty) * toNumber(rate))) : '';

              return {
                itemCode: l.itemCode || 'ITEM-001',
                itemDesc: l.itemDesc || l.itemName || item?.description || '',
                uom: l.uom || item?.uom || 'PCS',
                [config.qtyField]: qty,
                acceptedQty: qty,
                rejectedQty: '0',
                rate,
                amount,
                location: l.location || defaultLoc,
                remarks: l.remarks || '',
              };
            })
          );
        }
      });
    }
  };

  const updateLine = (index: number, key: string, value: string) => {
    setLines((prev) => {
      const next = [...prev];
      const defaultLoc = options.locations[0]?.code ?? 'MAIN';
      const line = { ...next[index], [key]: value };

      if (key === 'itemCode') {
        if (value === 'OTHERS') {
          line.itemDesc = '';
          line.uom = 'PCS';
        } else {
          const item = options.items.find((i) => i.code === value);
          line.itemDesc = item?.description ?? '';
          line.uom = item?.uom ?? '';
          if (!line.rate && item?.defaultRate) {
            line.rate = String(item.defaultRate);
          }
        }
        if (!line.location) {
          line.location = defaultLoc;
        }
      }

      if (key === config.qtyField || key === 'rate') {
        const qty = toNumber(line[config.qtyField]);
        const rate = toNumber(line.rate);
        line.amount = String(Math.round(qty * rate));
      }

      next[index] = line;
      return next;
    });
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const deleteLine = (index: number) => {
    setLines((prev) => {
      if (prev.length === 1) return [emptyLine()];
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const isLineDirty = (line: LineState) =>
    Object.values(line).some((value) => String(value ?? '').trim() !== '');

  const validate = (): string[] => {
    const found: string[] = [];

    config.headerFields.forEach((field) => {
      if (field.required && field.type !== 'auto') {
        if (!String(header[field.key] ?? '').trim()) {
          found.push(`${field.label} is required.`);
        }
      }
    });

    const activeLines = lines.filter(isLineDirty);

    if (activeLines.length === 0) {
      found.push('At least one line item is required.');
    }

    activeLines.forEach((line, index) => {
      const lineNo = index + 1;

      lineFields.forEach((field) => {
        if (field.required && !String(line[field.key] ?? '').trim()) {
          found.push(`Line ${lineNo}: ${field.label} is required.`);
        }
      });

      const qty = toNumber(line[config.qtyField]);
      if (!qty || qty <= 0) {
        found.push(`Line ${lineNo}: Qty is required.`);
      }
    });

    return [...new Set(found)];
  };

  const buildPayload = () => {
    const activeLines = lines.filter(isLineDirty);

    const headerFields: Record<string, any> = {};
    config.headerFields.forEach((field) => {
      if (field.type === 'auto' || field.key === 'date') {
        return;
      }
      if (header[field.key] !== undefined) {
        headerFields[field.key] = header[field.key];
      }
    });

    return {
      date: header.date,
      ...headerFields,
      lines: activeLines.map((line) => ({
        itemCode: line.itemCode,
        [config.qtyField]: toNumber(line[config.qtyField]),
        rate: line.rate ? toNumber(line.rate) : undefined,
        acceptedQty: line.acceptedQty ? toNumber(line.acceptedQty) : undefined,
        rejectedQty: line.rejectedQty ? toNumber(line.rejectedQty) : undefined,
        batchNo: line.batchNo || undefined,
        heatNo: line.heatNo || undefined,
        location: line.location,
        remarks: line.remarks || undefined,
      })),
    };
  };

  const save = async (submit: boolean) => {
    if (!editable) {
      return;
    }

    const validationErrors = validate();
    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    const payload = buildPayload();
    const targetId = documentId ?? currentDocument?.id ?? null;

    try {
      let saved: Record<string, any>;

      if (targetId) {
        saved = await mutations.updateMutation.mutateAsync({
          inwardType,
          id: targetId,
          payload,
        });
      } else {
        saved = await mutations.createMutation.mutateAsync({
          inwardType,
          payload,
        });
      }

      if (submit && saved.id) {
        const isQc = (header.qcRequired === 'Yes' || header.qcRequired === 'Y' || header.qcRequired === 'true');
        if (isQc) {
          if (saved.status !== 'SUBMITTED') {
            saved = await mutations.actionMutation.mutateAsync({
              inwardType,
              id: saved.id,
              action: 'submit',
              note: 'Submitted for Quality Inspection',
            });
          }
          toast(`⚠️ Quality Inspection Required — ${saved.docNo ?? docNo} has been submitted & routed to Quality Inspection (IQC).`, 'success');
        } else {
          // Direct Store Addition - bypass QC
          saved = await mutations.actionMutation.mutateAsync({
            inwardType,
            id: saved.id,
            action: 'post',
            note: 'Direct Store Addition (QC Not Required)',
          });
          toast(`✅ Direct Store Receipt — Quality Inspection not required. Stock ${saved.docNo ?? docNo} has been directly added to Store Stock!`, 'success');
        }
      } else {
        toast(`${saved.docNo ?? docNo} saved as draft.`);
      }

      setCurrentDocument(saved);
      setHeader(formFromDto(saved, config, options.items).header);
      setLines(formFromDto(saved, config, options.items).lines);

      logSystemActivity({
        module: 'Inventory',
        activity: `Material Inward Entry (${saved.docNo ?? docNo})`,
        refNo: saved.docNo ?? docNo,
        party: header.party || header.supplier || header.vendor || 'Supplier',
        user: user?.username || 'Sanjai M',
        status: saved.status || (submit ? 'SUBMITTED' : 'DRAFT'),
      });

      if (saved.id) {
        onSaved?.(saved.id);
      }
    } catch (saveError) {
      toast(
        getApiErrorMessage(saveError, submit ? 'Submit failed.' : 'Save failed.'),
        'error'
      );
    }
  };


  const runAction = async (action: string, note: string) => {
    const id = currentDocument?.id ?? documentId;

    if (!id) {
      toast('Document is not saved yet.', 'error');
      return;
    }

    try {
      const updated = await mutations.actionMutation.mutateAsync({
        inwardType,
        id,
        action,
        note,
      });

      setCurrentDocument(updated);
      setHeader(formFromDto(updated, config, options.items).header);
      setLines(formFromDto(updated, config, options.items).lines);
      setActionModal(null);

      toast(`${updated.docNo ?? docNo} • ${action} completed.`);
    } catch (actionError) {
      toast(getApiErrorMessage(actionError, 'Action failed.'), 'error');
    }
  };

  const handlePost = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    await runAction('post', '');
  };

  const openActionModal = (action: 'approve' | 'reject' | 'cancel') => {
    const id = currentDocument?.id ?? documentId;

    if (!id) {
      toast('Document is not saved yet.', 'error');
      return;
    }

    const docNumber = currentDocument?.docNo ?? docNo;

    if (action === 'approve') {
      setActionModal({
        action,
        title: `Approve ${docNumber}`,
        body: 'Add approval comment (optional).',
        okLabel: 'Approve',
      });
    }

    if (action === 'reject') {
      setActionModal({
        action,
        title: `Reject ${docNumber}`,
        body: 'Reason for rejection:',
        okLabel: 'Reject',
        danger: true,
      });
    }

    if (action === 'cancel') {
      setActionModal({
        action,
        title: `Cancel ${docNumber}`,
        body: 'This creates an auditable reversal.',
        okLabel: 'Cancel Document',
        danger: true,
      });
    }
  };

  const resetForNewEntry = () => {
    setCurrentDocument(null);
    setHeader({ date: todayISO() });
    setLines([emptyLine()]);
    setErrors([]);
    setActionModal(null);
  };

  if (documentId && documentQuery.isPending) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">hourglass_empty</span>
          Loading inward document...
        </div>
      </div>
    );
  }

  if (documentId && documentQuery.isError) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">error</span>
          {getApiErrorMessage(documentQuery.error, 'Unable to load document.')}
          <div style={{ marginTop: 14 }}>
            <button className="btn" onClick={() => documentQuery.refetch()}>
              <span className="material-symbols-rounded">refresh</span>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderHeaderField = (field: InwardFieldConfig) => {
    const value = field.type === 'auto' ? docNo : header[field.key] ?? '';

    if (field.type === 'attachment') {
      return (
        <label key={field.key} className="fld span2" style={{ gridColumn: 'span 2' }}>
          <span>{field.label}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            {editable && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label className="btn btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#2563eb', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 600 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>attach_file</span>
                  Choose File to Attach
                  <input
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </label>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Attach Supplier Invoice, Delivery Challan, Quality Report, or Images (Max 10MB)
                </span>
              </div>
            )}

            {attachments.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                {attachments.map(att => (
                  <div
                    key={att.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#2563eb' }}>
                      description
                    </span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{att.name}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>({att.size})</span>
                    {att.url && (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lbtn"
                        title="Download Attachment"
                        style={{ display: 'inline-flex', alignItems: 'center', color: '#2563eb', textDecoration: 'none', marginLeft: '4px' }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>download</span>
                      </a>
                    )}
                    {editable && (
                      <button
                        type="button"
                        className="lbtn danger"
                        onClick={() => removeAttachment(att.id)}
                        title="Remove Attachment"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '4px' }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#ef4444' }}>close</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                No file attached yet. Click "Choose File to Attach" above to upload invoice/challan copies.
              </div>
            )}
          </div>
        </label>
      );
    }

    return (
      <label
        key={field.key}
        className={`fld ${field.span === 2 ? 'span2' : ''}`}
      >
        <span>
          {field.label} {field.required ? <em>*</em> : null}
        </span>

        {field.type === 'auto' ? (
          <input className="in" value={value} readOnly tabIndex={-1} />
        ) : field.type === 'select' ? (
          <select
            className="in"
            value={value}
            disabled={!editable}
            onChange={(e) => updateHeader(field.key, e.target.value)}
          >
            <option value="">— Select —</option>
            {resolveOptions(field.options).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {value && !resolveOptions(field.options).some((o) => o.value === value) && (
              <option value={value}>{value}</option>
            )}
          </select>
        ) : (
          <input
            className="in"
            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
            value={value}
            step="any"
            readOnly={!editable}
            onChange={(e) => updateHeader(field.key, e.target.value)}
          />
        )}
      </label>
    );
  };

  const renderLineField = (field: InwardFieldConfig, index: number) => {
    const line = lines[index];
    const value = line[field.key] ?? '';

    if (field.type === 'auto') {
      if (field.key === 'itemDesc' && line?.itemCode === 'OTHERS') {
        return (
          <input
            className="in"
            type="text"
            value={value}
            disabled={!editable}
            placeholder="Enter item name..."
            onChange={(e) => updateLine(index, 'itemDesc', e.target.value)}
          />
        );
      }
      return (
        <input className="in" value={value} readOnly tabIndex={-1} />
      );
    }

    if (field.type === 'item') {
      return (
        <select
          className={`in ${field.wide ? 'w-i' : ''}`}
          value={value}
          disabled={!editable}
          onChange={(e) => updateLine(index, field.key, e.target.value)}
        >
          <option value="">— Select Item —</option>
          {options.items.map((item) => (
            <option key={item.code} value={item.code}>
              {item.code} — {item.description}
            </option>
          ))}
          <option value="OTHERS">OTHERS (Custom Item)</option>
        </select>
      );
    }

    if (field.type === 'select') {
      return (
        <select
          className="in"
          value={value}
          disabled={!editable}
          onChange={(e) => updateLine(index, field.key, e.target.value)}
        >
          <option value="">— Select —</option>
          {resolveOptions(field.options).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        className="in"
        type={field.type === 'number' ? 'number' : 'text'}
        step="any"
        value={value}
        readOnly={!editable}
        onChange={(e) => updateLine(index, field.key, e.target.value)}
      />
    );
  };

  return (
    <>
      <div className="pg-head">
        <h1>
          {viewOnly ? 'View' : documentId ? 'Edit' : 'Add'} Inward — {docNo}
        </h1>
        <p>{config.subtitle}</p>
      </div>

      <div id="valBox">
        {errors.length > 0 && (
          <div className="vals">
            <span className="material-symbols-rounded">warning</span>
            <div>
              <b>Please fix the following:</b>
              <ul>
                {errors.map((errorMessage) => (
                  <li key={errorMessage}>{errorMessage}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>
            <span className="material-symbols-rounded">description</span>
            Header
          </h2>
          <StatusBadge status={status} />
        </div>

        <div className="fgrid">
          {!lockedType && (
            <label className="fld">
              <span>
                Inward Type <em>*</em>
              </span>
              <select
                className="in"
                value={inwardType}
                onChange={(e) => setInwardType(e.target.value as InwardType)}
              >
                {INWARD_TYPE_LIST.map((typeConfig) => (
                  <option key={typeConfig.type} value={typeConfig.type}>
                    {typeConfig.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {config.headerFields.map(renderHeaderField)}
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>
            <span className="material-symbols-rounded">table_view</span>
            Line Items
          </h2>

          {editable && (
            <button className="btn btn-sm" onClick={addLine} disabled={isBusy}>
              <span className="material-symbols-rounded">add</span>
              Add Line
            </button>
          )}
        </div>

        <div className="twrap">
          <table className="tbl lines">
            <thead>
              <tr>
                {lineFields.map((field) => (
                  <th key={field.key}>
                    {field.label} {field.required ? '*' : ''}
                  </th>
                ))}
                <th />
              </tr>
            </thead>

            <tbody>
              {lines.map((_, index) => (
                <tr key={index}>
                  {lineFields.map((field) => (
                    <td key={field.key}>{renderLineField(field, index)}</td>
                  ))}
                  <td>
                    {editable && (
                      <button
                        className="ibtn danger"
                        onClick={() => deleteLine(index)}
                        disabled={isBusy}
                      >
                        <span className="material-symbols-rounded">delete</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="actbar">
          <span className="lft">
            <span className="material-symbols-rounded">lock</span>
            Audited as {user?.username || 'System'}
          </span>

          <button className="btn" onClick={onBack}>
            <span className="material-symbols-rounded">arrow_back</span>
            Back
          </button>

          {!documentId && !viewOnly && (
            <button className="btn" onClick={resetForNewEntry} disabled={isBusy}>
              <span className="material-symbols-rounded">restart_alt</span>
              New Entry
            </button>
          )}

          {editable && (
            <>
              <button
                className="btn"
                onClick={() => save(false)}
                disabled={isBusy}
              >
                <span className="material-symbols-rounded">save</span>
                Save Draft
              </button>

              <button
                className="btn btn-p"
                onClick={() => save(true)}
                disabled={isBusy}
              >
                <span className="material-symbols-rounded">send</span>
                Submit
              </button>
            </>
          )}

          {status === 'REJECTED' && editable && (
            <button
              className="btn"
              onClick={() => runAction('reopen', '')}
              disabled={isBusy}
            >
              <span className="material-symbols-rounded">restart_alt</span>
              Reopen
            </button>
          )}

          {status === 'SUBMITTED' && (
            <>
              <button
                className="btn btn-g"
                onClick={() => openActionModal('approve')}
                disabled={isBusy}
              >
                <span className="material-symbols-rounded">thumb_up</span>
                Approve
              </button>

              <button
                className="btn btn-d"
                onClick={() => openActionModal('reject')}
                disabled={isBusy}
              >
                <span className="material-symbols-rounded">thumb_down</span>
                Reject
              </button>
            </>
          )}

          {status === 'APPROVED' && (
            <button
              className="btn btn-g"
              onClick={handlePost}
              disabled={isBusy}
            >
              <span className="material-symbols-rounded">
                published_with_changes
              </span>
              Post (Update Stock)
            </button>
          )}

          {!['POSTED', 'CANCELLED'].includes(status) && (
            <button
              className="btn btn-d"
              onClick={() => openActionModal('cancel')}
              disabled={isBusy}
            >
              <span className="material-symbols-rounded">block</span>
              Cancel
            </button>
          )}
        </div>
      </div>

      <ConfirmActionModal
        open={Boolean(actionModal)}
        title={actionModal?.title ?? ''}
        body={actionModal?.body ?? ''}
        okLabel={actionModal?.okLabel ?? 'Confirm'}
        danger={actionModal?.danger}
        busy={mutations.actionMutation.isPending}
        onClose={() => setActionModal(null)}
        onConfirm={(note) => {
          if (actionModal) {
            runAction(actionModal.action, note);
          }
        }}
      />
    </>
  );
}
