import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useCurrentUserStore } from '@/shared/hooks/useCurrentUser';

export interface CommentDto {
  id: string;
  userId: number;
  userName: string;
  text: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommentThreadProps {
  comments: CommentDto[];
  onAdd: (text: string) => Promise<void>;
  onUpdate: (commentId: string, text: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

export function CommentThread({ comments, onAdd, onUpdate, onDelete }: CommentThreadProps) {
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState('');

  const handleAdd = async () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setMutationError('');
    try {
      await onAdd(trimmed);
      setNewText('');
    } catch {
      setMutationError(t('comments.postError', 'Failed to post comment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (commentId: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setMutationError('');
    try {
      await onUpdate(commentId, trimmed);
      setEditingId(null);
      setEditText('');
    } catch {
      setMutationError(t('comments.updateError', 'Failed to update comment'));
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (comment: CommentDto) => {
    setEditingId(comment.id);
    setEditText(comment.text);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <MessageCircle className="w-4 h-4" /> {t('comments.title', 'Comments')} ({comments.length})
      </h3>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t('comments.empty', 'No comments yet — start the conversation!')}
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isOwn = comment.userId === currentUser?.id;
            const isEditing = editingId === comment.id;
            const date = new Date(comment.createdAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={comment.id}
                className="bg-muted rounded-lg px-4 py-3 border border-border"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {comment.userName}
                    </span>
                    <span className="text-xs text-muted-foreground">{date}</span>
                    {comment.isEdited && (
                      <span className="text-xs text-muted-foreground italic">
                        {t('comments.edited', '(edited)')}
                      </span>
                    )}
                  </div>
                  {isOwn && !isEditing && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => startEditing(comment)}
                        title={t('comments.edit', 'Edit')}
                        aria-label={t('comments.edit', 'Edit')}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => onDelete(comment.id)}
                        title={t('comments.delete', 'Delete')}
                        aria-label={t('comments.delete', 'Delete')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 text-sm border border-input bg-background rounded-md px-3 py-1.5 focus:ring-2 focus:ring-ring focus:border-ring outline-none text-foreground"
                      maxLength={2000}
                      aria-label={t('comments.editInput', 'Edit comment')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(comment.id);
                        if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditText('');
                        }
                      }}
                    />
                    <button
                      onClick={() => handleUpdate(comment.id)}
                      disabled={submitting || !editText.trim()}
                      className="text-sm bg-primary text-primary-foreground px-3 py-1 rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                      {t('common.save', 'Save')}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditText('');
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground px-2"
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{comment.text}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mutation error */}
      {mutationError && (
        <p className="text-sm text-destructive" role="alert">{mutationError}</p>
      )}

      {/* Add comment input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={t('comments.add', 'Add a comment...')}
          className="flex-1 text-sm border border-input bg-background rounded-lg px-4 py-2 focus:ring-2 focus:ring-ring focus:border-ring outline-none text-foreground placeholder:text-muted-foreground"
          maxLength={2000}
          aria-label={t('comments.add', 'Add a comment...')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button
          onClick={handleAdd}
          disabled={submitting || !newText.trim()}
          className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
        >
          {t('comments.addButton', 'Post')}
        </button>
      </div>
    </div>
  );
}
