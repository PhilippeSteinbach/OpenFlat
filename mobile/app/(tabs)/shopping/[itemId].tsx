import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '../../../shared/hooks/useCurrentUser';
import { shoppingApi } from '../../../shared/api/client';
import { CommentThread, type CommentDto } from '../../../features/comments/CommentThread';

interface ItemDetailData {
  item: {
    id: string;
    name: string;
    quantity: number;
    addedByUserId: number;
    addedByUserName: string;
    isBought: boolean;
    boughtByUserName: string | null;
    commentCount: number;
  };
  comments: CommentDto[];
}

export default function ItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const [detail, setDetail] = useState<ItemDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const headers = useCallback(
    () => ({ 'X-User-Id': String(currentUser?.id ?? 1) }),
    [currentUser],
  );

  const fetchDetail = useCallback(async () => {
    if (!itemId) return;
    try {
      const data = await shoppingApi.get<ItemDetailData>(`/items/${itemId}`, headers());
      setDetail(data);
    } catch (err) {
      console.error('Failed to fetch item:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [itemId, headers]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('common.error', 'Item not found')}</Text>
      </View>
    );
  }

  const { item } = detail;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetail(); }} />
      }
    >
      {/* Item info header */}
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.itemMeta}>
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>×{item.quantity}</Text>
          </View>
          <Text style={styles.addedByText}>
            {t('shopping.item.addedBy', { name: item.addedByUserName })}
          </Text>
          {item.isBought && item.boughtByUserName && (
            <View style={styles.boughtBadge}>
              <Text style={styles.boughtText}>✓ {item.boughtByUserName}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Comments */}
      <CommentThread
        comments={detail.comments ?? []}
        onAdd={async (text) => {
          await shoppingApi.post(`/items/${itemId}/comments`, { text }, headers());
          fetchDetail();
        }}
        onUpdate={async (commentId, text) => {
          await shoppingApi.put(`/items/${itemId}/comments/${commentId}`, { text }, headers());
          fetchDetail();
        }}
        onDelete={async (commentId) => {
          await shoppingApi.delete(`/items/${itemId}/comments/${commentId}`, headers());
          fetchDetail();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#9CA3AF' },
  itemHeader: { marginBottom: 16 },
  itemName: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quantityBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  quantityText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  addedByText: { fontSize: 14, color: '#6B7280' },
  boughtBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  boughtText: { fontSize: 12, color: '#065F46' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
});
