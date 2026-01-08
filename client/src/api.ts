import type { CreateItemPayload, Item } from './types';

type QueryParams = Record<string, string | number | boolean | undefined>;

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}` : '';

const buildQuery = (params: QueryParams) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    qs.set(key, String(value));
  });
  const suffix = qs.toString();
  return suffix ? `?${suffix}` : '';
};

class ApiError extends Error {
  status?: number;
  data?: unknown;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new ApiError((data && data.error) || 'Запрос завершился с ошибкой');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  listItems(category: Item['category'], params: { search?: string; availableOnly?: boolean }) {
    return request<Item[]>(`/api/items${buildQuery({ category, search: params.search, availableOnly: params.availableOnly })}`);
  },
  createItem(payload: CreateItemPayload) {
    return request<Item>('/api/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateItem(id: number, payload: Partial<Item>) {
    return request<Item>(`/api/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  zeroItem(id: number) {
    return request<Item>(`/api/items/${id}/zero`, { method: 'POST' });
  },
  deleteItem(id: number) {
    return request<{ ok: boolean; deletedId: number }>(`/api/items/${id}`, { method: 'DELETE' });
  },
};
