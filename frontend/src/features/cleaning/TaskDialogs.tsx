import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input } from '@/shared/components';
import { CleaningEffort, FrequencyUnit } from './types';
import type { TaskDto } from './types';

const PREDEFINED_USERS = [
  { id: 1, name: 'Alex' },
  { id: 2, name: 'Jordan' },
  { id: 3, name: 'Sam' },
  { id: 4, name: 'Taylor' },
  { id: 5, name: 'Casey' },
] as const;

const EFFORT_OPTIONS: { value: CleaningEffort; pts: number | null }[] = [
  { value: CleaningEffort.None, pts: 0 },
  { value: CleaningEffort.Normal, pts: 1 },
  { value: CleaningEffort.Big, pts: 2 },
  { value: CleaningEffort.Huge, pts: 4 },
  { value: CleaningEffort.Custom, pts: null },
];

// ── Create / Edit Task Dialog ──────────────────────

interface TaskFormDialogProps {
  isOpen: boolean;
  task?: TaskDto | null;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    effort: CleaningEffort;
    points?: number;
    frequencyValue: number;
    frequencyUnit: FrequencyUnit;
    firstDueDate?: string;
    dueDate?: string;
    rotationOrder?: number[];
  }) => void;
}

export function TaskFormDialog({ isOpen, task, onClose, onSubmit }: TaskFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!task;

  const [title, setTitle] = useState('');
  const [effort, setEffort] = useState<CleaningEffort>(CleaningEffort.Normal);
  const [customPoints, setCustomPoints] = useState('0');
  const [frequencyValue, setFrequencyValue] = useState('7');
  const [frequencyUnit, setFrequencyUnit] = useState<FrequencyUnit>(FrequencyUnit.Days);
  const [dueDate, setDueDate] = useState('');
  const [rotationOrder, setRotationOrder] = useState<number[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle(task?.title ?? '');
      setEffort(task?.effort ?? CleaningEffort.Normal);
      setCustomPoints(String(task?.points ?? 0));
      setFrequencyValue(String(task?.frequencyValue ?? 7));
      setFrequencyUnit(task?.frequencyUnit ?? FrequencyUnit.Days);
      setDueDate(task?.dueDate ?? '');
      setRotationOrder(task?.rotationOrder ?? []);
      setError('');
    }
  }, [isOpen, task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError(t('validation.required', 'Title is required'));
      return;
    }

    const freqVal = parseInt(frequencyValue, 10);
    if (isNaN(freqVal) || freqVal < 1) {
      setError(t('validation.minFrequency', 'Frequency must be at least 1'));
      return;
    }

    if (!dueDate) {
      setError(t('validation.required', 'Due date is required'));
      return;
    }

    const pts = effort === CleaningEffort.Custom ? parseInt(customPoints, 10) : undefined;
    if (effort === CleaningEffort.Custom && (isNaN(pts!) || pts! < 0)) {
      setError(t('validation.positiveNumber', 'Points must be non-negative'));
      return;
    }

    onSubmit({
      title: trimmedTitle,
      effort,
      points: pts,
      frequencyValue: freqVal,
      frequencyUnit,
      ...(isEdit ? { dueDate } : { firstDueDate: dueDate }),
      rotationOrder: rotationOrder.length > 0 ? rotationOrder : undefined,
    });
    onClose();
  };

  const toggleRotationUser = useCallback((userId: number) => {
    setRotationOrder((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }, []);

  const moveRotationUser = useCallback((index: number, direction: -1 | 1) => {
    setRotationOrder((prev) => {
      const next = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= next.length) return prev;
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('cleaning.task.edit', 'Edit Task') : t('cleaning.task.create', 'Create Task')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <Input
          label={t('cleaning.task.titleLabel', 'Title')}
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(''); }}
          placeholder={t('cleaning.task.titlePlaceholder', 'Enter task title...')}
          maxLength={200}
          autoFocus
        />

        {/* Effort preset */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('cleaning.task.effort', 'Effort')}
          </label>
          <div className="flex flex-wrap gap-2">
            {EFFORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setEffort(opt.value); setError(''); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  effort === opt.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                }`}
              >
                {t(`cleaning.effort.${opt.value}`, opt.value)}
                {opt.pts !== null && (
                  <span className="ml-1 opacity-75">({opt.pts} {t('common.points', 'pts')})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom points (only when Custom effort selected) */}
        {effort === CleaningEffort.Custom && (
          <Input
            label={t('cleaning.task.customPoints', 'Custom Points')}
            type="number"
            value={customPoints}
            onChange={(e) => { setCustomPoints(e.target.value); setError(''); }}
            min={0}
          />
        )}

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('cleaning.task.frequency', 'Frequency')}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t('cleaning.frequency.every', 'Every')}</span>
            <input
              type="number"
              value={frequencyValue}
              onChange={(e) => setFrequencyValue(e.target.value)}
              min={1}
              className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={frequencyUnit}
              onChange={(e) => setFrequencyUnit(e.target.value as FrequencyUnit)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={FrequencyUnit.Days}>{t('cleaning.frequency.days', 'Days')}</option>
              <option value={FrequencyUnit.Weeks}>{t('cleaning.frequency.weeks', 'Weeks')}</option>
            </select>
          </div>
        </div>

        {/* Due date */}
        <Input
          label={isEdit ? t('cleaning.task.dueDate', 'Due Date') : t('cleaning.task.firstDueDate', 'First Due Date')}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        {/* Rotation order */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('cleaning.task.rotationOrder', 'Rotation Order')}
            <span className="text-xs text-gray-400 ml-1">({t('cleaning.task.rotationHint', 'optional')})</span>
          </label>

          {/* User selection */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PREDEFINED_USERS.map((user) => {
              const isSelected = rotationOrder.includes(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleRotationUser(user.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'bg-primary-100 text-primary-700 border-primary-300'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {isSelected && '✓ '}{user.name}
                </button>
              );
            })}
          </div>

          {/* Reorderable list */}
          {rotationOrder.length > 0 && (
            <div className="space-y-1">
              {rotationOrder.map((uid, idx) => {
                const user = PREDEFINED_USERS.find((u) => u.id === uid);
                return (
                  <div key={uid} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 w-4 text-right">{idx + 1}.</span>
                    <span className="flex-1 text-gray-700">{user?.name ?? `User ${uid}`}</span>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveRotationUser(idx, -1)}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={idx === rotationOrder.length - 1}
                      onClick={() => moveRotationUser(idx, 1)}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1"
                    >
                      ↓
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
          {t('cleaning.task.deleteWarning', 'This action cannot be undone. Historical completion records will also be removed.')}
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
