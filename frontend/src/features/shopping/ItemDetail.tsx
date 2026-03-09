import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Badge } from '@/shared/ui';
import { CommentThread } from '@/features/comments/CommentThread';
import {
  useItemDetailQuery,
  useAddItemCommentMutation,
  useUpdateItemCommentMutation,
  useDeleteItemCommentMutation,
} from './api';
import type { ItemDto } from './types';

interface ItemDetailProps {
  item: ItemDto;
  onClose: () => void;
}

export function ItemDetail({ item, onClose }: ItemDetailProps) {
  const { t } = useTranslation();
  const { data: detail, isLoading } = useItemDetailQuery(item.id);
  const addComment = useAddItemCommentMutation();
  const updateComment = useUpdateItemCommentMutation();
  const deleteComment = useDeleteItemCommentMutation();

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label={item.name}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="relative bg-card w-full max-w-lg shadow-elevation-4 flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground truncate">{item.name}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t('common.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item info */}
        <div className="px-6 py-4 border-b border-border space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="bg-muted text-muted-foreground font-medium px-2 py-0.5 rounded">
              ×{item.quantity}
            </span>
            <span className="text-muted-foreground">
              {t('shopping.item.addedBy', { name: item.addedByUserName })}
            </span>
            {item.isBought && item.boughtByUserName && (
              <Badge variant="success">
                ✓ {item.boughtByUserName}
              </Badge>
            )}
          </div>
        </div>

        {/* Comments section */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('comments.loading')}</p>
          ) : (
            <CommentThread
              comments={detail?.comments ?? []}
              onAdd={async (text) => {
                await addComment.mutateAsync({ itemId: item.id, req: { text } });
              }}
              onUpdate={async (commentId, text) => {
                await updateComment.mutateAsync({ itemId: item.id, commentId, text });
              }}
              onDelete={async (commentId) => {
                await deleteComment.mutateAsync({ itemId: item.id, commentId });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
