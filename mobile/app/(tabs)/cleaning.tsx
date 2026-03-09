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
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '../../shared/hooks/useCurrentUser';
import { cleaningApi } from '../../shared/api/client';

// ── Types ──────────────────────

interface TaskDto {
  id: string;
  title: string;
  points: number;
  status: TaskStatus;
  assignedUserId: number | null;
  assignedUserName: string | null;
  sortOrder: number;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
}

type TaskStatus = 'todo' | 'in_progress' | 'awaiting_review' | 'done';

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'awaiting_review', 'done'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  awaiting_review: 'Review',
  done: 'Done',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '#6B7280',
  in_progress: '#2563EB',
  awaiting_review: '#D97706',
  done: '#059669',
};

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'];

const PREDEFINED_USERS = [
  { id: 1, name: 'Alex' },
  { id: 2, name: 'Jordan' },
  { id: 3, name: 'Sam' },
  { id: 4, name: 'Taylor' },
  { id: 5, name: 'Casey' },
];

// ── Cleaning Screen ──────────────────────

export default function CleaningScreen() {
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>('todo');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignTask, setAssignTask] = useState<TaskDto | null>(null);

  const headers = useCallback(
    () => ({ 'X-User-Id': String(currentUser?.id ?? 1) }),
    [currentUser],
  );

  const fetchTasks = useCallback(async () => {
    try {
      const data = await cleaningApi.get<TaskDto[]>('/tasks', headers());
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = tasks
    .filter((t) => t.status === selectedStatus)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleMoveTask = useCallback(
    async (task: TaskDto, targetStatus: TaskStatus) => {
      try {
        const targetTasks = tasks.filter((t) => t.status === targetStatus);
        const targetSortOrder = targetTasks.length > 0
          ? Math.max(...targetTasks.map((t) => t.sortOrder)) + 1
          : 0;
        await cleaningApi.post(
          `/tasks/${task.id}/move`,
          { targetStatus, targetSortOrder },
          headers(),
        );
        fetchTasks();
      } catch {
        Alert.alert(t('common.error', 'Error'), t('cleaning.moveError', 'Failed to move task'));
      }
    },
    [tasks, headers, fetchTasks, t],
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      Alert.alert(
        t('cleaning.task.deleteConfirm', 'Delete Task?'),
        t('cleaning.task.deleteWarning', 'This action cannot be undone.'),
        [
          { text: t('common.cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('common.delete', 'Delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await cleaningApi.delete(`/tasks/${taskId}`, headers());
                fetchTasks();
              } catch {
                Alert.alert(t('common.error', 'Error'), t('cleaning.deleteError', 'Failed to delete task'));
              }
            },
          },
        ],
      );
    },
    [headers, fetchTasks, t],
  );

  const handleAssign = useCallback(
    async (userId: number | null) => {
      if (!assignTask) return;
      try {
        await cleaningApi.post(
          `/tasks/${assignTask.id}/assign`,
          { assignedUserId: userId },
          headers(),
        );
        setAssignTask(null);
        fetchTasks();
      } catch {
        Alert.alert(t('common.error', 'Error'), t('cleaning.assignError', 'Failed to assign task'));
      }
    },
    [assignTask, headers, fetchTasks, t],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧹 {t('cleaning.title', 'Cleaning Board')}</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setCreateModalOpen(true)}
        >
          <Text style={styles.createButtonText}>+ {t('cleaning.task.create', 'New')}</Text>
        </TouchableOpacity>
      </View>

      {/* Status Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statusBar}
        contentContainerStyle={styles.statusBarContent}
      >
        {STATUSES.map((status) => {
          const count = tasks.filter((t) => t.status === status).length;
          const isActive = selectedStatus === status;
          return (
            <TouchableOpacity
              key={status}
              onPress={() => setSelectedStatus(status)}
              style={[
                styles.statusTab,
                isActive && { backgroundColor: STATUS_COLORS[status], borderColor: STATUS_COLORS[status] },
              ]}
            >
              <Text style={[styles.statusTabText, isActive && styles.statusTabTextActive]}>
                {STATUS_LABELS[status]} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
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
            <Text style={styles.emptyText}>
              {t('cleaning.column.empty', 'No tasks in this column')}
            </Text>
          </View>
        }
        renderItem={({ item: task }) => {
          const isOwn = task.assignedUserId === currentUser?.id;
          const statusIdx = STATUSES.indexOf(task.status);
          const nextStatus = statusIdx < STATUSES.length - 1 ? STATUSES[statusIdx + 1] : null;
          const prevStatus = statusIdx > 0 ? STATUSES[statusIdx - 1] : null;

          return (
            <View style={[styles.card, isOwn && styles.cardOwn]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>{task.title}</Text>
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsText}>{task.points} pts</Text>
                </View>
              </View>

              {/* Assignee */}
              <TouchableOpacity
                onPress={() => setAssignTask(task)}
                style={styles.assigneeRow}
              >
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
                      {task.assignedUserName}{isOwn ? ' (you)' : ''}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.unassigned}>{t('cleaning.task.assign', 'Assign')}</Text>
                )}
              </TouchableOpacity>

              {/* Actions */}
              <View style={styles.cardActions}>
                {prevStatus && (
                  <TouchableOpacity
                    style={styles.moveButton}
                    onPress={() => handleMoveTask(task, prevStatus)}
                  >
                    <Text style={styles.moveButtonText}>← {STATUS_LABELS[prevStatus]}</Text>
                  </TouchableOpacity>
                )}
                {nextStatus && (
                  <TouchableOpacity
                    style={[styles.moveButton, styles.moveButtonForward]}
                    onPress={() => handleMoveTask(task, nextStatus)}
                  >
                    <Text style={[styles.moveButtonText, styles.moveButtonTextForward]}>
                      {STATUS_LABELS[nextStatus]} →
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTask(task.id)}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={async (title, points) => {
          try {
            await cleaningApi.post('/tasks', { title, points }, headers());
            setCreateModalOpen(false);
            fetchTasks();
          } catch {
            Alert.alert(t('common.error', 'Error'), t('cleaning.createError', 'Failed to create task'));
          }
        }}
      />

      {/* Assign Modal */}
      <Modal visible={!!assignTask} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('cleaning.task.assign', 'Assign Task')}</Text>
            <TouchableOpacity
              style={styles.assignOption}
              onPress={() => handleAssign(null)}
            >
              <Text style={styles.assignOptionUnassigned}>
                {t('cleaning.task.unassigned', 'Unassigned')}
              </Text>
            </TouchableOpacity>
            {PREDEFINED_USERS.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.assignOption,
                  assignTask?.assignedUserId === user.id && styles.assignOptionActive,
                ]}
                onPress={() => handleAssign(user.id)}
              >
                <View style={styles.assigneeInfo}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: AVATAR_COLORS[(user.id - 1) % AVATAR_COLORS.length] },
                    ]}
                  >
                    <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.assignOptionText}>{user.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setAssignTask(null)}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Create Task Modal ──────────────────────

function CreateTaskModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string, points: number) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState('10');

  const handleCreate = () => {
    const trimmed = title.trim();
    const parsed = parseInt(points, 10);
    if (!trimmed) {
      Alert.alert(t('validation.required', 'Title is required'));
      return;
    }
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert(t('validation.positiveNumber', 'Points must be non-negative'));
      return;
    }
    onCreate(trimmed, parsed);
    setTitle('');
    setPoints('10');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('cleaning.task.create', 'Create Task')}</Text>

          <Text style={styles.inputLabel}>{t('cleaning.task.titleLabel', 'Title')}</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder={t('cleaning.task.titlePlaceholder', 'Enter task title...')}
            maxLength={200}
            autoFocus
          />

          <Text style={styles.inputLabel}>{t('cleaning.task.pointsLabel', 'Points')}</Text>
          <TextInput
            style={styles.textInput}
            value={points}
            onChangeText={setPoints}
            keyboardType="numeric"
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleCreate}>
              <Text style={styles.submitButtonText}>{t('cleaning.task.create', 'Create')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  createButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  statusBar: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  statusBarContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  statusTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  statusTabText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  statusTabTextActive: { color: '#FFFFFF' },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827', marginRight: 8 },
  pointsBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  pointsText: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  assigneeRow: { marginBottom: 10 },
  assigneeInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  assigneeName: { fontSize: 13, color: '#6B7280' },
  assigneeNameOwn: { color: '#2563EB', fontWeight: '600' },
  unassigned: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  moveButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  moveButtonForward: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  moveButtonText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  moveButtonTextForward: { color: '#2563EB' },
  deleteButton: { marginLeft: 'auto', padding: 5 },
  deleteButtonText: { fontSize: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4, marginTop: 12 },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  submitButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  assignOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  assignOptionActive: { backgroundColor: '#EFF6FF' },
  assignOptionText: { fontSize: 15, color: '#111827' },
  assignOptionUnassigned: { fontSize: 15, color: '#9CA3AF', fontStyle: 'italic' },
});
