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
import { cleaningApi } from '../../../shared/api/client';
import { CommentThread, type CommentDto } from '../../../features/comments/CommentThread';
import { useTheme } from '../../../shared/theme';

interface TaskDetailData {
  id: string;
  title: string;
  effort: string;
  points: number;
  frequencyValue: number;
  frequencyUnit: string;
  dueDate: string;
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
  comments: CommentDto[];
}

const PREDEFINED_USERS = [
  { id: 1, name: 'Alex' },
  { id: 2, name: 'Jordan' },
  { id: 3, name: 'Sam' },
  { id: 4, name: 'Taylor' },
  { id: 5, name: 'Casey' },
];

function formatFrequency(value: number, unit: string, t: (key: string) => string): string {
  return `${t('cleaning.frequency.every')} ${value} ${t(`cleaning.frequency.${unit.toLowerCase()}`)}`;
}

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const [task, setTask] = useState<TaskDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const headers = useCallback(
    () => ({ 'X-User-Id': String(currentUser?.id ?? 1) }),
    [currentUser],
  );

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    try {
      const data = await cleaningApi.get<TaskDetailData>(`/tasks/${taskId}`, headers());
      setTask(data);
    } catch (err) {
      console.error('Failed to fetch task:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [taskId, headers]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ fontSize: 16, color: colors.mutedForeground }}>{t('common.error')}</Text>
      </View>
    );
  }

  const rotationNames = task.rotationOrder
    .map((id) => PREDEFINED_USERS.find((u) => u.id === id)?.name ?? `#${id}`)
    .join(' → ');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.card }}
      contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTask(); }} tintColor={colors.primary} />
      }
    >
      {/* Task info header */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>{task.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ backgroundColor: `${colors.warning}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.warning }}>{task.points} {t('common.points')}</Text>
          </View>
          <View style={{ backgroundColor: `${colors.primary}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.primary }}>{t(`cleaning.effort.${task.effort}`)}</Text>
          </View>
        </View>
      </View>

      {/* Details */}
      <View style={{ marginTop: 8, gap: 10 }}>
        <DetailRow label={t('cleaning.task.frequency')} value={formatFrequency(task.frequencyValue, task.frequencyUnit, t)} />
        <DetailRow label={t('cleaning.task.dueDate')} value={task.dueDate} />
        <DetailRow
          label={t('cleaning.task.assign')}
          value={task.assignedUserName
            ? `${task.assignedUserName}${task.assignedUserId === currentUser?.id ? t('cleaning.task.youSuffix') : ''}`
            : t('cleaning.task.unassigned')}
        />
        {task.lastCompletedByUserName && (
          <DetailRow
            label={t('cleaning.task.lastCompleted')}
            value={`${task.lastCompletedByUserName} — ${new Date(task.lastCompletedAt!).toLocaleDateString()}`}
          />
        )}
        {task.rotationOrder.length > 0 && (
          <DetailRow label={t('cleaning.rotation.order')} value={rotationNames} />
        )}
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />

      {/* Comments */}
      <CommentThread
        comments={task.comments ?? []}
        onAdd={async (text) => {
          await cleaningApi.post(`/tasks/${taskId}/comments`, { text }, headers());
          fetchTask();
        }}
        onUpdate={async (commentId, text) => {
          await cleaningApi.put(`/tasks/${taskId}/comments/${commentId}`, { text }, headers());
          fetchTask();
        }}
        onDelete={async (commentId) => {
          await cleaningApi.delete(`/tasks/${taskId}/comments/${commentId}`, headers());
          fetchTask();
        }}
      />
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 14, color: colors.mutedForeground, fontWeight: '500' }}>{label}</Text>
      <Text style={{ fontSize: 14, color: colors.foreground, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 }}>{value}</Text>
    </View>
  );
}
