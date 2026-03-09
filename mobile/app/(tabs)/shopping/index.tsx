import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '../../../shared/hooks/useCurrentUser';
import { shoppingApi } from '../../../shared/api/client';
import { useTheme, type ThemeColors } from '../../../shared/theme';

// ── Types ──────────────────────

interface ItemDto {
  id: string;
  name: string;
  quantity: number;
  addedByUserId: number;
  addedByUserName: string;
  isBought: boolean;
  boughtAt: string | null;
  boughtByUserId: number | null;
  boughtByUserName: string | null;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
}

interface ShoppingListResponse {
  active: ItemDto[];
  recentlyBought: ItemDto[];
}

// ── Shopping Screen ──────────────────────

export default function ShoppingListScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const [data, setData] = useState<ShoppingListResponse>({ active: [], recentlyBought: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ItemDto | null>(null);

  const headers = useCallback(
    () => ({ 'X-User-Id': String(currentUser?.id ?? 1) }),
    [currentUser],
  );

  const fetchItems = useCallback(async () => {
    try {
      const result = await shoppingApi.get<ShoppingListResponse>('/items', headers());
      setData(result);
      setError(false);
    } catch (err) {
      console.error('Failed to fetch shopping items:', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleBuy = useCallback(
    async (itemId: string) => {
      try {
        await shoppingApi.post(`/items/${itemId}/buy`, {}, headers());
        fetchItems();
      } catch {
        Alert.alert(t('common.error', 'Error'), t('shopping.buyError', 'Failed to mark item as bought'));
      }
    },
    [headers, fetchItems, t],
  );

  const handleUndo = useCallback(
    async (itemId: string) => {
      try {
        await shoppingApi.post(`/items/${itemId}/undo`, {}, headers());
        fetchItems();
      } catch {
        Alert.alert(t('common.error', 'Error'), t('shopping.undoError', 'Failed to undo'));
      }
    },
    [headers, fetchItems, t],
  );

  const handleDelete = useCallback(
    async (itemId: string) => {
      Alert.alert(
        t('common.confirmDelete', 'Delete Item?'),
        t('common.deleteConfirmMessage', 'This action cannot be undone.'),
        [
          { text: t('common.cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('common.delete', 'Delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await shoppingApi.delete(`/items/${itemId}`, headers());
                fetchItems();
              } catch {
                Alert.alert(t('common.error', 'Error'), t('shopping.deleteError', 'Failed to delete item'));
              }
            },
          },
        ],
      );
    },
    [headers, fetchItems, t],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.destructive, fontSize: 16, marginBottom: 12 }}>{t('common.error', 'Something went wrong')}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); fetchItems(); }} accessibilityRole="button" accessibilityLabel={t('common.retry', 'Retry')}>
          <Text style={{ color: colors.primary, fontSize: 14 }}>{t('common.retry', 'Retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sections = [
    ...(data.active.length > 0
      ? [{ title: t('shopping.sections.active', 'Active Items'), data: data.active, type: 'active' as const }]
      : []),
    ...(data.recentlyBought.length > 0
      ? [{ title: t('shopping.sections.recentlyBought', 'Recently Bought'), data: data.recentlyBought, type: 'bought' as const }]
      : []),
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛒 {t('shopping.title', 'Shopping List')}</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setCreateModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('shopping.item.add', 'Add')}
        >
          <Text style={styles.createButtonText}>+ {t('shopping.item.add', 'Add')}</Text>
        </TouchableOpacity>
      </View>

      {data.active.length === 0 && data.recentlyBought.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyText}>{t('shopping.empty.active', 'No items — add something!')}</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => setCreateModalOpen(true)} accessibilityRole="button" accessibilityLabel={t('shopping.item.add', 'Add Item')}>
            <Text style={styles.emptyButtonText}>{t('shopping.item.add', 'Add Item')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchItems(); }}
            />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>({section.data.length})</Text>
            </View>
          )}
          renderItem={({ item, section }) => {
            if (section.type === 'bought') {
              return (
                <View style={[styles.card, styles.cardBought]}>
                  <View style={styles.cardRow}>
                    <View style={styles.checkCircleDone}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardNameBought}>
                        {item.name}
                        {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {t('shopping.item.boughtBy', { name: item.boughtByUserName })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.undoButton}
                      onPress={() => handleUndo(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t('shopping.item.undoBuy', 'Undo')}
                    >
                      <Text style={styles.undoButtonText}>↩️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            return (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <TouchableOpacity
                    style={styles.checkCircle}
                    onPress={() => handleBuy(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('shopping.item.markBought', 'Mark as bought')}
                  >
                    <View style={styles.checkCircleInner} />
                  </TouchableOpacity>
                  <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.cardName}>{item.name}</Text>
                      {item.quantity > 1 && (
                        <View style={styles.quantityBadge}>
                          <Text style={styles.quantityText}>×{item.quantity}</Text>
                        </View>
                      )}
                      {item.commentCount > 0 && (
                        <Text style={styles.commentCount}>💬 {item.commentCount}</Text>
                      )}
                    </View>
                    <Text style={styles.cardMeta}>
                      {t('shopping.item.addedBy', { name: item.addedByUserName })}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => setEditItem(item)} accessibilityRole="button" accessibilityLabel={t('common.edit', 'Edit')}>
                      <Text style={styles.actionIcon}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} accessibilityRole="button" accessibilityLabel={t('common.delete', 'Delete')}>
                      <Text style={styles.actionIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Create Item Modal */}
      <ItemFormModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={async (name, quantity) => {
          try {
            await shoppingApi.post('/items', { name, quantity }, headers());
            setCreateModalOpen(false);
            fetchItems();
          } catch {
            Alert.alert(t('common.error', 'Error'), t('shopping.createError', 'Failed to add item'));
          }
        }}
        title={t('shopping.item.add', 'Add Item')}
      />

      {/* Edit Item Modal */}
      {editItem && (
        <ItemFormModal
          visible
          onClose={() => setEditItem(null)}
          onSubmit={async (name, quantity) => {
            try {
              await shoppingApi.put(`/items/${editItem.id}`, { name, quantity }, headers());
              setEditItem(null);
              fetchItems();
            } catch {
              Alert.alert(t('common.error', 'Error'), t('shopping.updateError', 'Failed to update item'));
            }
          }}
          title={t('shopping.item.edit', 'Edit Item')}
          initialName={editItem.name}
          initialQuantity={editItem.quantity}
        />
      )}
    </View>
  );
}

// ── Item Form Modal ──────────────────────

function ItemFormModal({
  visible,
  onClose,
  onSubmit,
  title,
  initialName = '',
  initialQuantity = 1,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, quantity: number) => void;
  title: string;
  initialName?: string;
  initialQuantity?: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [name, setName] = useState(initialName);
  const [quantity, setQuantity] = useState(String(initialQuantity));

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setQuantity(String(initialQuantity));
    }
  }, [visible, initialName, initialQuantity]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    const parsed = parseInt(quantity, 10);
    if (!trimmed) {
      Alert.alert(t('validation.required', 'Name is required'));
      return;
    }
    onSubmit(trimmed, isNaN(parsed) || parsed < 1 ? 1 : parsed);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>

          <Text style={styles.inputLabel}>{t('shopping.item.name', 'Item name')}</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder={t('shopping.item.namePlaceholder', 'e.g. Milk')}
            maxLength={200}
            autoFocus
            accessibilityLabel={t('shopping.item.name', 'Item name')}
          />

          <Text style={styles.inputLabel}>{t('shopping.item.quantity', 'Quantity')}</Text>
          <TextInput
            style={styles.textInput}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            accessibilityLabel={t('shopping.item.quantity', 'Quantity')}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.cancel', 'Cancel')}>
              <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} accessibilityRole="button" accessibilityLabel={t('common.save', 'Save')}>
              <Text style={styles.submitButtonText}>{t('common.save', 'Save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────

function getStyles(colors: ThemeColors) {
  return {
    container: { flex: 1 as const, backgroundColor: colors.background },
    center: { flex: 1 as const, justifyContent: 'center' as const, alignItems: 'center' as const },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 20, fontWeight: '700' as const, color: colors.foreground },
    createButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    createButtonText: { color: colors.primaryForeground, fontSize: 14, fontWeight: '600' as const },
    listContent: { padding: 16, paddingBottom: 100 },
    sectionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      marginBottom: 10,
      marginTop: 4,
    },
    sectionTitle: { fontSize: 16, fontWeight: '600' as const, color: colors.foreground },
    sectionCount: { fontSize: 14, color: colors.mutedForeground },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardBought: { opacity: 0.65 },
    cardRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    checkCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.input,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    checkCircleInner: {},
    checkCircleDone: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.success,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    checkText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' as const },
    cardInfo: { flex: 1 as const },
    nameRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, flexWrap: 'wrap' as const },
    cardName: { fontSize: 15, fontWeight: '600' as const, color: colors.foreground },
    cardNameBought: { fontSize: 15, fontWeight: '500' as const, color: colors.mutedForeground, textDecorationLine: 'line-through' as const },
    quantityBadge: {
      backgroundColor: colors.muted,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    quantityText: { fontSize: 11, color: colors.mutedForeground, fontWeight: '500' as const },
    commentCount: { fontSize: 11, color: colors.mutedForeground },
    cardMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    cardActions: { flexDirection: 'row' as const, gap: 8 },
    actionIcon: { fontSize: 16, padding: 4 },
    undoButton: { padding: 6 },
    undoButtonText: { fontSize: 18 },
    emptyState: { flex: 1 as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 15, color: colors.mutedForeground, marginBottom: 16 },
    emptyButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    emptyButtonText: { color: colors.primaryForeground, fontSize: 14, fontWeight: '600' as const },
    // Modal styles
    modalOverlay: {
      flex: 1 as const,
      justifyContent: 'flex-end' as const,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 40,
    },
    modalTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.foreground, marginBottom: 16 },
    inputLabel: { fontSize: 14, fontWeight: '500' as const, color: colors.foreground, marginBottom: 4, marginTop: 12 },
    textInput: {
      borderWidth: 1,
      borderColor: colors.input,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.background,
    },
    modalActions: { flexDirection: 'row' as const, justifyContent: 'flex-end' as const, gap: 10, marginTop: 20 },
    cancelButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.muted,
    },
    cancelButtonText: { fontSize: 14, fontWeight: '500' as const, color: colors.mutedForeground },
    submitButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    submitButtonText: { fontSize: 14, fontWeight: '600' as const, color: colors.primaryForeground },
  };
}
