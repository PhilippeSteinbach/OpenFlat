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
import { cleaningApi } from '../../../shared/api/client';
import { CommentThread, type CommentDto } from '../../../features/comments/CommentThread';

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
      </View>
    );
  }

  const rotationNames = task.rotationOrder
    .map((id) => PREDEFINED_USERS.find((u) => u.id === id)?.name ?? `#${id}`)
    .join(' → ');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTask(); }} />
      }
    >
      {/* Task info header */}
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <View style={styles.taskMeta}>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>{task.points} {t('common.points')}</Text>
          </View>
          <View style={styles.effortBadge}>
            <Text style={styles.effortText}>{t(`cleaning.effort.${task.effort}`)}</Text>
          </View>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailSection}>
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
      <View style={styles.divider} />

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
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#9CA3AF' },
  taskHeader: { marginBottom: 16 },
  taskTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pointsBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pointsText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  effortBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  effortText: { fontSize: 13, fontWeight: '500', color: '#2563EB' },
  detailSection: { marginTop: 8, gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
});
