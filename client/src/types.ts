export type CategoryKey = 'raw' | 'equipment' | 'supply';

export interface Item {
  id: number;
  category: CategoryKey;
  name: string;
  weight: number;
  length: number;
  quantity: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateItemPayload {
  category: CategoryKey;
  name: string;
  mode?: 'weight' | 'length';
  amount?: number;
  weight?: number;
  length?: number;
  quantity?: number;
  force?: boolean;
}
