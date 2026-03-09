// Types matching the API contract DTOs

export interface TaskDto {
  id: string;
  title: string;
  points: number;
  status: TaskStatus;
  assignedUserId: number | null;
  assignedUserName: string | null;
  sortOrder: number;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
}

export type TaskStatus = 'todo' | 'in_progress' | 'awaiting_review' | 'done';

export interface TaskDetailDto extends TaskDto {
  comments: CommentDto[];
}

export interface CommentDto {
  id: string;
  userId: number;
  userName: string;
  text: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  points: number;
}

export interface UpdateTaskRequest {
  title: string;
  points: number;
}

export interface MoveTaskRequest {
  targetStatus: TaskStatus;
  targetSortOrder: number;
}

export interface MoveTaskResponse {
  task: TaskDto;
  pointsDelta: number;
  warningNoAssignee: boolean;
}

export interface AssignTaskRequest {
  assignedUserId: number | null;
}

export interface LeaderboardEntry {
  userId: number;
  userName: string;
  role: string;
  totalPoints: number;
}

export interface CreateCommentRequest {
  text: string;
}

export interface UpdateCommentRequest {
  text: string;
}

export const TASK_STATUSES: TaskStatus[] = [
  'todo',
  'in_progress',
  'awaiting_review',
  'done',
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'cleaning.columns.todo',
  in_progress: 'cleaning.columns.inProgress',
  awaiting_review: 'cleaning.columns.awaitingReview',
  done: 'cleaning.columns.done',
};
