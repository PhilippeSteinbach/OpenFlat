import { useTranslation } from 'react-i18next';
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
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="relative bg-white w-full max-w-lg shadow-xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{item.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
            aria-label={t('common.close', 'Close')}
          >
            ✕
          </button>
        </div>

        {/* Item info */}
        <div className="px-6 py-4 border-b border-gray-100 space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded">
              ×{item.quantity}
            </span>
            <span className="text-gray-500">
              {t('shopping.item.addedBy', { name: item.addedByUserName })}
            </span>
            {item.isBought && item.boughtByUserName && (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                ✓ {item.boughtByUserName}
              </span>
            )}
          </div>
        </div>

        {/* Comments section */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-8">{t('comments.loading')}</p>
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
