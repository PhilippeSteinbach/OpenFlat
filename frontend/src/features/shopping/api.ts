import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shoppingApi } from '@/shared/api/client';
import type {
  ShoppingListResponse,
  ItemDto,
  ItemDetailDto,
  CreateItemRequest,
  UpdateItemRequest,
} from './types';

const userId = () => {
  const stored = localStorage.getItem('openflat-current-user');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed?.state?.currentUser?.id ?? 1;
    } catch {
      return 1;
    }
  }
  return 1;
};

const headers = () => ({ 'X-User-Id': String(userId()) });

// ── Queries ──────────────────────

export function useShoppingListQuery() {
  return useQuery<ShoppingListResponse>({
    queryKey: ['shopping', 'items'],
    queryFn: () =>
      shoppingApi.get<ShoppingListResponse>('/items', headers()),
  });
}

export function useItemDetailQuery(itemId: string | undefined) {
  return useQuery<ItemDetailDto>({
    queryKey: ['shopping', 'items', itemId],
    queryFn: () =>
      shoppingApi.get<ItemDetailDto>(`/items/${itemId}`, headers()),
    enabled: !!itemId,
  });
}

// ── Mutations ──────────────────────

export function useCreateItemMutation() {
  const queryClient = useQueryClient();
  return useMutation<ItemDto, Error, CreateItemRequest>({
    mutationFn: (req) =>
      shoppingApi.post<ItemDto>('/items', req, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', 'items'] });
    },
  });
}

export function useUpdateItemMutation() {
  const queryClient = useQueryClient();
  return useMutation<ItemDto, Error, { itemId: string; req: UpdateItemRequest }>({
    mutationFn: ({ itemId, req }) =>
      shoppingApi.put<ItemDto>(`/items/${itemId}`, req, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    },
  });
}

export function useDeleteItemMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (itemId) =>
      shoppingApi.delete<void>(`/items/${itemId}`, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    },
  });
}

export function useBuyItemMutation() {
  const queryClient = useQueryClient();
  return useMutation<ItemDto, Error, string>({
    mutationFn: (itemId) =>
      shoppingApi.post<ItemDto>(`/items/${itemId}/buy`, {}, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    },
  });
}

export function useUndoBuyMutation() {
  const queryClient = useQueryClient();
  return useMutation<ItemDto, Error, string>({
    mutationFn: (itemId) =>
      shoppingApi.post<ItemDto>(`/items/${itemId}/undo`, {}, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    },
  });
}
