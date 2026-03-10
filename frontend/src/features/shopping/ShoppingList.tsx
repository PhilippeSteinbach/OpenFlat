import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, EmptyState } from "@/shared/ui";
import {
  ShoppingCart,
  Pencil,
  Trash2,
  MessageCircle,
  Check,
  Undo2,
} from "lucide-react";
import {
  useShoppingListQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useBuyItemMutation,
  useUndoBuyMutation,
} from "./api";
import { useShoppingHub } from "./useShoppingHub";
import { ItemFormDialog, DeleteConfirmDialog } from "./ShoppingDialogs";
import { ItemDetail } from "./ItemDetail";
import type { ItemDto } from "./types";

export function ShoppingList() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useShoppingListQuery();
  const createMutation = useCreateItemMutation();
  const updateMutation = useUpdateItemMutation();
  const deleteMutation = useDeleteItemMutation();
  const buyMutation = useBuyItemMutation();
  const undoMutation = useUndoBuyMutation();

  // Real-time updates
  useShoppingHub();

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editItem, setEditItem] = useState<ItemDto | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<ItemDto | null>(null);

  const handleCreate = useCallback(
    (name: string, quantity: number) => {
      createMutation.mutate(
        { name, quantity },
        { onSuccess: () => setShowAddDialog(false) },
      );
    },
    [createMutation],
  );

  const handleUpdate = useCallback(
    (name: string, quantity: number) => {
      if (!editItem) return;
      updateMutation.mutate(
        { itemId: editItem.id, req: { name, quantity } },
        { onSuccess: () => setEditItem(null) },
      );
    },
    [editItem, updateMutation],
  );

  const handleDelete = useCallback(() => {
    if (!deleteItemId) return;
    deleteMutation.mutate(deleteItemId, {
      onSuccess: () => setDeleteItemId(null),
    });
  }, [deleteItemId, deleteMutation]);

  const handleBuy = useCallback(
    (itemId: string) => buyMutation.mutate(itemId),
    [buyMutation],
  );

  const handleUndo = useCallback(
    (itemId: string) => undoMutation.mutate(itemId),
    [undoMutation],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-center text-destructive">
          {t("common.error", "Failed to load shopping list")}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-primary hover:text-primary/80 underline"
        >
          {t("common.retry", "Retry")}
        </button>
      </div>
    );
  }

  const active = data?.active ?? [];
  const recentlyBought = data?.recentlyBought ?? [];

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {t("shopping.title")}
        </h1>
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          + {t("shopping.item.add")}
        </Button>
      </div>

      {/* Active Items */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">
          {t("shopping.sections.active")}
          {active.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({active.length})
            </span>
          )}
        </h2>

        {active.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={t("shopping.empty.active")}
            action={{
              label: t("shopping.item.add"),
              onClick: () => setShowAddDialog(true),
            }}
          />
        ) : (
          <div className="space-y-2">
            {active.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onBuy={handleBuy}
                onEdit={setEditItem}
                onDelete={(id) => setDeleteItemId(id)}
                onViewDetail={setDetailItem}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recently Bought */}
      {recentlyBought.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-muted-foreground mb-3">
            {t("shopping.sections.recentlyBought")}
            <span className="ml-2 text-sm font-normal text-muted-foreground/70">
              ({recentlyBought.length})
            </span>
          </h2>
          <div className="space-y-2 opacity-70">
            {recentlyBought.map((item) => (
              <BoughtItemCard
                key={item.id}
                item={item}
                onUndo={handleUndo}
                onViewDetail={setDetailItem}
              />
            ))}
          </div>
        </section>
      )}

      {/* Dialogs */}
      <ItemFormDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSubmit={handleCreate}
        title={t("shopping.item.add")}
        isPending={createMutation.isPending}
      />

      {editItem && (
        <ItemFormDialog
          isOpen
          onClose={() => setEditItem(null)}
          onSubmit={handleUpdate}
          title={t("shopping.item.edit")}
          initialName={editItem.name}
          initialQuantity={editItem.quantity}
          isPending={updateMutation.isPending}
        />
      )}

      <DeleteConfirmDialog
        isOpen={!!deleteItemId}
        onClose={() => setDeleteItemId(null)}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />

      {detailItem && (
        <ItemDetail item={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </div>
  );
}

// ── Item Card (active) ──────────────────────

interface ItemCardProps {
  item: ItemDto;
  onBuy: (id: string) => void;
  onEdit: (item: ItemDto) => void;
  onDelete: (id: string) => void;
  onViewDetail: (item: ItemDto) => void;
}

function ItemCard({
  item,
  onBuy,
  onEdit,
  onDelete,
  onViewDetail,
}: ItemCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="flex items-center gap-3">
      {/* Buy button */}
      <button
        onClick={() => onBuy(item.id)}
        className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-border hover:border-primary hover:bg-primary/10 transition-colors"
        aria-label={t("shopping.item.markBought")}
        title={t("shopping.item.markBought")}
      />

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">
            {item.name}
          </span>
          {item.quantity > 1 && (
            <span className="flex-shrink-0 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              ×{item.quantity}
            </span>
          )}
          {item.commentCount > 0 && (
            <button
              onClick={() => onViewDetail(item)}
              className="flex-shrink-0 flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary"
              title={t("comments.title")}
              aria-label={t("comments.countTooltip", {
                count: item.commentCount,
              })}
            >
              <MessageCircle className="w-3.5 h-3.5" /> {item.commentCount}
            </button>
          )}
          {item.commentCount === 0 && (
            <button
              onClick={() => onViewDetail(item)}
              className="flex-shrink-0 text-xs text-muted-foreground/50 hover:text-primary"
              title={t("comments.addTooltip")}
              aria-label={t("comments.addTooltip")}
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("shopping.item.addedBy", { name: item.addedByUserName })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(item)}
          aria-label={t("common.edit")}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(item.id)}
          aria-label={t("common.delete")}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

// ── Bought Item Card ──────────────────────

interface BoughtItemCardProps {
  item: ItemDto;
  onUndo: (id: string) => void;
  onViewDetail: (item: ItemDto) => void;
}

function BoughtItemCard({ item, onUndo, onViewDetail }: BoughtItemCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="flex items-center gap-3">
      {/* Checked circle */}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
        <Check className="w-4 h-4 text-white" />
      </div>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-muted-foreground line-through truncate block">
          {item.name}
          {item.quantity > 1 && <span className="ml-1">×{item.quantity}</span>}
        </span>
        <p className="text-xs text-muted-foreground">
          {t("shopping.item.boughtBy", { name: item.boughtByUserName })}
        </p>
      </div>

      {/* Undo button */}
      <button
        onClick={() => onViewDetail(item)}
        className="text-xs text-muted-foreground hover:text-primary px-1"
        title={t("comments.title")}
        aria-label={t("comments.title")}
      >
        <MessageCircle className="w-3.5 h-3.5" />
      </button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onUndo(item.id)}
        title={t("shopping.item.undoBuy")}
        aria-label={t("shopping.item.undoBuy")}
      >
        <Undo2 className="w-4 h-4" />
      </Button>
    </Card>
  );
}
