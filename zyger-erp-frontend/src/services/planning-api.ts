import apiClient from '../api/axiosClient';
import type { PageDto } from '../types/api.types';

export const planningApi = {
  async listDocs(docType: string, params: { page?: number; size?: number; sort?: string; search?: string; status?: string; type?: string }): Promise<PageDto<Record<string, unknown>>> {
    const response = await apiClient.get<PageDto<Record<string, unknown>>>(`/v1/planning/${docType}`, { params });
    return response.data;
  },

  async getDoc(docType: string, id: number | string): Promise<Record<string, unknown>> {
    const response = await apiClient.get<Record<string, unknown>>(`/v1/planning/${docType}/${id}`);
    return response.data;
  },

  async createDoc(docType: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(`/v1/planning/${docType}`, payload);
    return response.data;
  },

  async updateDoc(docType: string, id: number | string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await apiClient.put<Record<string, unknown>>(`/v1/planning/${docType}/${id}`, payload);
    return response.data;
  },

  async deleteDoc(docType: string, id: number | string): Promise<void> {
    await apiClient.delete(`/v1/planning/${docType}/${id}`);
  },

  async nextDocNumber(docType: string): Promise<{ nextNumber: string }> {
    const response = await apiClient.get<{ nextNumber: string }>(`/v1/planning/${docType}/next-number`);
    return response.data;
  },

  async docAction(docType: string, id: number | string, action: string, note?: string): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(`/v1/planning/${docType}/${id}/actions/${action}`, { note: note ?? '' });
    return response.data;
  },

  async dashboard(): Promise<Record<string, number>> {
    const response = await apiClient.get<Record<string, number>>('/v1/planning/dashboard');
    return response.data;
  },

  getWorkCenters: () => apiClient.get('/api/master/work-centers').then(r => r.data),
  getMachines: () => apiClient.get('/api/master/machines').then(r => r.data),
  getOperations: () => apiClient.get('/api/master/operations').then(r => r.data),
  getShifts: () => apiClient.get('/api/master/shifts').then(r => r.data),
  getItems: (params?: Record<string, string>) => apiClient.get('/api/master/items', { params }).then(r => r.data),

  // Master Module
  getUoms: () => apiClient.get('/api/master/uoms').then(r => r.data),
  getItemGroups: () => apiClient.get('/api/master/item-groups').then(r => r.data),
  getStores: () => apiClient.get('/api/master/stores').then(r => r.data),
  getProcessGroups: () => apiClient.get('/api/master/process-groups').then(r => r.data),
  getProcesses: () => apiClient.get('/api/master/processes').then(r => r.data),
  getInstruments: () => apiClient.get('/api/master/instruments').then(r => r.data),
  getTools: () => apiClient.get('/api/master/tools').then(r => r.data),
  getCompanyInfo: () => apiClient.get('/api/master/company-info').then(r => r.data),
  updateCompanyInfo: (data: Record<string, unknown>) => apiClient.put('/api/master/company-info', data).then(r => r.data),
  getMasterDashboard: () => apiClient.get('/api/master/dashboard').then(r => r.data),
};
