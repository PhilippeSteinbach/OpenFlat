import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '../../../shared/hooks/useCurrentUser';
import { cleaningApi } from '../../../shared/api/client';
import { useTheme, avatarColors } from '../../../shared/theme';

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

const AVATAR_COLORS = avatarColors;

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
  const { colors } = useTheme();
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.destructive, fontSize: 16, marginBottom: 12 }}>{t('common.error')}</Text>
        <TouchableOpacity
          onPress={() => { setLoading(true); fetchTasks(); }}
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
        >
          <Text style={{ color: colors.primary, fontSize: 14 }}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>✨ {t('cleaning.title')}</Text>
      </View>

      {/* Task List */}
      <FlatList
        data={sortedTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchTasks(); }}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>📋</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground, marginBottom: 4 }}>{t('cleaning.emptyState.title')}</Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center' }}>{t('cleaning.emptyState.description')}</Text>
          </View>
        }
        renderItem={({ item: task }) => {
          const isOwn = task.assignedUserId === currentUser?.id;
          const deadline = getDeadlineBadge(task.dueDate, t);

          return (
            <TouchableOpacity
              style={[
                {
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
                isOwn && { borderColor: colors.primary, borderWidth: 2 },
              ]}
              onPress={() => router.push(`/cleaning/${task.id}`)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={task.title}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                {/* Complete button */}
                <TouchableOpacity
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: colors.success,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                    marginTop: 2,
                  }}
                  onPress={() => handleComplete(task)}
                  accessibilityRole="button"
                  accessibilityLabel={t('cleaning.task.complete')}
                >
                  <Text style={{ color: colors.success, fontSize: 14, fontWeight: '700' }}>✓</Text>
                </TouchableOpacity>

                {/* Task info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.foreground, marginRight: 8 }} numberOfLines={1}>{task.title}</Text>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <View style={{ backgroundColor: `${colors.warning}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.warning }}>{task.points} {t('common.points')}</Text>
                      </View>
                      <View style={{ backgroundColor: colors.muted, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>{formatFrequency(task.frequencyValue, task.frequencyUnit)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    {/* Assignee */}
                    {task.assignedUserId ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View
                          style={{
                            width: 20, height: 20, borderRadius: 10,
                            alignItems: 'center', justifyContent: 'center',
                            backgroundColor: AVATAR_COLORS[(task.assignedUserId - 1) % AVATAR_COLORS.length],
                          }}
                        >
                          <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>
                            {task.assignedUserName?.charAt(0) ?? '?'}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, color: isOwn ? colors.primary : colors.mutedForeground, fontWeight: isOwn ? '600' : '400' }}>
                          {task.assignedUserName}{isOwn ? t('cleaning.task.youSuffix') : ''}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 13, color: colors.mutedForeground, fontStyle: 'italic' }}>{t('cleaning.task.unassigned')}</Text>
                    )}

                    {/* Deadline */}
                    <View style={[{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }, { backgroundColor: deadline.bg }]}>
                      <Text style={[{ fontSize: 11, fontWeight: '600' }, { color: deadline.color }]}>{deadline.text}</Text>
                    </View>
                  </View>

                  {/* Last completed */}
                  {task.lastCompletedByUserName && (
                    <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
                      {t('cleaning.task.lastBy')} {task.lastCompletedByUserName}
                    </Text>
                  )}
                </View>

                {/* Delete */}
                <TouchableOpacity
                  style={{ padding: 4, marginLeft: 6 }}
                  onPress={() => handleDelete(task.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.delete')}
                >
                  <Text style={{ fontSize: 16 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

