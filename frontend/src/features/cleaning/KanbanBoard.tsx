import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DragDropProvider } from '@dnd-kit/react';
import { useDroppable } from '@dnd-kit/react';
import { Button } from '@/shared/components';
import { EmptyState } from '@/shared/components';
import { TaskCard } from './TaskCard';
import { TaskFormDialog, DeleteConfirmDialog, AssignDialog } from './TaskDialogs';
import { TaskDetail } from './TaskDetail';
import {
  useTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useMoveTaskMutation,
  useAssignTaskMutation,
} from './api';
import { useCleaningHub } from './useCleaningHub';
import { TASK_STATUSES, STATUS_LABELS } from './types';
import type { TaskDto, TaskStatus } from './types';

const COLUMN_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-50 border-gray-200',
  in_progress: 'bg-blue-50 border-blue-200',
  awaiting_review: 'bg-amber-50 border-amber-200',
  done: 'bg-emerald-50 border-emerald-200',
};

const COLUMN_HEADER_COLORS: Record<TaskStatus, string> = {
  todo: 'text-gray-600',
  in_progress: 'text-blue-600',
  awaiting_review: 'text-amber-600',
  done: 'text-emerald-600',
};

// ── Droppable Column ──────────────────────

interface ColumnProps {
  status: TaskStatus;
  tasks: TaskDto[];
  onEdit: (task: TaskDto) => void;
  onDelete: (taskId: string) => void;
  onAssign: (task: TaskDto) => void;
  onViewDetail: (task: TaskDto) => void;
}

function Column({ status, tasks, onEdit, onDelete, onAssign, onViewDetail }: ColumnProps) {
  const { t } = useTranslation();
  const { ref, isDropTarget } = useDroppable({ id: status });

  return (
    <div
      ref={ref}
      className={`flex flex-col rounded-xl border-2 min-h-[400px] transition-all ${COLUMN_COLORS[status]} ${
        isDropTarget ? 'ring-2 ring-primary-400 border-primary-400 scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
        <h3 className={`text-sm font-semibold uppercase tracking-wide ${COLUMN_HEADER_COLORS[status]}`}>
          {t(STATUS_LABELS[status])}
        </h3>
        <span className="text-xs bg-white/80 text-gray-500 font-medium px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8 italic">
            {t('cleaning.column.empty', 'No tasks')}
          </p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssign={onAssign}
              onViewDetail={onViewDetail}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Kanban Board ──────────────────────

export function KanbanBoard() {
  const { t } = useTranslation();
  const { data: tasks = [], isLoading, isError } = useTasksQuery();
  const { isConnected } = useCleaningHub();

  const createTask = useCreateTaskMutation();
  const updateTask = useUpdateTaskMutation();
  const deleteTask = useDeleteTaskMutation();
  const moveTask = useMoveTaskMutation();
  const assignTask = useAssignTaskMutation();

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskDto | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [assignTask_, setAssignTask] = useState<TaskDto | null>(null);
  const [detailTask, setDetailTask] = useState<TaskDto | null>(null);

  // Group tasks by status
  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, TaskDto[]> = {
      todo: [],
      in_progress: [],
      awaiting_review: [],
      done: [],
    };
    for (const task of tasks) {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    }
    // Sort by sortOrder within each column
    for (const status of TASK_STATUSES) {
      grouped[status].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return grouped;
  }, [tasks]);

  // Drag and drop handler
  const handleDragEnd = useCallback(
    (event: { operation: { source: { id: unknown } | null; target: { id: unknown } | null } }) => {
      const { source, target } = event.operation;
      if (!source || !target) return;

      const taskId = String(source.id);
      const targetStatus = String(target.id) as TaskStatus;

      // Validate the target is a known status column
      if (!TASK_STATUSES.includes(targetStatus)) return;

      // Find the source task
      const sourceTask = tasks.find((t) => t.id === taskId);
      if (!sourceTask || sourceTask.status === targetStatus) return;

      // Calculate target sort order (append to end of column)
      const targetTasks = columns[targetStatus];
      const targetSortOrder = targetTasks.length > 0
        ? Math.max(...targetTasks.map((t) => t.sortOrder)) + 1
        : 0;

      moveTask.mutate({
        taskId,
        req: { targetStatus, targetSortOrder },
      });
    },
    [tasks, columns, moveTask],
  );

  // Handlers
  const handleCreate = useCallback(
    (title: string, points: number) => {
      createTask.mutate({ title, points });
    },
    [createTask],
  );

  const handleUpdate = useCallback(
    (title: string, points: number) => {
      if (!editTask) return;
      updateTask.mutate({ taskId: editTask.id, req: { title, points } });
    },
    [editTask, updateTask],
  );

  const handleDelete = useCallback(() => {
    if (!deleteTaskId) return;
    deleteTask.mutate(deleteTaskId);
  }, [deleteTaskId, deleteTask]);

  const handleAssign = useCallback(
    (userId: number | null) => {
      if (!assignTask_) return;
      assignTask.mutate({
        taskId: assignTask_.id,
        req: { assignedUserId: userId },
      });
    },
    [assignTask_, assignTask],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" role="status" aria-label={t('common.loading', 'Loading')} />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title={t('common.error', 'Error')}
        description={t('cleaning.loadError', 'Failed to load tasks. Please try again later.')}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">
            🧹 {t('cleaning.title', 'Cleaning Board')}
          </h1>
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-gray-300'}`}
            title={isConnected ? t('cleaning.signalr.connected') : t('cleaning.signalr.connecting')}
            role="status"
            aria-live="polite"
            aria-label={isConnected ? t('cleaning.signalr.connected') : t('cleaning.signalr.connecting')}
          />
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + {t('cleaning.task.create', 'Create Task')}
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-4 gap-4 min-w-[900px]">
            {TASK_STATUSES.map((status) => (
              <Column
                key={status}
                status={status}
                tasks={columns[status]}
                onEdit={setEditTask}
                onDelete={setDeleteTaskId}
                onAssign={setAssignTask}
                onViewDetail={setDetailTask}
              />
            ))}
          </div>
        </DragDropProvider>
      </div>

      {/* Dialogs */}
      <TaskFormDialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
      <TaskFormDialog
        isOpen={!!editTask}
        task={editTask}
        onClose={() => setEditTask(null)}
        onSubmit={handleUpdate}
      />
      <DeleteConfirmDialog
        isOpen={!!deleteTaskId}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={handleDelete}
      />
      <AssignDialog
        isOpen={!!assignTask_}
        task={assignTask_}
        onClose={() => setAssignTask(null)}
        onAssign={handleAssign}
      />
      {detailTask && (
        <TaskDetail
          task={detailTask}
          onClose={() => setDetailTask(null)}
        />
      )}
    </div>
  );
}
