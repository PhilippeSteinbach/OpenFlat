import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/react';
import type { TaskDto } from './types';
import { useCurrentUserStore } from '@/shared/hooks/useCurrentUser';

interface TaskCardProps {
  task: TaskDto;
  onEdit: (task: TaskDto) => void;
  onDelete: (taskId: string) => void;
  onAssign: (task: TaskDto) => void;
}

const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500'];

export function TaskCard({ task, onEdit, onDelete, onAssign }: TaskCardProps) {
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const isAssignedToCurrentUser = task.assignedUserId === currentUser?.id;

  const { ref } = useDraggable({
    id: task.id,
    data: task,
  });

  return (
    <div
      ref={ref}
      className={`rounded-lg bg-white border p-3 shadow-sm cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${
        isAssignedToCurrentUser
          ? 'border-primary-400 ring-1 ring-primary-200'
          : 'border-gray-200'
      }`}
      role="article"
      aria-label={`${task.title}, ${task.points} ${t('common.points')}`}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <h3 className="text-sm font-medium text-gray-900 flex-1 line-clamp-2">
          {task.title}
        </h3>
        <span className="shrink-0 bg-amber-100 text-amber-800 text-xs font-semibold px-1.5 py-0.5 rounded">
          {task.points} {t('common.points')}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={(e) => { e.stopPropagation(); onAssign(task); }}
          className="text-xs text-gray-500 hover:text-gray-700 truncate max-w-[120px]"
          title={task.assignedUserName ?? t('cleaning.task.assign')}
        >
          {task.assignedUserName ? (
            <span className="flex items-center gap-1">
              <span
                className={`w-4 h-4 rounded-full ${AVATAR_COLORS[(task.assignedUserId! - 1) % AVATAR_COLORS.length]} inline-flex items-center justify-center text-white text-[9px] font-bold`}
              >
                {task.assignedUserName.charAt(0)}
              </span>
              <span className={isAssignedToCurrentUser ? 'font-semibold text-primary-600' : ''}>
                {task.assignedUserName}
              </span>
            </span>
          ) : (
            <span className="italic">{t('cleaning.task.unassigned', 'Unassigned')}</span>
          )}
        </button>

        <div className="flex gap-1">
          {task.commentCount > 0 && (
            <span className="text-xs text-gray-400" title={`${task.commentCount} comments`}>
              💬 {task.commentCount}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="text-xs text-gray-400 hover:text-gray-600 p-0.5"
            title={t('common.edit')}
            aria-label={t('common.edit')}
          >
            ✏️
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="text-xs text-gray-400 hover:text-red-500 p-0.5"
            title={t('common.delete')}
            aria-label={t('common.delete')}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
