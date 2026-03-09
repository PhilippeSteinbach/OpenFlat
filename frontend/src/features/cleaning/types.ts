// Types matching the API contract DTOs (v2 — checklist model)

export interface TaskDto {
  id: string;
  title: string;
  points: number;
  isDone: boolean;
  dueDate: string | null;
  completedAt: string | null;
  assignedUserId: number | null;
  assignedUserName: string | null;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
}

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
  dueDate?: string | null;
  assignedUserId?: number | null;
}

export interface UpdateTaskRequest {
  title: string;
  points: number;
  dueDate?: string | null;
}

export interface CompleteTaskResponse {
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
