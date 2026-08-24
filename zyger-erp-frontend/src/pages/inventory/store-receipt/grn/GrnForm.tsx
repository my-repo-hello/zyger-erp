import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import {
  useGrnDocument,
  useGrnLookups,
  useGrnMutations,
  useGrnNextNumber,
  useGrnSourceDocuments,
} from '../../../../hooks/useGrn';
import type {
  GrnDocumentAction,
  GrnDto,
} from '../../../../types/inventory/grn.types';
import { GRN_SOURCE_TYPES } from '../../../../types/inventory/grn.types';
import { getApiErrorMessage } from '../../../../utils/apiError';
import { toNumber } from '../../../../utils/format';
import { lookupDocumentByNumber } from '../../../../utils/documentLookup';
import StatusBadge from '../../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../../components/common/ConfirmActionModal';
import {
  buildPayload,
  createEmptyForm,
  createEmptyLine,
  formFromDto,
  validateGrnForm,
  type GrnFormState,
  type GrnLineFormState,
} from './grnForm';

interface ActionModalState {
  action: GrnDocumentAction;
  title: string;
  body: string;
  okLabel: string;
  danger?: boolean;
}

interface GrnFormProps {
  documentId?: string | null;
  viewOnly?: boolean;
  onBack: () => void;
  onSaved?: (id: string) => void;
}

export default function GrnForm({
  documentId,
  viewOnly = false,
  onBack,
  onSaved,
}: GrnFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const lookups = useGrnLookups();
  const documentQuery = useGrnDocument(documentId ?? null);
  const nextNumberQuery = useGrnNextNumber();

  const { createMutation, updateMutation, actionMutation } = useGrnMutations();

  const [form, setForm] = useState<GrnFormState>(() => createEmptyForm());
  const [currentDocument, setCurrentDocument] = useState<GrnDto | null>(null);
  const [validationMode, setValidationMode] = useState<'draft' | 'submit' | null>(null);
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);

  const validationBoxRef = useRef<HTMLDivElement | null>(null);
  const initializedFor = useRef<string | null>(null);

  const items = lookups.items;
  const locations = lookups.locations;

  const itemsMap = useMemo(
    () => new Map(items.map((item) => [item.code, item])),
    [items]
  );

  const sourceDocumentsQuery = useGrnSourceDocuments(form.sourceType);

  const status = currentDocument?.status ?? 'DRAFT';
  const editable = !viewOnly && (status === 'DRAFT' || status === 'REJECTED');

  const docNo =
    currentDocument?.docNo ||
    nextNumberQuery.data?.nextNumber ||
    'Auto';

  useEffect(() => {
    if (!documentId) {
      initializedFor.current = null;
      setCurrentDocument(null);
      setForm(createEmptyForm());
      return;
    }

    if (documentQuery.data && initializedFor.current !== documentId) {
      initializedFor.current = documentId;
      setCurrentDocument(documentQuery.data);
      setForm(formFromDto(documentQuery.data, items));
    }
  }, [documentId, documentQuery.data, items]);

  useEffect(() => {
    if (!items.length) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      lines: previous.lines.map((line) => {
        if (!line.itemCode) {
          return line;
        }

        const item = itemsMap.get(line.itemCode);

        if (!item) {
          return line;
        }

        return {
          ...line,
          itemDesc: line.itemDesc || item.description,
          uom: line.uom || item.uom,
        };
      }),
    }));
  }, [items, itemsMap]);

  const validationErrors = useMemo(() => {
    if (!validationMode) {
      return [];
    }

    return validateGrnForm(form, itemsMap, validationMode === 'submit');
  }, [form, itemsMap, validationMode]);

  useEffect(() => {
    if (validationErrors.length > 0 && validationBoxRef.current) {
      validationBoxRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [validationErrors]);

  const updateHeader = (
    key: keyof Omit<GrnFormState, 'lines'>,
    value: string
  ) => {
    setForm((previous) => {
      const next = {
        ...previous,
        [key]: value,
      };

      if (key === 'sourceType') {
        next.sourceDocumentNo = '';
      }

      return next;
    });

    if (key === 'sourceDocumentNo' && value) {
      const docTypeKey = form.sourceType === 'PO_INWARD' ? 'po-inward' : form.sourceType === 'LO_INWARD' ? 'lo-inward' : form.sourceType === 'JO_INWARD' ? 'jo-inward' : form.sourceType === 'RETURN_INWARD' ? 'return-inward' : 'general-inward';
      void lookupDocumentByNumber(docTypeKey, value).then((doc) => {
        if (!doc) return;
        setForm((prev) => {
          const nextParty = doc.party || doc.supplier || prev.party;
          const nextLines = doc.lines && doc.lines.length > 0 ? doc.lines.map((l) => {
            const item = itemsMap.get(l.itemCode);
            const qty = String(l.qty || '');
            const rate = String(l.rate ?? item?.defaultRate ?? '');
            const amount = qty && rate ? String(Math.round(toNumber(qty) * toNumber(rate))) : '';

            return {
              itemCode: l.itemCode,
              itemDesc: l.itemDesc || item?.description || '',
              uom: l.uom || item?.uom || '',
              inspectedQty: qty,
              acceptedQty: qty,
              rejectedQty: '0',
              rate,
              amount,
              batchNo: l.batchNo || '',
              heatNo: l.heatNo || '',
              location: l.location || locations[0]?.code || 'MAIN',
              remarks: l.remarks || '',
            };
          }) : prev.lines;

          return {
            ...prev,
            party: nextParty,
            lines: nextLines,
          };
        });
      });
    }
  };

  const updateLine = (
    index: number,
    key: keyof GrnLineFormState,
    value: string
  ) => {
    setForm((previous) => {
      const lines = [...previous.lines];

      const line = {
        ...lines[index],
        [key]: value,
      };

      if (key === 'itemCode') {
        const item = itemsMap.get(value);
        line.itemDesc = item?.description ?? '';
        line.uom = item?.uom ?? '';
        if (!line.location) {
          line.location = locations[0]?.code || 'MAIN';
        }
        if (!line.rate && item?.defaultRate) {
          line.rate = String(item.defaultRate);
        }
      }

      if (key === 'acceptedQty' || key === 'rate') {
        const qty = toNumber(line.acceptedQty);
        const rate = toNumber(line.rate);
        line.amount = String(Math.round(qty * rate));
      }

      lines[index] = line;

      return {
        ...previous,
        lines,
      };
    });
  };

  const addLine = () => {
    if (!editable) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      lines: [...previous.lines, createEmptyLine()],
    }));
  };

  const deleteLine = (index: number) => {
    if (!editable) {
      return;
    }

    setForm((previous) => {
      const lines = [...previous.lines];

      if (lines.length === 1) {
        lines[0] = createEmptyLine();
      } else {
        lines.splice(index, 1);
      }

      return {
        ...previous,
        lines,
      };
    });
  };

  const handleSourceDocumentChange = (value: string) => {
    const selectedSource: any = sourceDocumentsQuery.data?.find(
      (sourceDocument: any) => sourceDocument.docNo === value
    );

    setForm((previous) => {
      const nextParty = selectedSource?.party || selectedSource?.supplier || previous.party || '';
      const srcLines = selectedSource?.lines;
      const lines = (srcLines && srcLines.length > 0)
        ? srcLines.map((l: any) => ({
            itemCode: l.itemCode,
            itemDesc: l.itemDesc || itemsMap.get(l.itemCode)?.description || l.description || '',
            uom: l.uom || itemsMap.get(l.itemCode)?.uom || 'PCS',
            inspectedQty: String(l.qty || l.orderQty || l.receivedQty || ''),
            acceptedQty: String(l.qty || l.orderQty || l.receivedQty || ''),
            rate: String(l.rate || l.unitPrice || ''),
            amount: String(toNumber(l.qty || l.orderQty || 0) * toNumber(l.rate || l.unitPrice || 0)),
            rejectedQty: '0',
            batchNo: l.batchNo || '',
            heatNo: l.heatNo || '',
            location: l.location || locations[0]?.code || '',
            remarks: `Received against ${value}`,
          }))
        : previous.lines;

      return {
        ...previous,
        sourceDocumentNo: value,
        party: nextParty || previous.party,
        inspectionRef: previous.inspectionRef || '',
        lines,
      };
    });
  };


  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    actionMutation.isPending;

  const save = async (submit: boolean) => {
    if (!editable) {
      return;
    }

    setValidationMode(submit ? 'submit' : 'draft');

    const errors = validateGrnForm(form, itemsMap, submit);

    if (errors.length > 0) {
      return;
    }

    try {
      const targetId = documentId ?? currentDocument?.id ?? null;

      if (targetId && status === 'REJECTED') {
        await actionMutation.mutateAsync({
          id: targetId,
          action: 'reopen',
          note: '',
        });
      }

      const payload = buildPayload(form);

      let saved: GrnDto;

      if (targetId) {
        saved = await updateMutation.mutateAsync({
          id: targetId,
          payload,
        });
      } else {
        saved = await createMutation.mutateAsync(payload);
      }

      if (submit && saved.status !== 'SUBMITTED' && saved.id) {
        saved = await actionMutation.mutateAsync({
          id: saved.id,
          action: 'submit',
          note: '',
        });
      }

      setCurrentDocument(saved);
      setForm(formFromDto(saved, items));

      if (saved.id) {
        initializedFor.current = saved.id;
        onSaved?.(saved.id);
      }

      toast(
        `${saved.docNo || 'GRN'} ${
          submit ? 'submitted' : 'saved as draft'
        }.`
      );
    } catch (saveError) {
      toast(
        getApiErrorMessage(
          saveError,
          submit ? 'Submit failed.' : 'Save failed.'
        ),
        'error'
      );
    }
  };

  const runAction = async (action: GrnDocumentAction, note: string) => {
    const id = currentDocument?.id ?? documentId;

    if (!id) {
      toast('Document is not saved yet.', 'error');
      return;
    }

    try {
      const updated = await actionMutation.mutateAsync({
        id,
        action,
        note,
      });

      setCurrentDocument(updated);
      setForm(formFromDto(updated, items));
      setActionModal(null);

      toast(`${updated.docNo || 'GRN'} • ${action} completed.`);
    } catch (actionError) {
      toast(getApiErrorMessage(actionError, 'Action failed.'), 'error');
    }
  };

  const handlePost = async () => {
    setValidationMode('submit');

    const errors = validateGrnForm(form, itemsMap, true);

    if (errors.length > 0) {
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

    const docNumber = currentDocument?.docNo || 'GRN';

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

  if (documentId && documentQuery.isPending) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">hourglass_empty</span>
          Loading GRN document...
        </div>
      </div>
    );
  }

  if (documentId && documentQuery.isError) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">error</span>
          {getApiErrorMessage(
            documentQuery.error,
            'Unable to load GRN document.'
          )}
          <div style={{ marginTop: '14px' }}>
            <button className="btn" onClick={() => documentQuery.refetch()}>
              <span className="material-symbols-rounded">refresh</span>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (lookups.isLoading) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">hourglass_empty</span>
          Loading GRN master data...
        </div>
      </div>
    );
  }

  if (lookups.isError) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">error</span>
          {lookups.errorMessage}
          <div style={{ marginTop: '14px' }}>
            <button className="btn" onClick={() => lookups.refetch()}>
              <span className="material-symbols-rounded">refresh</span>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pg-head">
        <h1>
          {viewOnly ? 'View' : documentId ? 'Edit' : 'Add'} GRN / Store
          Receipt — {docNo}
        </h1>
        <p>Official point where accepted material becomes store stock</p>
      </div>

      <div className="note">
        <span className="material-symbols-rounded">info</span>
        <span>
          Workflow: DRAFT → SUBMITTED → APPROVED → POSTED • Posting increases
          stock
        </span>
      </div>

      <div id="valBox" ref={validationBoxRef}>
        {validationErrors.length > 0 && (
          <div className="vals">
            <span className="material-symbols-rounded">warning</span>
            <div>
              <b>Please fix the following:</b>
              <ul>
                {validationErrors.map((errorMessage) => (
                  <li key={errorMessage}>{errorMessage}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={(event) => event.preventDefault()}>
        <div className="panel">
          <div className="panel-h">
            <h2>
              <span className="material-symbols-rounded">description</span>
              Header
            </h2>

            <StatusBadge status={status} />
          </div>

          <div className="fgrid">
            <label className="fld">
              <span>Doc No</span>
              <input className="in" value={docNo} readOnly tabIndex={-1} />
            </label>

            <label className="fld">
              <span>
                Date <em>*</em>
              </span>
              <input
                type="date"
                className="in"
                value={form.date}
                readOnly={!editable}
                onChange={(event) => updateHeader('date', event.target.value)}
              />
            </label>

            <label className="fld">
              <span>
                Source Type <em>*</em>
              </span>
              <select
                className="in"
                value={form.sourceType}
                disabled={!editable}
                onChange={(event) =>
                  updateHeader('sourceType', event.target.value)
                }
              >
                <option value="">— Select —</option>
                {GRN_SOURCE_TYPES.map((sourceType) => (
                  <option key={sourceType.value} value={sourceType.value}>
                    {sourceType.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="fld">
              <span>
                Source Document <em>*</em>
              </span>
              <select
                className="in"
                value={form.sourceDocumentNo}
                disabled={
                  !editable ||
                  !form.sourceType ||
                  sourceDocumentsQuery.isPending
                }
                onChange={(event) =>
                  handleSourceDocumentChange(event.target.value)
                }
              >
                <option value="">— Select —</option>
                {sourceDocumentsQuery.data?.map((sourceDocument) => (
                  <option
                    key={sourceDocument.docNo}
                    value={sourceDocument.docNo}
                  >
                    {sourceDocument.docNo}
                  </option>
                ))}
              </select>
            </label>

            <label className="fld">
              <span>
                Party / Supplier <em>*</em>
              </span>
              <input
                className="in"
                value={form.party}
                readOnly={!editable}
                onChange={(event) => updateHeader('party', event.target.value)}
              />
            </label>

            <label className="fld">
              <span>Inspection Reference</span>
              <input
                className="in"
                value={form.inspectionRef}
                readOnly={!editable}
                onChange={(event) =>
                  updateHeader('inspectionRef', event.target.value)
                }
              />
            </label>

            <label className="fld span2">
              <span>Remarks</span>
              <input
                className="in"
                value={form.remarks}
                readOnly={!editable}
                onChange={(event) =>
                  updateHeader('remarks', event.target.value)
                }
              />
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <h2>
              <span className="material-symbols-rounded">table_view</span>
              Line Items
            </h2>

            <button
              type="button"
              className="btn btn-sm"
              onClick={addLine}
              disabled={!editable || isBusy}
            >
              <span className="material-symbols-rounded">add</span>
              Add Line
            </button>
          </div>

          <div className="twrap">
            <table className="tbl lines">
              <thead>
                <tr>
                  <th>Item Code *</th>
                  <th>Item Name</th>
                  <th>UOM</th>
                  <th>Inspected Qty</th>
                  <th>Accepted Qty *</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th>Rejected Qty</th>
                  <th>Batch No</th>
                  <th>Heat No</th>
                  <th>Location *</th>
                  <th>Remarks</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {form.lines.map((line, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        className="in w-i"
                        value={line.itemCode}
                        disabled={!editable}
                        onChange={(event) =>
                          updateLine(index, 'itemCode', event.target.value)
                        }
                      >
                        <option value="">— Select Item —</option>
                        {items.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.code} — {item.description}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <input
                        className="in"
                        value={line.itemDesc}
                        readOnly
                        tabIndex={-1}
                      />
                    </td>

                    <td>
                      <input
                        className="in"
                        value={line.uom}
                        readOnly
                        tabIndex={-1}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        step="any"
                        className="in"
                        value={line.inspectedQty}
                        readOnly={!editable}
                        onChange={(event) =>
                          updateLine(index, 'inspectedQty', event.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        step="any"
                        className="in"
                        value={line.acceptedQty}
                        readOnly={!editable}
                        onChange={(event) =>
                          updateLine(index, 'acceptedQty', event.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        step="any"
                        className="in"
                        value={line.rate}
                        readOnly={!editable}
                        onChange={(event) =>
                          updateLine(index, 'rate', event.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        className="in"
                        value={line.amount}
                        readOnly
                        tabIndex={-1}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        step="any"
                        className="in"
                        value={line.rejectedQty}
                        readOnly={!editable}
                        onChange={(event) =>
                          updateLine(index, 'rejectedQty', event.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        className="in"
                        value={line.batchNo}
                        readOnly={!editable}
                        onChange={(event) =>
                          updateLine(index, 'batchNo', event.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        className="in"
                        value={line.heatNo}
                        readOnly={!editable}
                        onChange={(event) =>
                          updateLine(index, 'heatNo', event.target.value)
                        }
                      />
                    </td>

                    <td>
                      <select
                        className="in"
                        value={line.location}
                        disabled={!editable}
                        onChange={(event) =>
                          updateLine(index, 'location', event.target.value)
                        }
                      >
                        <option value="">— Select —</option>
                        {locations.map((location) => (
                          <option key={location.code} value={location.code}>
                            {location.code}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <input
                        className="in"
                        value={line.remarks}
                        readOnly={!editable}
                        onChange={(event) =>
                          updateLine(index, 'remarks', event.target.value)
                        }
                      />
                    </td>

                    <td>
                      <button
                        type="button"
                        className="ibtn danger"
                        onClick={() => deleteLine(index)}
                        disabled={!editable || isBusy}
                      >
                        <span className="material-symbols-rounded">delete</span>
                      </button>
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

            <button type="button" className="btn" onClick={onBack}>
              <span className="material-symbols-rounded">arrow_back</span>
              Back
            </button>

            {editable && (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={() => save(false)}
                  disabled={isBusy}
                >
                  <span className="material-symbols-rounded">save</span>
                  Save Draft
                </button>

                <button
                  type="button"
                  className="btn btn-p"
                  onClick={() => save(true)}
                  disabled={isBusy}
                >
                  <span className="material-symbols-rounded">send</span>
                  Submit
                </button>
              </>
            )}

            {status === 'REJECTED' && (
              <button
                type="button"
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
                  type="button"
                  className="btn btn-g"
                  onClick={() => openActionModal('approve')}
                  disabled={isBusy}
                >
                  <span className="material-symbols-rounded">thumb_up</span>
                  Approve
                </button>

                <button
                  type="button"
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
                type="button"
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
                type="button"
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
      </form>

      <ConfirmActionModal
        open={Boolean(actionModal)}
        title={actionModal?.title ?? ''}
        body={actionModal?.body ?? ''}
        okLabel={actionModal?.okLabel ?? 'Confirm'}
        danger={actionModal?.danger}
        busy={actionMutation.isPending}
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