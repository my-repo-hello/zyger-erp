import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import {
  useDcDocument,
  useDcLookups,
  useDcMutations,
  useDcNextNumber,
} from '../../../../hooks/useDeliveryChallan';
import type {
  DeliveryChallanDocumentAction,
  DeliveryChallanDto,
  DeliveryChallanTypeConfig,
} from '../../../../types/inventory/deliveryChallan.types';
import { getApiErrorMessage } from '../../../../utils/apiError';
import { lookupDocumentByNumber } from '../../../../utils/documentLookup';
import StatusBadge from '../../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../../components/common/ConfirmActionModal';
import {
  buildPayload,
  createEmptyForm,
  createEmptyLine,
  formFromDto,
  validateDeliveryChallanForm,
  type DeliveryChallanFormState,
  type DeliveryChallanLineFormState,
} from './deliveryChallanForm';

interface ActionModalState {
  action: DeliveryChallanDocumentAction;
  title: string;
  body: string;
  okLabel: string;
  danger?: boolean;
}

interface DeliveryChallanFormProps {
  config: DeliveryChallanTypeConfig;
  documentId?: string | null;
  viewOnly?: boolean;
  onBack: () => void;
  onSaved?: (id: string) => void;
}

export default function DeliveryChallanForm({
  config,
  documentId,
  viewOnly = false,
  onBack,
  onSaved,
}: DeliveryChallanFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const lookups = useDcLookups(config);
  const documentQuery = useDcDocument(config, documentId ?? null);
  const nextNumberQuery = useDcNextNumber(config);

  const { createMutation, updateMutation, actionMutation } =
    useDcMutations(config);

  const [form, setForm] = useState<DeliveryChallanFormState>(() =>
    createEmptyForm()
  );
  const [currentDocument, setCurrentDocument] =
    useState<DeliveryChallanDto | null>(null);
  const [validationMode, setValidationMode] = useState<
    'draft' | 'submit' | null
  >(null);
  const [actionModal, setActionModal] = useState<ActionModalState | null>(
    null
  );

  const validationBoxRef = useRef<HTMLDivElement | null>(null);
  const initializedFor = useRef<string | null>(null);

  const items = lookups.items;
  const locations = lookups.locations;
  const partyOptions = lookups.partyOptions;

  const itemsMap = useMemo(
    () => new Map(items.map((item) => [item.code, item])),
    [items]
  );

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
        };
      }),
    }));
  }, [items, itemsMap]);

  const validationErrors = useMemo(() => {
    if (!validationMode) {
      return [];
    }

    return validateDeliveryChallanForm(
      config,
      form,
      itemsMap,
      validationMode === 'submit'
    );
  }, [config, form, itemsMap, validationMode]);

  useEffect(() => {
    if (validationErrors.length > 0 && validationBoxRef.current) {
      validationBoxRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [validationErrors]);

  const updateField = (
    key: keyof Omit<DeliveryChallanFormState, 'lines'>,
    value: string
  ) => {
    setForm((previous) => {
      const next = {
        ...previous,
        [key]: value,
      };

      if (key === 'sourceLocation') {
        next.lines = previous.lines.map((line) =>
          line.location ? line : { ...line, location: value }
        );
      }

      return next;
    });

    if (key === 'linkedDocumentNo' && value) {
      const isInv = value.toUpperCase().startsWith('INV');
      const docTypeKey = isInv ? 'sales-invoice' : config.screenId === 'sales-dc' ? 'sales-order' : config.screenId === 'jo-dc' ? 'job-order' : config.screenId === 'return-dc' ? 'sales-dc' : 'general-inward';
      void lookupDocumentByNumber(docTypeKey, value).then((doc) => {
        if (!doc) return;
        setForm((prev) => {
          const nextParty = doc.party || doc.customer || doc.supplier || prev.party;
          const nextLines = doc.lines && doc.lines.length > 0 ? doc.lines.map((l) => ({
            itemCode: l.itemCode,
            itemDesc: l.itemDesc || itemsMap.get(l.itemCode)?.description || l.description || '',
            qty: String(l.qty || l.billedQty || l.dispatchQty || ''),
            batchNo: l.batchNo || l.batchNumber || '',
            heatNo: l.heatNo || l.heatNumber || '',
            location: l.location || prev.sourceLocation || 'MAIN',
            remarks: l.remarks || l.lineRemark || '',
          })) : prev.lines;

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
    key: keyof DeliveryChallanLineFormState,
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
        if (!line.location) {
          line.location = previous.sourceLocation || 'MAIN';
        }
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
      lines: [...previous.lines, createEmptyLine(previous.sourceLocation)],
    }));
  };

  const deleteLine = (index: number) => {
    if (!editable) {
      return;
    }

    setForm((previous) => {
      const lines = [...previous.lines];

      if (lines.length === 1) {
        lines[0] = createEmptyLine(previous.sourceLocation);
      } else {
        lines.splice(index, 1);
      }

      return {
        ...previous,
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

    const errors = validateDeliveryChallanForm(
      config,
      form,
      itemsMap,
      submit
    );

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

      let saved: DeliveryChallanDto;

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
        `${saved.docNo || config.title} ${
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

  const runAction = async (
    action: DeliveryChallanDocumentAction,
    note: string
  ) => {
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

      toast(`${updated.docNo || config.title} • ${action} completed.`);
    } catch (actionError) {
      toast(getApiErrorMessage(actionError, 'Action failed.'), 'error');
    }
  };

  const handlePost = async () => {
    setValidationMode('submit');

    const errors = validateDeliveryChallanForm(
      config,
      form,
      itemsMap,
      true
    );

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

    const docNumber = currentDocument?.docNo || config.title;

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
          Loading {config.title} document...
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
            `Unable to load ${config.title} document.`
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
          Loading {config.title} master data...
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
          {viewOnly ? 'View' : documentId ? 'Edit' : 'Add'} {config.title} — {docNo}
        </h1>
        <p>{config.subtitle}</p>
      </div>

      <div className="note">
        <span className="material-symbols-rounded">info</span>
        <span>
          Workflow: DRAFT → SUBMITTED → APPROVED → POSTED • Posting reduces
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
                onChange={(event) => updateField('date', event.target.value)}
              />
            </label>

            <label className="fld">
              <span>
                {config.partyLabel} <em>*</em>
              </span>
              <select
                className="in"
                value={form.party}
                disabled={!editable}
                onChange={(event) => updateField('party', event.target.value)}
              >
                <option value="">— Select —</option>
                {partyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="fld">
              <span>
                From Location <em>*</em>
              </span>
              <select
                className="in"
                value={form.sourceLocation}
                disabled={!editable}
                onChange={(event) =>
                  updateField('sourceLocation', event.target.value)
                }
              >
                <option value="">— Select —</option>
                {locations.map((location) => (
                  <option key={location.code} value={location.code}>
                    {location.code}
                  </option>
                ))}
              </select>
            </label>

            {config.screenId === 'transfer-dc' && (
              <label className="fld">
                <span>To Location <em>*</em></span>
                <select
                  className="in"
                  value={form.destinationLocation || ''}
                  disabled={!editable}
                  onChange={(event) =>
                    updateField('destinationLocation', event.target.value)
                  }
                >
                  <option value="">— Select —</option>
                  {locations.map((location) => (
                    <option key={location.code} value={location.code}>
                      {location.code}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="fld">
              <span>Vehicle No</span>
              <input
                className="in"
                value={form.vehicleNo}
                readOnly={!editable}
                onChange={(event) =>
                  updateField('vehicleNo', event.target.value)
                }
              />
            </label>

            <label className="fld">
              <span>Transporter</span>
              <input
                className="in"
                value={form.transporter}
                readOnly={!editable}
                onChange={(event) =>
                  updateField('transporter', event.target.value)
                }
              />
            </label>

            <label className="fld">
              <span>Linked Document No</span>
              <input
                className="in"
                value={form.linkedDocumentNo}
                readOnly={!editable}
                onChange={(event) =>
                  updateField('linkedDocumentNo', event.target.value)
                }
              />
            </label>

            <label className="fld">
              <span>Remarks</span>
              <input
                className="in"
                value={form.remarks}
                readOnly={!editable}
                onChange={(event) =>
                  updateField('remarks', event.target.value)
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
                  <th>Qty *</th>
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
                        type="number"
                        step="any"
                        className="in"
                        value={line.qty}
                        readOnly={!editable}
                        onChange={(event) =>
                          updateLine(index, 'qty', event.target.value)
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