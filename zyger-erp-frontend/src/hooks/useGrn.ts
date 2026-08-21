import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { grnService } from '../services/grnService';
import { masterService } from '../services/masterService';
import type {
  GrnDocumentAction,
  GrnListParams,
  GrnPayload,
  GrnSourceType,
} from '../types/inventory/grn.types';

export function useGrnList(params: GrnListParams) {
  return useQuery({
    queryKey: ['grn', 'list', params],
    queryFn: ({ signal }) => grnService.getList(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function useGrnDocument(id?: string | null) {
  return useQuery({
    queryKey: ['grn', 'document', id],
    queryFn: ({ signal }) => grnService.getById(id as string, signal),
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useGrnNextNumber() {
  return useQuery({
    queryKey: ['grn', 'next-number'],
    queryFn: ({ signal }) => grnService.getNextNumber(signal),
    staleTime: 0,
    retry: 1,
  });
}

export function useGrnSourceDocuments(sourceType: GrnSourceType | '') {
  return useQuery({
    queryKey: ['grn', 'source-documents', sourceType],
    queryFn: ({ signal }) =>
      grnService.getSourceDocuments(sourceType as GrnSourceType, signal),
    enabled: Boolean(sourceType),
    staleTime: 0,
    retry: 1,
  });
}

export function useGrnLookups() {
  const itemsQuery = useQuery({
    queryKey: ['master', 'items'],
    queryFn: ({ signal }) => masterService.getItems(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const locationsQuery = useQuery({
    queryKey: ['inventory', 'locations'],
    queryFn: ({ signal }) => masterService.getLocations(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const isLoading = itemsQuery.isPending || locationsQuery.isPending;

  const isError = itemsQuery.isError || locationsQuery.isError;

  const firstError = itemsQuery.error || locationsQuery.error;

  const errorMessage =
    firstError instanceof Error
      ? firstError.message
      : 'Unable to load GRN master data.';

  const refetch = () => {
    return Promise.all([itemsQuery.refetch(), locationsQuery.refetch()]);
  };

  return {
    items: itemsQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    isLoading,
    isError,
    errorMessage,
    refetch,
  };
}

interface UpdateVariables {
  id: string;
  payload: GrnPayload;
}

interface ActionVariables {
  id: string;
  action: GrnDocumentAction;
  note?: string;
}

export function useGrnMutations() {
  const queryClient = useQueryClient();

  const invalidateGrn = () => {
    return queryClient.invalidateQueries({
      queryKey: ['grn'],
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: GrnPayload) => grnService.create(payload),
    onSuccess: invalidateGrn,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: UpdateVariables) =>
      grnService.update(id, payload),
    onSuccess: invalidateGrn,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => grnService.remove(id),
    onSuccess: invalidateGrn,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, note }: ActionVariables) =>
      grnService.action(id, action, note),
    onSuccess: invalidateGrn,
  });

  return {
    createMutation,
    updateMutation,
    removeMutation,
    actionMutation,
  };
}