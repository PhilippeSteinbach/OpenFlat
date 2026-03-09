import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/shared/components';
import {
  useTasksQuery,
  useLeaderboardQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useCompleteTaskMutation,
  useAssignTaskMutation,
} from './api';
import { useCleaningHub } from './useCleaningHub';
import { ChecklistItem } from './ChecklistItem';
import { TaskFormDialog, DeleteConfirmDialog, AssignDialog } from './TaskDialogs';
import { TaskDetail } from './TaskDetail';
import type { TaskDto } from './types';

export function CleaningChecklist() {
  const { t } = useTranslation();
  const { data: tasks, isLoading, isError } = useTasksQuery();
  const { data: leaderboard } = useLeaderboardQuery();
  const createTask = useCreateTaskMutation();
  const updateTask = useUpdateTaskMutation();
  const deleteTask = useDeleteTaskMutation();
  const completeTask = useCompleteTaskMutation();
  const assignTask = useAssignTaskMutation();
  const { isConnected } = useCleaningHub();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskDto | null>(null);
  const [assigningTask, setAssigningTask] = useState<TaskDto | null>(null);
  const [detailTask, setDetailTask] = useState<TaskDto | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-500">{t('common.error')}</p>
      </div>
    );
  }

  // Tasks are already sorted by dueDate (urgency) from the API
  const taskList = tasks ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('cleaning.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isConnected
              ? t('cleaning.signalr.connected')
              : t('cleaning.signalr.connecting')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          + {t('cleaning.task.create')}
        </button>
      </div>

      {/* Leaderboard compact */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {leaderboard.map((entry) => (
            <div
              key={entry.userId}
              className="flex items-center gap-1.5 text-sm bg-gray-50 rounded-full px-3 py-1"
            >
              <span className="font-medium text-gray-700">{entry.userName}</span>
              <span className="text-amber-600 font-semibold">{entry.totalPoints} {t('common.points')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Task list — single list sorted by urgency (overdue → due soon → later) */}
      {taskList.length === 0 ? (
        <EmptyState
          icon="🧹"
          title={t('cleaning.emptyState.title', 'No tasks yet')}
          description={t('cleaning.emptyState.description', 'Create your first cleaning task to get started!')}
          action={{
            label: t('cleaning.task.create'),
            onClick: () => setShowCreateDialog(true),
          }}
        />
      ) : (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {t('cleaning.sections.tasks', 'Tasks')} ({taskList.length})
          </h2>
          <div className="space-y-1">
            {taskList.map((task) => (
              <ChecklistItem
                key={task.id}
                task={task}
                onComplete={(nextUserId) =>
                  completeTask.mutate({ taskId: task.id, req: nextUserId != null ? { nextUserId } : undefined })
                }
                onClick={() => setDetailTask(task)}
                onEdit={() => setEditingTask(task)}
                onDelete={() => setDeletingTask(task)}
                onAssign={() => setAssigningTask(task)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Dialogs */}
      <TaskFormDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={(data) => {
          createTask.mutate({
            title: data.title,
            effort: data.effort,
            points: data.points,
            frequencyValue: data.frequencyValue,
            frequencyUnit: data.frequencyUnit,
            firstDueDate: data.firstDueDate!,
            rotationOrder: data.rotationOrder,
          });
        }}
      />

      <TaskFormDialog
        isOpen={!!editingTask}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={(data) => {
          if (editingTask) {
            updateTask.mutate({
              taskId: editingTask.id,
              req: {
                title: data.title,
                effort: data.effort,
                points: data.points,
                frequencyValue: data.frequencyValue,
                frequencyUnit: data.frequencyUnit,
                dueDate: data.dueDate,
                rotationOrder: data.rotationOrder,
              },
            });
          }
        }}
      />

      <DeleteConfirmDialog
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={() => {
          if (deletingTask) {
            deleteTask.mutate(deletingTask.id);
          }
        }}
      />

      <AssignDialog
        isOpen={!!assigningTask}
        task={assigningTask}
        onClose={() => setAssigningTask(null)}
        onAssign={(userId) => {
          if (assigningTask) {
            assignTask.mutate({ taskId: assigningTask.id, req: { assignedUserId: userId } });
          }
        }}
      />

      {/* Detail side panel */}
      {detailTask && (
        <TaskDetail task={detailTask} onClose={() => setDetailTask(null)} />
      )}
    </div>
  );
}
