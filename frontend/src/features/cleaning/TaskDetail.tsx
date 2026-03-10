import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { CommentThread } from "@/features/comments/CommentThread";
import { Badge } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import {
  useTaskDetailQuery,
  useAddTaskCommentMutation,
  useUpdateTaskCommentMutation,
  useDeleteTaskCommentMutation,
} from "./api";
import { FrequencyUnit } from "./types";
import type { TaskDto } from "./types";

const PREDEFINED_USERS: Record<number, string> = {
  1: "Alex",
  2: "Jordan",
  3: "Sam",
  4: "Taylor",
  5: "Casey",
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

  const frequencyLabel =
    task.frequencyUnit === FrequencyUnit.Weeks
      ? t("cleaning.frequency.weeks", "Weeks")
      : t("cleaning.frequency.days", "Days");

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-label={task.title}
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-card w-full max-w-lg shadow-elevation-4 flex flex-col animate-slide-in-from-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground truncate">
            {task.title}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-sm"
            aria-label={t("common.close", "Close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <Badge variant="warning">
              {task.points} {t("common.points", "pts")}
            </Badge>
            <Badge variant="muted">
              {t(`cleaning.effort.${task.effort}`, task.effort)}
            </Badge>
            <Badge variant="muted">
              {t("cleaning.frequency.every", "Every")} {task.frequencyValue}{" "}
              {frequencyLabel}
            </Badge>
            {task.assignedUserName && (
              <span className="text-muted-foreground">
                → {task.assignedUserName}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {t("cleaning.task.dueDate", "Due")}: {task.dueDate}
          </p>

          {task.lastCompletedAt && (
            <p className="text-xs text-muted-foreground">
              {t("cleaning.task.lastCompleted", "Last completed")}:{" "}
              {new Date(task.lastCompletedAt).toLocaleString()}
              {task.lastCompletedByUserName && (
                <span className="ml-1">
                  ({t("cleaning.task.by", "by")} {task.lastCompletedByUserName})
                </span>
              )}
            </p>
          )}

          {task.rotationOrder.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {t("cleaning.rotation.schedule", "Rotation")}
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                {task.rotationOrder.map((userId, idx) => {
                  const name = PREDEFINED_USERS[userId] ?? `User ${userId}`;
                  const isCurrent = idx === task.rotationIndex;
                  return (
                    <span
                      key={userId}
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        isCurrent
                          ? "bg-primary/15 text-primary font-semibold ring-1 ring-primary/30"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {name}
                      {idx < task.rotationOrder.length - 1 && (
                        <span className="ml-1 text-muted-foreground/50">→</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("comments.loading")}
            </p>
          ) : (
            <CommentThread
              comments={detail?.comments ?? []}
              onAdd={async (text) => {
                await addComment.mutateAsync({
                  taskId: task.id,
                  req: { text },
                });
              }}
              onUpdate={async (commentId, text) => {
                await updateComment.mutateAsync({
                  taskId: task.id,
                  commentId,
                  text,
                });
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
