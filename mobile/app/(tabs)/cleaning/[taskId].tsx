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
  points: number;
  status: string;
  assignedUserId: number | null;
  assignedUserName: string | null;
  sortOrder: number;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  comments: CommentDto[];
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  awaiting_review: 'Awaiting Review',
  done: 'Done',
};

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
        <Text style={styles.errorText}>{t('common.error', 'Task not found')}</Text>
      </View>
    );
  }

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
            <Text style={styles.pointsText}>{task.points} pts</Text>
          </View>
          <Text style={styles.statusText}>{STATUS_LABELS[task.status] ?? task.status}</Text>
          {task.assignedUserName && (
            <Text style={styles.assigneeText}>→ {task.assignedUserName}</Text>
          )}
        </View>
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
  statusText: { fontSize: 14, color: '#6B7280' },
  assigneeText: { fontSize: 14, color: '#374151' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
});
