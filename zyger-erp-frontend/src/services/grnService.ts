import apiClient from '../api/axiosClient';
import { printDocument as printDoc } from '../utils/printDocument';
import type { PageDto } from '../types/api.types';
import type {
  GrnDocumentAction,
  GrnDto,
  GrnListParams,
  GrnListRowDto,
  GrnNextNumber,
  GrnPayload,
  GrnSourceDocumentOption,
  GrnSourceType,
} from '../types/inventory/grn.types';

type ApiList<T> = T[] | PageDto<T>;

function unwrap<T>(data: ApiList<T>): T[] {
  return Array.isArray(data) ? data : data.content ?? [];
}

const BASE = '/inventory/store-receipt/grn';

const SOURCE_DOCUMENT_ENDPOINTS: Record<GrnSourceType, string> = {
  PO_INWARD: '/inventory/documents/po-inward',
  LO_INWARD: '/inventory/documents/lo-inward',
  JO_INWARD: '/inventory/documents/jo-inward',
  GENERAL_INWARD: '/inventory/documents/general-inward',
  RETURN_INWARD: '/inventory/documents/return-inward',
};

export type GrnExportFormat = 'xlsx' | 'pdf';

export const grnService = {
  async getList(
    params: GrnListParams,
    signal?: AbortSignal
  ): Promise<PageDto<GrnListRowDto>> {
    const response = await apiClient.get<PageDto<GrnListRowDto>>(BASE, {
      params: {
        page: params.page,
        size: params.size,
        sort: params.sort || 'date,desc',
        search: params.search || undefined,
        status: params.status || undefined,
      },
      signal,
    });

    return response.data;
  },

  async getById(id: string, signal?: AbortSignal): Promise<GrnDto> {
    const response = await apiClient.get<GrnDto>(`${BASE}/${id}`, {
      signal,
    });

    return response.data;
  },

  async create(payload: GrnPayload): Promise<GrnDto> {
    const response = await apiClient.post<GrnDto>(BASE, payload);
    return response.data;
  },

  async update(id: string, payload: GrnPayload): Promise<GrnDto> {
    const response = await apiClient.put<GrnDto>(`${BASE}/${id}`, payload);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${id}`);
  },

  async action(
    id: string,
    action: GrnDocumentAction,
    note?: string
  ): Promise<GrnDto> {
    const response = await apiClient.post<GrnDto>(
      `${BASE}/${id}/actions/${action}`,
      {
        note: note ?? '',
      }
    );

    return response.data;
  },

  async getNextNumber(signal?: AbortSignal): Promise<GrnNextNumber> {
    const response = await apiClient.get<GrnNextNumber>(
      `${BASE}/next-number`,
      {
        signal,
      }
    );

    return response.data;
  },

  async getSourceDocuments(
    sourceType: GrnSourceType,
    signal?: AbortSignal
  ): Promise<GrnSourceDocumentOption[]> {
    const endpoint = SOURCE_DOCUMENT_ENDPOINTS[sourceType];

    const response = await apiClient.get<
      ApiList<{
        docNo?: string;
        no?: string;
        party?: string;
        date?: string;
      }>
    >(endpoint, {
      params: {
        status: 'POSTED',
        page: 0,
        size: 200,
        sort: 'date,desc',
      },
      signal,
    });

    return unwrap(response.data)
      .map((row) => ({
        docNo: row.docNo ?? row.no ?? '',
        party: row.party,
        date: row.date,
      }))
      .filter((row) => Boolean(row.docNo));
  },

  async exportFile(
    params: Omit<GrnListParams, 'page' | 'size'>,
    format: GrnExportFormat
  ): Promise<void> {
    const response = await apiClient.get(`${BASE}/export`, {
      params: {
        format,
        search: params.search || undefined,
        status: params.status || undefined,
        sort: params.sort || 'date,desc',
      },
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `GRN.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
    anchor.click();

    URL.revokeObjectURL(url);
  },

  /** Downloads or prints a single GRN PDF. */
  printDocument(
    id: string,
    _docNo: string,
    mode: 'download' | 'print'
  ): void {
    const base = import.meta.env.VITE_API_BASE_URL || '/api';
    printDoc(`${base}${BASE}/${id}/print?download=${mode === 'download'}`, mode);
  },
};