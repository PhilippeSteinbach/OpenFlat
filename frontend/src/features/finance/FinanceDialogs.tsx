import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Button } from '@/shared/components';

// ── Expense Form Dialog (Log / Edit) ──────────────────────

interface ExpenseFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amountEur: number, description: string) => void;
  title: string;
  initialAmount?: string;
  initialDescription?: string;
  isPending?: boolean;
}

export function ExpenseFormDialog({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialAmount = '',
  initialDescription = '',
  isPending = false,
}: ExpenseFormDialogProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(initialAmount);
  const [description, setDescription] = useState(initialDescription);
  const [amountError, setAmountError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0.01) {
      setAmountError(t('finance.validation.amountPositive'));
      return;
    }
    if (!description.trim()) {
      setDescriptionError(t('validation.descriptionRequired', 'Description is required'));
      return;
    }
    setAmountError('');
    setDescriptionError('');
    onSubmit(parsed, description.trim());
  };

  const handleClose = () => {
    setAmount(initialAmount);
    setDescription(initialDescription);
    setAmountError('');
    setDescriptionError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('finance.expense.amount')}
          placeholder={t('finance.expense.amountPlaceholder')}
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setAmountError(''); }}
          error={amountError}
          autoFocus
          required
        />
        <Input
          label={t('finance.expense.description')}
          placeholder={t('finance.expense.descriptionPlaceholder')}
          value={description}
          onChange={(e) => { setDescription(e.target.value); setDescriptionError(''); }}
          error={descriptionError}
          required
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={!description.trim() || isPending}>
            {isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete Confirmation Dialog ──────────────────────

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isPending = false,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('finance.expense.delete')}>
      <p className="text-muted-foreground mb-6">
        {t('finance.expense.deleteConfirm')}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
          {isPending ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
        </Button>
      </div>
    </Modal>
  );
}
