import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Button } from '@/shared/components';

// ── Item Form Dialog (Add / Edit) ──────────────────────

interface ItemFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, quantity: number) => void;
  title: string;
  initialName?: string;
  initialQuantity?: number;
  isPending?: boolean;
}

export function ItemFormDialog({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialName = '',
  initialQuantity = 1,
  isPending = false,
}: ItemFormDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [quantity, setQuantity] = useState(initialQuantity);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), Math.max(1, quantity));
  };

  // Reset form when dialog opens
  const handleClose = () => {
    setName(initialName);
    setQuantity(initialQuantity);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('shopping.item.name')}
          placeholder={t('shopping.item.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
        <Input
          label={t('shopping.item.quantity')}
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={!name.trim() || isPending}>
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('common.confirmDelete', 'Confirm Delete')}
    >
      <p className="text-gray-600 mb-6">
        {t('common.deleteConfirmMessage', 'Are you sure you want to delete this item? This action cannot be undone.')}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isPending}>
          {isPending ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
        </Button>
      </div>
    </Modal>
  );
}
