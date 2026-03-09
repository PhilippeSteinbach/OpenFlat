import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '../../shared/hooks/useCurrentUser';

export interface CommentDto {
  id: string;
  userId: number;
  userName: string;
  text: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommentThreadProps {
  comments: CommentDto[];
  onAdd: (text: string) => Promise<void>;
  onUpdate: (commentId: string, text: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

export function CommentThread({ comments, onAdd, onUpdate, onDelete }: CommentThreadProps) {
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setNewText('');
    } catch {
      Alert.alert(t('common.error', 'Error'), 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (commentId: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onUpdate(commentId, trimmed);
      setEditingId(null);
      setEditText('');
    } catch {
      Alert.alert(t('common.error', 'Error'), 'Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (commentId: string) => {
    Alert.alert(
      t('comments.delete', 'Delete'),
      t('comments.deleteConfirm', 'Delete this comment?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: () => onDelete(commentId),
        },
      ],
    );
  };

  const startEditing = (comment: CommentDto) => {
    setEditingId(comment.id);
    setEditText(comment.text);
  };

  const renderComment = ({ item: comment }: { item: CommentDto }) => {
    const isOwn = comment.userId === currentUser?.id;
    const isEditing = editingId === comment.id;
    const date = new Date(comment.createdAt).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.commentCard}>
        <View style={styles.commentHeader}>
          <View style={styles.commentMeta}>
            <Text style={styles.commentAuthor}>{comment.userName}</Text>
            <Text style={styles.commentDate}>{date}</Text>
            {comment.isEdited && (
              <Text style={styles.editedBadge}>{t('comments.edited', '(edited)')}</Text>
            )}
          </View>
          {isOwn && !isEditing && (
            <View style={styles.commentActions}>
              <TouchableOpacity onPress={() => startEditing(comment)}>
                <Text style={styles.actionIcon}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(comment.id)}>
                <Text style={styles.actionIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isEditing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              maxLength={2000}
              autoFocus
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => handleUpdate(comment.id)}
              disabled={submitting || !editText.trim()}
            >
              <Text style={styles.saveButtonText}>{t('common.save', 'Save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setEditingId(null);
                setEditText('');
              }}
            >
              <Text style={styles.cancelText}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.commentText}>{comment.text}</Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Text style={styles.sectionTitle}>
        💬 {t('comments.title', 'Comments')} ({comments.length})
      </Text>

      {comments.length === 0 ? (
        <Text style={styles.emptyText}>
          {t('comments.empty', 'No comments yet — start the conversation!')}
        </Text>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          scrollEnabled={false}
          style={styles.commentList}
        />
      )}

      {/* Add comment input */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={newText}
          onChangeText={setNewText}
          placeholder={t('comments.add', 'Add a comment...')}
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          style={[styles.postButton, (!newText.trim() || submitting) && styles.postButtonDisabled]}
          onPress={handleAdd}
          disabled={!newText.trim() || submitting}
        >
          <Text style={styles.postButtonText}>{t('comments.addButton', 'Post')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 24,
  },
  commentList: { marginBottom: 12 },
  commentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: '#111827' },
  commentDate: { fontSize: 11, color: '#9CA3AF' },
  editedBadge: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' },
  commentActions: { flexDirection: 'row', gap: 6 },
  actionIcon: { fontSize: 14, padding: 2 },
  commentText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#111827',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  cancelText: { color: '#6B7280', fontSize: 13, paddingHorizontal: 4 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  postButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  postButtonDisabled: { opacity: 0.5 },
  postButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
