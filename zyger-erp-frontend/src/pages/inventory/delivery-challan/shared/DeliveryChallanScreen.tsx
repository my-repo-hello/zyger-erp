import { useEffect, useState } from 'react';
import type { DeliveryChallanTypeConfig } from '../../../../types/inventory/deliveryChallan.types';
import DeliveryChallanList from './DeliveryChallanList';
import DeliveryChallanForm from './DeliveryChallanForm';

interface DeliveryChallanScreenProps {
  initialDocId?: string;
  viewOnly?: boolean;
  config: DeliveryChallanTypeConfig;
}

export default function DeliveryChallanScreen({
  config,
  initialDocId,
  viewOnly: viewOnlyProp,
}: DeliveryChallanScreenProps) {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [viewOnly, setViewOnly] = useState(false);
  useEffect(() => {
    if (!initialDocId) return;
    setDocumentId(initialDocId);
    setViewOnly(viewOnlyProp ?? false);
    setFormKey((previous) => previous + 1);
    setMode('form');
  }, [initialDocId, viewOnlyProp]);


  const openAdd = () => {
    setDocumentId(null);
    setViewOnly(false);
    setFormKey((previous) => previous + 1);
    setMode('form');
  };

  const openEdit = (id: string) => {
    setDocumentId(id);
    setViewOnly(false);
    setFormKey((previous) => previous + 1);
    setMode('form');
  };

  const openView = (id: string) => {
    setDocumentId(id);
    setViewOnly(true);
    setFormKey((previous) => previous + 1);
    setMode('form');
  };

  const handleBack = () => {
    setMode('list');
    setDocumentId(null);
  };

  const handleSaved = (id: string) => {
    setDocumentId(id);
  };

  if (mode === 'form') {
    return (
      <DeliveryChallanForm
        key={formKey}
        config={config}
        documentId={documentId}
        viewOnly={viewOnly}
        onBack={handleBack}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <DeliveryChallanList
      config={config}
      onAdd={openAdd}
      onEdit={openEdit}
      onView={openView}
    />
  );
}