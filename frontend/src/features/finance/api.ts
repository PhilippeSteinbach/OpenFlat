import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '@/shared/api/client';
import type {
  ExpenseDto,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  SettlementResponse,
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

export function useExpensesQuery() {
  return useQuery<ExpenseDto[]>({
    queryKey: ['finance', 'expenses'],
    queryFn: () => financeApi.get<ExpenseDto[]>('/expenses', headers()),
  });
}

export function useSettlementQuery() {
  return useQuery<SettlementResponse>({
    queryKey: ['finance', 'settlement'],
    queryFn: () => financeApi.get<SettlementResponse>('/settlement', headers()),
  });
}

// ── Mutations ──────────────────────

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient();
  return useMutation<ExpenseDto, Error, CreateExpenseRequest>({
    mutationFn: (req) => financeApi.post<ExpenseDto>('/expenses', req, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient();
  return useMutation<ExpenseDto, Error, { expenseId: string; req: UpdateExpenseRequest }>({
    mutationFn: ({ expenseId, req }) =>
      financeApi.put<ExpenseDto>(`/expenses/${expenseId}`, req, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (expenseId) =>
      financeApi.delete<void>(`/expenses/${expenseId}`, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}
