import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '../../../shared/hooks/useCurrentUser';
import { shoppingApi } from '../../../shared/api/client';
import { CommentThread, type CommentDto } from '../../../features/comments/CommentThread';
import { useTheme } from '../../../shared/theme';

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
  const { colors } = useTheme();
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ fontSize: 16, color: colors.mutedForeground }}>{t('common.error', 'Item not found')}</Text>
      </View>
    );
  }

  const { item } = detail;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.card }}
      contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetail(); }} tintColor={colors.primary} />
      }
    >
      {/* Item info header */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ backgroundColor: colors.muted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>×{item.quantity}</Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.mutedForeground }}>
            {t('shopping.item.addedBy', { name: item.addedByUserName })}
          </Text>
          {item.isBought && item.boughtByUserName && (
            <View style={{ backgroundColor: `${colors.success}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 12, color: colors.success }}>✓ {item.boughtByUserName}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />

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
