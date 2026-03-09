import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '@/shared/hooks/useCurrentUser';
import type { TaskDto } from './types';

interface ChecklistItemProps {
  task: TaskDto;
  onToggle: () => void;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
}

function computeDeadlineBadge(dueDate: string | null, t: (key: string, opts?: Record<string, unknown>) => string) {
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: t('cleaning.deadline.overdue', { count: overdueDays }),
      className: 'bg-red-100 text-red-700',
    };
  } else if (diffDays === 0) {
    return {
      label: t('cleaning.deadline.today', { defaultValue: 'Today' }),
      className: 'bg-orange-100 text-orange-700',
    };
  } else if (diffDays <= 3) {
    return {
      label: t('cleaning.deadline.daysLeft', { count: diffDays }),
      className: 'bg-yellow-100 text-yellow-700',
    };
  } else {
    return {
      label: t('cleaning.deadline.daysLeft', { count: diffDays }),
      className: 'bg-green-100 text-green-700',
    };
  }
}

export function ChecklistItem({ task, onToggle, onClick, onEdit, onDelete, onAssign }: ChecklistItemProps) {
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const isAssignedToMe = currentUser && task.assignedUserId === currentUser.id;

  const badge = useMemo(
    () => (task.isDone ? null : computeDeadlineBadge(task.dueDate, t)),
    [task.isDone, task.dueDate, t],
  );

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
        task.isDone
          ? 'bg-gray-50 border-gray-100'
          : isAssignedToMe
            ? 'bg-primary-50/50 border-primary-100 hover:bg-primary-50'
            : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          task.isDone
            ? 'bg-primary-600 border-primary-600 text-white'
            : 'border-gray-300 hover:border-primary-400'
        }`}
        aria-label={task.isDone ? t('cleaning.task.markUndone', 'Mark as not done') : t('cleaning.task.markDone', 'Mark as done')}
      >
        {task.isDone && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Main content — clickable for detail */}
      <button
        onClick={onClick}
        className="flex-1 min-w-0 text-left flex items-center gap-2"
      >
        <span
          className={`truncate font-medium text-sm ${
            task.isDone ? 'line-through text-gray-400' : 'text-gray-900'
          }`}
        >
          {task.title}
        </span>

        {/* Points badge */}
        <span className="flex-shrink-0 text-xs font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
          {task.points} {t('common.points')}
        </span>

        {/* Assignee */}
        {task.assignedUserName && (
          <span className={`flex-shrink-0 text-xs ${isAssignedToMe ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>
            {task.assignedUserName}
            {isAssignedToMe && t('cleaning.task.youSuffix')}
          </span>
        )}

        {/* Deadline badge */}
        {badge && (
          <span className={`flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </button>

      {/* Action buttons — visible on hover */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onAssign(); }}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          aria-label={t('cleaning.task.assign')}
          title={t('cleaning.task.assign')}
        >
          👤
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          aria-label={t('common.edit')}
          title={t('common.edit')}
        >
          ✏️
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-gray-400 hover:text-red-500 rounded"
          aria-label={t('common.delete')}
          title={t('common.delete')}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
