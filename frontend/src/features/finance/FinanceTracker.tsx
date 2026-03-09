import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState } from '@/shared/components';
import {
  useExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} from './api';
import { SettlementView } from './SettlementView';
import { ExpenseFormDialog, DeleteConfirmDialog } from './FinanceDialogs';
import type { ExpenseDto } from './types';

type Tab = 'expenses' | 'settlement';

export function FinanceTracker() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('expenses');

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">{t('finance.title')}</h1>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-200" role="tablist">
        {(['expenses', 'settlement'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            role="tab"
            aria-selected={activeTab === tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t(`finance.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'expenses' ? <ExpenseList /> : <SettlementView />}
    </div>
  );
}

// ── Expense List ──────────────────────

function ExpenseList() {
  const { t } = useTranslation();
  const { data: expenses, isLoading, error, refetch } = useExpensesQuery();
  const createMutation = useCreateExpenseMutation();
  const updateMutation = useUpdateExpenseMutation();
  const deleteMutation = useDeleteExpenseMutation();

  const [showLogDialog, setShowLogDialog] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseDto | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

  const handleCreate = useCallback(
    (amountEur: number, description: string) => {
      createMutation.mutate({ amountEur, description }, { onSuccess: () => setShowLogDialog(false) });
    },
    [createMutation],
  );

  const handleUpdate = useCallback(
    (amountEur: number, description: string) => {
      if (!editExpense) return;
      updateMutation.mutate(
        { expenseId: editExpense.id, req: { amountEur, description } },
        { onSuccess: () => setEditExpense(null) },
      );
    },
    [editExpense, updateMutation],
  );

  const handleDelete = useCallback(() => {
    if (!deleteExpenseId) return;
    deleteMutation.mutate(deleteExpenseId, { onSuccess: () => setDeleteExpenseId(null) });
  }, [deleteExpenseId, deleteMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-center text-red-600">{t('common.error', 'Failed to load expenses')}</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

  const list = expenses ?? [];

  return (
    <>
      {/* Log button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowLogDialog(true)} size="sm">
          + {t('finance.expense.log')}
        </Button>
      </div>

      {/* Expense list */}
      {list.length === 0 ? (
        <EmptyState
          icon="💰"
          title={t('finance.empty')}
          action={{ label: t('finance.expense.log'), onClick: () => setShowLogDialog(true) }}
        />
      ) : (
        <div className="space-y-2">
          {list.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onEdit={setEditExpense}
              onDelete={(id) => setDeleteExpenseId(id)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ExpenseFormDialog
        isOpen={showLogDialog}
        onClose={() => setShowLogDialog(false)}
        onSubmit={handleCreate}
        title={t('finance.expense.log')}
        isPending={createMutation.isPending}
      />

      {editExpense && (
        <ExpenseFormDialog
          isOpen
          onClose={() => setEditExpense(null)}
          onSubmit={handleUpdate}
          title={t('finance.expense.edit')}
          initialAmount={editExpense.amountEur.toFixed(2)}
          initialDescription={editExpense.description}
          isPending={updateMutation.isPending}
        />
      )}

      <DeleteConfirmDialog
        isOpen={!!deleteExpenseId}
        onClose={() => setDeleteExpenseId(null)}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}

// ── Expense Card ──────────────────────

interface ExpenseCardProps {
  expense: ExpenseDto;
  onEdit: (expense: ExpenseDto) => void;
  onDelete: (id: string) => void;
}

function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  const { t } = useTranslation();
  const date = new Date(expense.createdAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card className="flex items-center gap-3">
      {/* Amount */}
      <div className="flex-shrink-0 text-right min-w-[70px]">
        <span className="text-lg font-bold text-gray-900">
          €{expense.amountEur.toFixed(2)}
        </span>
      </div>

      {/* Description + meta */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{expense.description}</p>
        <p className="text-xs text-gray-400">
          {t('finance.expense.loggedBy', { name: expense.loggedByUserName })} · {date}
        </p>
      </div>

      {/* Own-only actions */}
      {expense.isOwn && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(expense)} aria-label={t('common.edit')}>
            ✏️
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(expense.id)} aria-label={t('common.delete')}>
            🗑️
          </Button>
        </div>
      )}
    </Card>
  );
}
