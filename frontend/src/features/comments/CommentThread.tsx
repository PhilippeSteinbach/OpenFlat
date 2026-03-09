import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
        💬 {t('comments.title', 'Comments')} ({comments.length})
      </h3>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
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
                className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {comment.userName}
                    </span>
                    <span className="text-xs text-gray-400">{date}</span>
                    {comment.isEdited && (
                      <span className="text-xs text-gray-400 italic">
                        {t('comments.edited', '(edited)')}
                      </span>
                    )}
                  </div>
                  {isOwn && !isEditing && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditing(comment)}
                        className="text-xs text-blue-600 hover:text-blue-800 px-1"
                        title={t('comments.edit', 'Edit')}
                        aria-label={t('comments.edit', 'Edit')}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDelete(comment.id)}
                        className="text-xs text-red-500 hover:text-red-700 px-1"
                        title={t('comments.delete', 'Delete')}
                        aria-label={t('comments.delete', 'Delete')}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {t('common.save', 'Save')}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditText('');
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 px-2"
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mutation error */}
      {mutationError && (
        <p className="text-sm text-red-600" role="alert">{mutationError}</p>
      )}

      {/* Add comment input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={t('comments.add', 'Add a comment...')}
          className="flex-1 text-sm border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          maxLength={2000}
          aria-label={t('comments.add', 'Add a comment...')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button
          onClick={handleAdd}
          disabled={submitting || !newText.trim()}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {t('comments.addButton', 'Post')}
        </button>
      </div>
    </div>
  );
}
