import { useTranslation } from 'react-i18next';
import { CommentThread } from '@/features/comments/CommentThread';
import {
  useTaskDetailQuery,
  useAddTaskCommentMutation,
  useUpdateTaskCommentMutation,
  useDeleteTaskCommentMutation,
} from './api';
import type { TaskDto } from './types';

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
        <div className="px-6 py-4 border-b border-gray-100 space-y-2">
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
              {task.points} {t('common.points', 'pts')}
            </span>
            <span className={task.isDone ? 'text-green-600 font-medium' : 'text-gray-500'}>
              {task.isDone ? t('cleaning.task.done', 'Done') : t('cleaning.task.open', 'Open')}
            </span>
            {task.assignedUserName && (
              <span className="text-gray-600">
                → {task.assignedUserName}
              </span>
            )}
          </div>
          {task.dueDate && (
            <p className="text-xs text-gray-500">
              {t('cleaning.task.dueDate', 'Due')}: {task.dueDate}
            </p>
          )}
          {task.completedAt && (
            <p className="text-xs text-gray-500">
              {t('cleaning.task.completedAt', 'Completed')}: {new Date(task.completedAt).toLocaleString()}
            </p>
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
