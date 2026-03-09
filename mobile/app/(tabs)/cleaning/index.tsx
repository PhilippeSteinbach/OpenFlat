import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '../../../shared/hooks/useCurrentUser';
import { cleaningApi } from '../../../shared/api/client';

// ── Types ──────────────────────

interface TaskDto {
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
}

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'];

// ── Helpers ──────────────────────

function daysUntilDue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDeadlineBadge(dueDate: string, t: (key: string, opts?: Record<string, unknown>) => string) {
  const days = daysUntilDue(dueDate);
  if (days < 0) return { text: t('cleaning.deadline.overdue_other', { count: Math.abs(days) }), color: '#DC2626', bg: '#FEE2E2' };
  if (days === 0) return { text: t('cleaning.deadline.today'), color: '#D97706', bg: '#FEF3C7' };
  if (days <= 3) return { text: t('cleaning.deadline.daysLeft_other', { count: days }), color: '#D97706', bg: '#FEF9C3' };
  return { text: t('cleaning.deadline.daysLeft_other', { count: days }), color: '#059669', bg: '#D1FAE5' };
}

function formatFrequency(value: number, unit: string): string {
  return `${value}${unit === 'Days' ? 'd' : 'w'}`;
}

// ── Cleaning Screen ──────────────────────

export default function CleaningScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const headers = useCallback(
    () => ({ 'X-User-Id': String(currentUser?.id ?? 1) }),
    [currentUser],
  );

  const fetchTasks = useCallback(async () => {
    try {
      const data = await cleaningApi.get<TaskDto[]>('/tasks', headers());
      setTasks(data);
      setError(false);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Sort by urgency: overdue → due soon → later
  const sortedTasks = [...tasks].sort((a, b) => daysUntilDue(a.dueDate) - daysUntilDue(b.dueDate));

  const handleComplete = useCallback(
    async (task: TaskDto) => {
      try {
        await cleaningApi.post(`/tasks/${task.id}/complete`, {}, headers());
        fetchTasks();
      } catch {
        Alert.alert(t('common.error'));
      }
    },
    [headers, fetchTasks, t],
  );

  const handleDelete = useCallback(
    async (taskId: string) => {
      Alert.alert(
        t('cleaning.task.delete'),
        t('cleaning.task.deleteWarning'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await cleaningApi.delete(`/tasks/${taskId}`, headers());
                fetchTasks();
              } catch {
                Alert.alert(t('common.error'));
              }
            },
          },
        ],
      );
    },
    [headers, fetchTasks, t],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red', fontSize: 16, marginBottom: 12 }}>{t('common.error')}</Text>
        <TouchableOpacity
          onPress={() => { setLoading(true); fetchTasks(); }}
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
        >
          <Text style={{ color: '#2563EB', fontSize: 14 }}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧹 {t('cleaning.title')}</Text>
      </View>

      {/* Task List */}
      <FlatList
        data={sortedTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchTasks(); }}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>{t('cleaning.emptyState.title')}</Text>
            <Text style={styles.emptyText}>{t('cleaning.emptyState.description')}</Text>
          </View>
        }
        renderItem={({ item: task }) => {
          const isOwn = task.assignedUserId === currentUser?.id;
          const deadline = getDeadlineBadge(task.dueDate, t);

          return (
            <TouchableOpacity
              style={[styles.card, isOwn && styles.cardOwn]}
              onPress={() => router.push(`/cleaning/${task.id}`)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={task.title}
            >
              <View style={styles.cardRow}>
                {/* Complete button */}
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={() => handleComplete(task)}
                  accessibilityRole="button"
                  accessibilityLabel={t('cleaning.task.complete')}
                >
                  <Text style={styles.completeIcon}>✓</Text>
                </TouchableOpacity>

                {/* Task info */}
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{task.title}</Text>
                    <View style={styles.badgeRow}>
                      <View style={styles.pointsBadge}>
                        <Text style={styles.pointsText}>{task.points} {t('common.points')}</Text>
                      </View>
                      <View style={styles.freqBadge}>
                        <Text style={styles.freqText}>{formatFrequency(task.frequencyValue, task.frequencyUnit)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardMeta}>
                    {/* Assignee */}
                    {task.assignedUserId ? (
                      <View style={styles.assigneeInfo}>
                        <View
                          style={[
                            styles.avatar,
                            { backgroundColor: AVATAR_COLORS[(task.assignedUserId - 1) % AVATAR_COLORS.length] },
                          ]}
                        >
                          <Text style={styles.avatarText}>
                            {task.assignedUserName?.charAt(0) ?? '?'}
                          </Text>
                        </View>
                        <Text style={[styles.assigneeName, isOwn && styles.assigneeNameOwn]}>
                          {task.assignedUserName}{isOwn ? t('cleaning.task.youSuffix') : ''}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.unassigned}>{t('cleaning.task.unassigned')}</Text>
                    )}

                    {/* Deadline */}
                    <View style={[styles.deadlineBadge, { backgroundColor: deadline.bg }]}>
                      <Text style={[styles.deadlineText, { color: deadline.color }]}>{deadline.text}</Text>
                    </View>
                  </View>

                  {/* Last completed */}
                  {task.lastCompletedByUserName && (
                    <Text style={styles.lastCompleted}>
                      {t('cleaning.task.lastBy')} {task.lastCompletedByUserName}
                    </Text>
                  )}
                </View>

                {/* Delete */}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(task.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.delete')}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ── Styles ──────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardOwn: { borderColor: '#93C5FD', borderWidth: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  completeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  completeIcon: { color: '#059669', fontSize: 14, fontWeight: '700' },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827', marginRight: 8 },
  badgeRow: { flexDirection: 'row', gap: 4 },
  pointsBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  pointsText: { fontSize: 11, fontWeight: '600', color: '#92400E' },
  freqBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  freqText: { fontSize: 11, fontWeight: '500', color: '#6B7280' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  assigneeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  assigneeName: { fontSize: 13, color: '#6B7280' },
  assigneeNameOwn: { color: '#2563EB', fontWeight: '600' },
  unassigned: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  deadlineBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  deadlineText: { fontSize: 11, fontWeight: '600' },
  lastCompleted: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  deleteButton: { padding: 4, marginLeft: 6 },
  deleteIcon: { fontSize: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});
