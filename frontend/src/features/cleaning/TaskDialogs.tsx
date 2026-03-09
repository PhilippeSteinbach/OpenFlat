import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input } from '@/shared/components';
import type { TaskDto } from './types';

const PREDEFINED_USERS = [
  { id: 1, name: 'Alex' },
  { id: 2, name: 'Jordan' },
  { id: 3, name: 'Sam' },
  { id: 4, name: 'Taylor' },
  { id: 5, name: 'Casey' },
] as const;

// ── Create / Edit Task Dialog ──────────────────────

interface TaskFormDialogProps {
  isOpen: boolean;
  task?: TaskDto | null;
  onClose: () => void;
  onSubmit: (title: string, points: number, dueDate?: string | null, assignedUserId?: number | null) => void;
}

export function TaskFormDialog({ isOpen, task, onClose, onSubmit }: TaskFormDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(task?.title ?? '');
  const [points, setPoints] = useState(String(task?.points ?? 10));
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [assignedUserId, setAssignedUserId] = useState<string>(
    task?.assignedUserId != null ? String(task.assignedUserId) : '',
  );
  const [error, setError] = useState('');

  const isEdit = !!task;

  useEffect(() => {
    if (isOpen) {
      setTitle(task?.title ?? '');
      setPoints(String(task?.points ?? 10));
      setDueDate(task?.dueDate ?? '');
      setAssignedUserId(task?.assignedUserId != null ? String(task.assignedUserId) : '');
      setError('');
    }
  }, [isOpen, task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const parsedPoints = parseInt(points, 10);

    if (!trimmedTitle) {
      setError(t('validation.required', 'Title is required'));
      return;
    }
    if (isNaN(parsedPoints) || parsedPoints < 0) {
      setError(t('validation.positiveNumber', 'Points must be non-negative'));
      return;
    }
    const parsedDueDate = dueDate || null;
    const parsedAssignedUserId = assignedUserId ? parseInt(assignedUserId, 10) : null;
    onSubmit(trimmedTitle, parsedPoints, parsedDueDate, isEdit ? undefined : parsedAssignedUserId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('cleaning.task.edit', 'Edit Task') : t('cleaning.task.create', 'Create Task')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('cleaning.task.titleLabel', 'Title')}
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(''); }}
          placeholder={t('cleaning.task.titlePlaceholder', 'Enter task title...')}
          maxLength={200}
          autoFocus
        />

        <Input
          label={t('cleaning.task.pointsLabel', 'Points')}
          type="number"
          value={points}
          onChange={(e) => { setPoints(e.target.value); setError(''); }}
          min={0}
        />

        <Input
          label={t('cleaning.task.dueDateLabel', 'Due Date')}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('cleaning.task.assignee', 'Assigned to')}
            </label>
            <select
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{t('cleaning.task.unassigned', 'Unassigned')}</option>
              {PREDEFINED_USERS.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit">
            {isEdit ? t('common.save', 'Save') : t('cleaning.task.create', 'Create Task')}
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
}

export function DeleteConfirmDialog({ isOpen, onClose, onConfirm }: DeleteConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('cleaning.task.deleteConfirm', 'Delete Task?')}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          {t('cleaning.task.deleteWarning', 'This action cannot be undone. Points will be deducted if the task was completed.')}
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose(); }}>
            {t('common.delete', 'Delete')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Assign User Dialog ──────────────────────

interface AssignDialogProps {
  isOpen: boolean;
  task: TaskDto | null;
  onClose: () => void;
  onAssign: (userId: number | null) => void;
}

export function AssignDialog({ isOpen, task, onClose, onAssign }: AssignDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen && !!task}
      onClose={onClose}
      title={t('cleaning.task.assign', 'Assign Task')}
    >
      <div className="space-y-2">
        <button
          onClick={() => { onAssign(null); onClose(); }}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            task?.assignedUserId === null ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
          }`}
        >
          <span className="italic text-gray-500">{t('cleaning.task.unassigned', 'Unassigned')}</span>
        </button>
        {PREDEFINED_USERS.map((user) => (
          <button
            key={user.id}
            onClick={() => { onAssign(user.id); onClose(); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              task?.assignedUserId === user.id ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50'
            }`}
          >
            {user.name}
          </button>
        ))}
      </div>
    </Modal>
  );
}
