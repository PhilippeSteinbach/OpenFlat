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

  const statusLabel = t(`cleaning.columns.${task.status === 'in_progress' ? 'inProgress' : task.status === 'awaiting_review' ? 'awaitingReview' : task.status}`, task.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

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
          <div className="flex items-center gap-3 text-sm">
            <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
              {task.points} {t('common.points', 'pts')}
            </span>
            <span className="text-gray-500">{statusLabel}</span>
            {task.assignedUserName && (
              <span className="text-gray-600">
                → {task.assignedUserName}
              </span>
            )}
          </div>
        </div>

        {/* Comments section */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading comments...</p>
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
