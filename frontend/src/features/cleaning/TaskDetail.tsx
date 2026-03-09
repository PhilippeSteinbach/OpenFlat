import { useTranslation } from 'react-i18next';
import { CommentThread } from '@/features/comments/CommentThread';
import {
  useTaskDetailQuery,
  useAddTaskCommentMutation,
  useUpdateTaskCommentMutation,
  useDeleteTaskCommentMutation,
} from './api';
import { FrequencyUnit } from './types';
import type { TaskDto } from './types';

const PREDEFINED_USERS: Record<number, string> = {
  1: 'Alex',
  2: 'Jordan',
  3: 'Sam',
  4: 'Taylor',
  5: 'Casey',
};

interface TaskDetailProps {
  task: TaskDto;
  onClose: () => void;
}

export function TaskDetail({ task, onClose }: TaskDetailProps) {
  const { t } = useTranslation();
  const { data: detail, isLoading } = useTaskDetailQuery(task.id);
  const addComment = useAddTaskCommentMutation();
  const updateComment = useUpdateTaskCommentMutation();
  const deleteComment = useDeleteTaskCommentMutation();

  const frequencyLabel = task.frequencyUnit === FrequencyUnit.Weeks
    ? t('cleaning.frequency.weeks', 'Weeks')
    : t('cleaning.frequency.days', 'Days');

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label={task.title}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="relative bg-white w-full max-w-lg shadow-xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{task.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
            aria-label={t('common.close', 'Close')}
          >
            ✕
          </button>
        </div>

        {/* Task info */}
        <div className="px-6 py-4 border-b border-gray-100 space-y-3">
          {/* Badges row */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
              {task.points} {t('common.points', 'pts')}
            </span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
              {t(`cleaning.effort.${task.effort}`, task.effort)}
            </span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
              {t('cleaning.frequency.every', 'Every')} {task.frequencyValue} {frequencyLabel}
            </span>
            {task.assignedUserName && (
              <span className="text-gray-600">
                → {task.assignedUserName}
              </span>
            )}
          </div>

          {/* Due date */}
          <p className="text-xs text-gray-500">
            {t('cleaning.task.dueDate', 'Due')}: {task.dueDate}
          </p>

          {/* Last completed */}
          {task.lastCompletedAt && (
            <p className="text-xs text-gray-500">
              {t('cleaning.task.lastCompleted', 'Last completed')}: {new Date(task.lastCompletedAt).toLocaleString()}
              {task.lastCompletedByUserName && (
                <span className="ml-1">({t('cleaning.task.by', 'by')} {task.lastCompletedByUserName})</span>
              )}
            </p>
          )}

          {/* Rotation schedule */}
          {task.rotationOrder.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">
                {t('cleaning.rotation.schedule', 'Rotation')}
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                {task.rotationOrder.map((userId, idx) => {
                  const name = PREDEFINED_USERS[userId] ?? `User ${userId}`;
                  const isCurrent = idx === task.rotationIndex;
                  return (
                    <span
                      key={userId}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isCurrent
                          ? 'bg-primary-100 text-primary-700 font-semibold ring-1 ring-primary-300'
                          : 'bg-gray-50 text-gray-500'
                      }`}
                    >
                      {name}
                      {idx < task.rotationOrder.length - 1 && (
                        <span className="ml-1 text-gray-300">→</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Comments section */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-8">{t('comments.loading')}</p>
          ) : (
            <CommentThread
              comments={detail?.comments ?? []}
              onAdd={async (text) => {
                await addComment.mutateAsync({ taskId: task.id, req: { text } });
              }}
              onUpdate={async (commentId, text) => {
                await updateComment.mutateAsync({ taskId: task.id, commentId, text });
              }}
              onDelete={async (commentId) => {
                await deleteComment.mutateAsync({ taskId: task.id, commentId });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
