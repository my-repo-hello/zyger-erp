export interface UOM {
  id: number;
  code: string;
  name: string;
  symbol?: string;
  baseUom?: string;
  conversionFactor?: number;
  description?: string;
  active: boolean;
}

export const defaultForm = (): Record<string, unknown> => ({
  code: '',
  name: '',
  symbol: '',
  baseUom: '',
  conversionFactor: null,
  description: '',
  active: true,
});
