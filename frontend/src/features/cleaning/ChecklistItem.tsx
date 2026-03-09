import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, UserRound, Pencil, Trash2 } from 'lucide-react';
import { useCurrentUserStore } from '@/shared/hooks/useCurrentUser';
import { Badge } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import { FrequencyUnit } from './types';
import type { TaskDto } from './types';

interface ChecklistItemProps {
  task: TaskDto;
  onComplete: (nextUserId?: number) => void;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
}

function computeDeadlineBadge(dueDate: string, t: (key: string, opts?: Record<string, unknown>) => string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: t('cleaning.deadline.overdue', { count: overdueDays }),
      variant: 'danger' as const,
    };
  } else if (diffDays === 0) {
    return {
      label: t('cleaning.deadline.today', { defaultValue: 'Today' }),
      variant: 'warning' as const,
    };
  } else if (diffDays <= 3) {
    return {
      label: t('cleaning.deadline.daysLeft', { count: diffDays }),
      variant: 'warning' as const,
    };
  } else {
    return {
      label: t('cleaning.deadline.daysLeft', { count: diffDays }),
      variant: 'success' as const,
    };
  }
}

function formatFrequency(value: number, unit: string, t: (key: string, opts?: Record<string, unknown>) => string) {
  const unitLabel = unit === FrequencyUnit.Weeks
    ? t('cleaning.frequency.weeks', { defaultValue: 'w' })
    : t('cleaning.frequency.days', { defaultValue: 'd' });
  return `${value}${unitLabel.charAt(0).toLowerCase()}`;
}

export function ChecklistItem({ task, onComplete, onClick, onEdit, onDelete, onAssign }: ChecklistItemProps) {
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const isAssignedToMe = currentUser && task.assignedUserId === currentUser.id;

  const badge = useMemo(
    () => computeDeadlineBadge(task.dueDate, t),
    [task.dueDate, t],
  );

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors',
        isAssignedToMe
          ? 'bg-primary/5 border-primary/30 hover:bg-primary/10'
          : 'bg-card border-border hover:bg-accent',
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-emerald-500/60 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500 transition-colors"
        aria-label={t('cleaning.task.complete', 'Complete')}
        title={t('cleaning.task.complete', 'Complete')}
      >
        <Check className="w-4 h-4" />
      </button>

      <button
        onClick={onClick}
        className="flex-1 min-w-0 text-left flex items-center gap-2"
      >
        <span className="truncate font-medium text-sm text-foreground">
          {task.title}
        </span>

        <Badge variant="warning" className="flex-shrink-0">
          {task.points} {t('common.points')}
        </Badge>

        <Badge variant="muted" className="flex-shrink-0">
          {formatFrequency(task.frequencyValue, task.frequencyUnit, t)}
        </Badge>

        {task.assignedUserName && (
          <span className={cn(
            'flex-shrink-0 text-xs',
            isAssignedToMe ? 'text-primary font-medium' : 'text-muted-foreground',
          )}>
            {task.assignedUserName}
            {isAssignedToMe && t('cleaning.task.youSuffix')}
          </span>
        )}

        {badge && (
          <Badge variant={badge.variant} className="flex-shrink-0">
            {badge.label}
          </Badge>
        )}

        {task.lastCompletedByUserName && (
          <span className="flex-shrink-0 text-xs text-muted-foreground hidden sm:inline">
            {t('cleaning.task.lastBy', 'last:')} {task.lastCompletedByUserName}
          </span>
        )}
      </button>

      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onAssign(); }}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
          aria-label={t('cleaning.task.assign')}
          title={t('cleaning.task.assign')}
        >
          <UserRound className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
          aria-label={t('common.edit')}
          title={t('common.edit')}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 text-muted-foreground hover:text-destructive-foreground rounded-md hover:bg-destructive/10 transition-colors"
          aria-label={t('common.delete')}
          title={t('common.delete')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
