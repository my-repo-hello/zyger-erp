export interface Process {
  id: number;
  code: string;
  name: string;
  description?: string;
  processGroupId?: number;
  processGroupCode?: string;
  cycleTime?: number;
  setupTime?: number;
  unitRate?: number;
  machineRequired: boolean;
  inspection: boolean;
  active: boolean;
}

export const defaultForm = (): Record<string, unknown> => ({
  code: '', name: '', description: '',
  processGroupId: null, cycleTime: null, setupTime: null, unitRate: null,
  machineRequired: false, inspection: false, active: true,
});
