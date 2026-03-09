import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '../../shared/hooks/useCurrentUser';
import { useTheme, type ThemeColors } from '../../shared/theme';

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
  const { colors } = useTheme();
  const styles = getStyles(colors);
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
      Alert.alert(t('common.error', 'Error'), t('comments.failedAdd'));
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
      Alert.alert(t('common.error', 'Error'), t('comments.failedUpdate'));
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
              <TouchableOpacity onPress={() => startEditing(comment)} accessibilityRole="button" accessibilityLabel={t('comments.edit', 'Edit')}>
                <Text style={styles.actionIcon}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(comment.id)} accessibilityRole="button" accessibilityLabel={t('comments.delete', 'Delete')}>
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
              accessibilityLabel={t('comments.editInput', 'Edit comment')}
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => handleUpdate(comment.id)}
              disabled={submitting || !editText.trim()}
              accessibilityRole="button"
              accessibilityLabel={t('common.save', 'Save')}
            >
              <Text style={styles.saveButtonText}>{t('common.save', 'Save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setEditingId(null);
                setEditText('');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel', 'Cancel')}
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
          accessibilityLabel={t('comments.add', 'Add a comment...')}
        />
        <TouchableOpacity
          style={[styles.postButton, (!newText.trim() || submitting) && styles.postButtonDisabled]}
          onPress={handleAdd}
          disabled={!newText.trim() || submitting}
          accessibilityRole="button"
          accessibilityLabel={t('comments.addButton', 'Post')}
        >
          <Text style={styles.postButtonText}>{t('comments.addButton', 'Post')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: ThemeColors) {
  return {
    container: { flex: 1 as const },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.mutedForeground,
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center' as const,
      paddingVertical: 24,
    },
    commentList: { marginBottom: 12 },
    commentCard: {
      backgroundColor: colors.muted,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    commentHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 4,
    },
    commentMeta: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    commentAuthor: { fontSize: 13, fontWeight: '600' as const, color: colors.foreground },
    commentDate: { fontSize: 11, color: colors.mutedForeground },
    editedBadge: { fontSize: 11, color: colors.mutedForeground, fontStyle: 'italic' as const },
    commentActions: { flexDirection: 'row' as const, gap: 6 },
    actionIcon: { fontSize: 14, padding: 2 },
    commentText: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
    editRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginTop: 4 },
    editInput: {
      flex: 1 as const,
      borderWidth: 1,
      borderColor: colors.input,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 14,
      color: colors.foreground,
      backgroundColor: colors.background,
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    saveButtonText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '600' as const },
    cancelText: { color: colors.mutedForeground, fontSize: 13, paddingHorizontal: 4 },
    addRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      marginTop: 8,
    },
    addInput: {
      flex: 1 as const,
      borderWidth: 1,
      borderColor: colors.input,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.foreground,
      backgroundColor: colors.background,
    },
    postButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },
    postButtonDisabled: { opacity: 0.5 },
    postButtonText: { color: colors.primaryForeground, fontSize: 14, fontWeight: '600' as const },
  };
}
