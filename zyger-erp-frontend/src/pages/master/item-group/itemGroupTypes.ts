export interface ItemGroup {
  id: number;
  code: string;
  name: string;
  itemType?: string;
  description?: string;
  parentId?: number;
  parentCode?: string;
  active: boolean;
}

export const defaultForm = (): Record<string, unknown> => ({
  code: '',
  name: '',
  itemType: 'Purchasable Item',
  description: '',
  parentId: null,
  active: true,
});
