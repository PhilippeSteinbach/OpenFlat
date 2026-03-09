import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cleaningApi } from '@/shared/api/client';
import type {
  TaskDto,
  TaskDetailDto,
  CommentDto,
  CreateTaskRequest,
  UpdateTaskRequest,
  CompleteTaskRequest,
  CompleteTaskResponse,
  AssignTaskRequest,
  CreateCommentRequest,
  LeaderboardEntry,
} from './types';

const userId = () => {
  // Current user from persisted store
  const stored = localStorage.getItem('openflat-current-user');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed?.state?.currentUser?.id ?? 1;
    } catch {
      return 1;
    }
  }
  return 1;
};

const headers = () => ({ 'X-User-Id': String(userId()) });

export function useTasksQuery() {
  return useQuery<TaskDto[]>({
    queryKey: ['cleaning', 'tasks'],
    queryFn: () =>
      cleaningApi.get<TaskDto[]>('/tasks', headers()),
  });
}

export function useTaskDetailQuery(taskId: string | undefined) {
  return useQuery<TaskDetailDto>({
    queryKey: ['cleaning', 'tasks', taskId],
    queryFn: () =>
      cleaningApi.get<TaskDetailDto>(`/tasks/${taskId}`, headers()),
    enabled: !!taskId,
  });
}

export function useLeaderboardQuery() {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['cleaning', 'leaderboard'],
    queryFn: () =>
      cleaningApi.get<LeaderboardEntry[]>('/leaderboard', headers()),
  });
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation<TaskDto, Error, CreateTaskRequest>({
    mutationFn: (req) =>
      cleaningApi.post<TaskDto>('/tasks', req, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning', 'tasks'] });
    },
  });
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation<TaskDto, Error, { taskId: string; req: UpdateTaskRequest }>({
    mutationFn: ({ taskId, req }) =>
      cleaningApi.put<TaskDto>(`/tasks/${taskId}`, req, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning'] });
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (taskId) =>
      cleaningApi.delete<void>(`/tasks/${taskId}`, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning'] });
    },
  });
}

export function useCompleteTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation<CompleteTaskResponse, Error, { taskId: string; req?: CompleteTaskRequest }>({
    mutationFn: ({ taskId, req }) =>
      cleaningApi.post<CompleteTaskResponse>(`/tasks/${taskId}/complete`, req ?? {}, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning'] });
    },
  });
}

export function useAssignTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation<TaskDto, Error, { taskId: string; req: AssignTaskRequest }>({
    mutationFn: ({ taskId, req }) =>
      cleaningApi.post<TaskDto>(`/tasks/${taskId}/assign`, req, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning'] });
    },
  });
}

// ── Comment mutations ──────────────────────

export function useAddTaskCommentMutation() {
  const queryClient = useQueryClient();
  return useMutation<CommentDto, Error, { taskId: string; req: CreateCommentRequest }>(
    {
      mutationFn: ({ taskId, req }) =>
        cleaningApi.post<CommentDto>(`/tasks/${taskId}/comments`, req, headers()),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['cleaning'] });
      },
    },
  );
}

export function useUpdateTaskCommentMutation() {
  const queryClient = useQueryClient();
  return useMutation<CommentDto, Error, { taskId: string; commentId: string; text: string }>({
    mutationFn: ({ taskId, commentId, text }) =>
      cleaningApi.put<CommentDto>(`/tasks/${taskId}/comments/${commentId}`, { text }, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning'] });
    },
  });
}

export function useDeleteTaskCommentMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { taskId: string; commentId: string }>({
    mutationFn: ({ taskId, commentId }) =>
      cleaningApi.delete<void>(`/tasks/${taskId}/comments/${commentId}`, headers()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning'] });
    },
  });
}
