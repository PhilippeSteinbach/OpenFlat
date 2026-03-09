// Types matching the API contract DTOs (v3 — recurring tasks with rotation)

// ── Enums ──────────────────────

export const CleaningEffort = {
  None: 'None',
  Normal: 'Normal',
  Big: 'Big',
  Huge: 'Huge',
  Custom: 'Custom',
} as const;

export type CleaningEffort = (typeof CleaningEffort)[keyof typeof CleaningEffort];

/** Preset points for each effort level (Custom → user-defined) */
export const EFFORT_POINTS: Record<CleaningEffort, number | null> = {
  None: 0,
  Normal: 1,
  Big: 2,
  Huge: 4,
  Custom: null,
};

export const FrequencyUnit = {
  Days: 'Days',
  Weeks: 'Weeks',
} as const;

export type FrequencyUnit = (typeof FrequencyUnit)[keyof typeof FrequencyUnit];

// ── DTOs ──────────────────────

export interface TaskDto {
  id: string;
  title: string;
  effort: CleaningEffort;
  points: number;
  frequencyValue: number;
  frequencyUnit: FrequencyUnit;
  dueDate: string; // YYYY-MM-DD, always present
  rotationOrder: number[];
  rotationIndex: number;
  assignedUserId: number | null;
  assignedUserName: string | null;
  lastCompletedAt: string | null;
  lastCompletedByUserName: string | null;
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

// ── Requests ──────────────────────

export interface CreateTaskRequest {
  title: string;
  effort: CleaningEffort;
  points?: number; // required when effort is Custom
  frequencyValue: number;
  frequencyUnit: FrequencyUnit;
  firstDueDate: string; // YYYY-MM-DD
  rotationOrder?: number[];
}

export interface UpdateTaskRequest {
  title: string;
  effort: CleaningEffort;
  points?: number;
  frequencyValue: number;
  frequencyUnit: FrequencyUnit;
  dueDate?: string;
  rotationOrder?: number[];
}

export interface CompleteTaskRequest {
  nextUserId?: number | null;
}

export interface CompleteTaskResponse {
  task: TaskDto;
  pointsEarned: number;
  completedByUserName: string;
  nextAssignedUserName: string | null;
}

export interface AssignTaskRequest {
  assignedUserId: number | null;
}

// ── Leaderboard ──────────────────────

export interface LeaderboardEntry {
  userId: number;
  userName: string;
  role: string;
  totalPoints: number;
}

// ── Comments ──────────────────────

export interface CreateCommentRequest {
  text: string;
}

export interface UpdateCommentRequest {
  text: string;
}
