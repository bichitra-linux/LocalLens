import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from 'expo-haptics';
import { useNote, useDeleteNote } from '../hooks/useNotes';
import { useVoteOnNote, useComments, useAddComment, useDeleteComment } from '../hooks/useInteractions';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../../utils/theme';
import { useAppStore } from '../store/appStore';
import { useIsBookmarked, useToggleBookmark } from '../hooks/useBookmarks';
import { VoteType } from '../../domain/entities/Interaction';
import { formatTimeAgoFull, formatExpiresIn } from '../../utils/formatTime';

type NoteDetailScreenRouteProp = RouteProp<RootStackParamList, 'NoteDetail'>;
type NoteDetailNavigationProp = StackNavigationProp<RootStackParamList>;

export const NoteDetailScreen: React.FC = () => {
  const route = useRoute<NoteDetailScreenRouteProp>();
  const navigation = useNavigation<NoteDetailNavigationProp>();
  const { noteId } = route.params;
  const { user } = useAppStore();
  const { colors } = useTheme();

  const [commentText, setCommentText] = useState('');
  const headerHeight = useHeaderHeight();

  const { data: note, isLoading: noteLoading, refetch: refetchNote } = useNote(noteId);
  const { data: commentsData, fetchNextPage, hasNextPage } = useComments(noteId);
  const voteOnNoteMutation = useVoteOnNote();
  const addCommentMutation = useAddComment();
  const deleteNoteMutation = useDeleteNote();
  const deleteCommentMutation = useDeleteComment();
  const { data: isBookmarked } = useIsBookmarked(noteId);
  const toggleBookmarkMutation = useToggleBookmark();

  const allComments = commentsData?.pages.flatMap(page => page.data) ?? [];

  const handleVote = useCallback(async (voteType: VoteType) => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await voteOnNoteMutation.mutateAsync({ noteId, voteType });
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    }
  }, [voteOnNoteMutation, noteId]);

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim()) {
      return;
    }

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await addCommentMutation.mutateAsync({
        noteId,
        content: commentText.trim(),
      });
      setCommentText('');
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    }
  }, [addCommentMutation, noteId, commentText]);

  const handleDeleteNote = useCallback(() => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNoteMutation.mutateAsync(noteId);
              Alert.alert('Success', 'Note deleted');
              navigation.goBack();
            } catch (error: unknown) {
              Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
            }
          },
        },
      ]
    );
  }, [deleteNoteMutation, noteId, navigation]);

  const handleDeleteComment = useCallback((commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCommentMutation.mutateAsync({ commentId, noteId });
            } catch (error: unknown) {
              Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
            }
          },
        },
      ]
    );
  }, [deleteCommentMutation, noteId]);

  const styles = createStyles(colors);

  if (noteLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!note) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>Note not found</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => refetchNote()}
            accessibilityLabel="Retry loading note"
            accessibilityRole="button"
          >
            <Text style={[styles.retryButtonText, { color: colors.surface }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = user?.id === note.userId;

  const handleNavigateToNote = useCallback(() => {
    if (note) {
      navigation.navigate('Navigation', {
        destinationLat: note.location.latitude,
        destinationLng: note.location.longitude,
        destinationName: note.content.substring(0, 30),
      });
    }
  }, [note, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
        style={{ flex: 1 }}
      >
      <FlatList
        data={allComments}
        keyExtractor={(item) => item.id}
        renderItem={({ item: comment }) => (
          <View key={comment.id} style={[styles.commentContainer, { borderBottomColor: colors.background }]}>
            <View style={styles.commentHeader}>
              <View style={styles.commentUserInfo}>
                <View style={[styles.commentAvatar, { backgroundColor: colors.primary + '20' }]}>
                  {comment.userAvatar ? (
                    <Image source={{ uri: comment.userAvatar }} style={styles.commentAvatarImage} accessibilityLabel={`${comment.username} avatar`} accessibilityRole="image" />
                  ) : (
                    <Ionicons name="person" size={16} color={colors.primary} />
                  )}
                </View>
                <Text style={[styles.commentUsername, { color: colors.text }]}>{comment.username}</Text>
              </View>
              <View style={styles.commentHeaderRight}>
                <Text style={[styles.commentTimestamp, { color: colors.textSecondary }]}>{formatTimeAgoFull(comment.createdAt)}</Text>
                {user?.id === comment.userId && (
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(comment.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.commentDeleteButton}
                    accessibilityLabel="Delete comment"
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <Text style={[styles.commentContent, { color: colors.text }]}>{comment.content}</Text>
          </View>
        )}
        ListHeaderComponent={useMemo(() => (
          <>
            <View style={[styles.noteContainer, { backgroundColor: colors.surface }]}>
              <View style={styles.noteHeader}>
                <View style={styles.userInfo}>
                  <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                    {note.userAvatar ? (
                      <Image source={{ uri: note.userAvatar }} style={styles.avatarImage} accessibilityLabel={`${note.username} avatar`} accessibilityRole="image" />
                    ) : (
                      <Ionicons name="person" size={20} color={colors.primary} />
                    )}
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={[styles.username, { color: colors.text }]}>{note.username}</Text>
                    <Text style={[styles.timestamp, { color: colors.textSecondary }]}>{formatTimeAgoFull(note.createdAt)}</Text>
                  </View>
                </View>
                <View style={styles.headerRight}>
                  <Text style={[styles.expiresText, { color: colors.error }]}>{formatExpiresIn(note.expiresAt)}</Text>
                  {note.expiresAt && new Date(note.expiresAt).getTime() - Date.now() < 86400000 && (
                    <View style={[styles.expirationWarning, { backgroundColor: colors.warning + '1A' }]}>
                      <Ionicons name="time-outline" size={12} color={colors.warning} />
                      <Text style={[styles.expirationWarningText, { color: colors.warning }]}>Expiring soon</Text>
                    </View>
                  )}
                  {isOwner && (
                    <TouchableOpacity
                      onPress={handleDeleteNote}
                      style={styles.deleteButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel="Delete note"
                      accessibilityRole="button"
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={[styles.noteContent, { color: colors.text }]}>{note.content}</Text>

              <View style={styles.noteActions}>
                <TouchableOpacity
                  style={[
                    styles.voteButton,
                    { borderColor: colors.border },
                    note.hasUserVoted === 'up' && [styles.upvotedButton, { backgroundColor: colors.success, borderColor: colors.success }],
                  ]}
                  onPress={() => handleVote('up')}
                  disabled={voteOnNoteMutation.isPending}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Upvote"
                  accessibilityRole="button"
                  accessibilityState={{ selected: note.hasUserVoted === 'up', disabled: voteOnNoteMutation.isPending }}
                >
                  <Ionicons name="arrow-up" size={20} color={note.hasUserVoted === 'up' ? colors.surface : colors.success} />
                  <Text style={[styles.voteText, { color: colors.textSecondary }, note.hasUserVoted === 'up' && styles.upvotedText]}>{note.upvotes}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.voteButton,
                    { borderColor: colors.border },
                    note.hasUserVoted === 'down' && [styles.downvotedButton, { backgroundColor: colors.error, borderColor: colors.error }],
                  ]}
                  onPress={() => handleVote('down')}
                  disabled={voteOnNoteMutation.isPending}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Downvote"
                  accessibilityRole="button"
                  accessibilityState={{ selected: note.hasUserVoted === 'down', disabled: voteOnNoteMutation.isPending }}
                >
                  <Ionicons name="arrow-down" size={20} color={note.hasUserVoted === 'down' ? colors.surface : colors.error} />
                  <Text style={[styles.voteText, { color: colors.textSecondary }, note.hasUserVoted === 'down' && styles.downvotedText]}>{note.downvotes}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.navigateButton, { backgroundColor: colors.primary }]} onPress={handleNavigateToNote} accessibilityLabel="Navigate to this note" accessibilityRole="button">
                  <Ionicons name="navigate" size={20} color={colors.surface} />
                  <Text style={styles.navigateButtonText}>Navigate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bookmarkButton, isBookmarked && [styles.bookmarkedButton, { backgroundColor: colors.primary }]]}
                  onPress={() => toggleBookmarkMutation.mutate(note)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !!isBookmarked }}
                >
                  <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={isBookmarked ? colors.surface : colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.commentCount}>
                  <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.commentCountText, { color: colors.textSecondary }]}>{note.commentsCount}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.commentsSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.commentsTitle, { color: colors.text }]}>Comments</Text>
              {user && (
                <View style={styles.addCommentContainer}>
                  <TextInput
                    style={[styles.commentInput, { borderColor: colors.border }]}
                    placeholder="Add a comment..."
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={280}
                    accessibilityLabel="Comment text"
                  />
                  <TouchableOpacity
                    style={[styles.addCommentButton, { backgroundColor: colors.primary }, !commentText.trim() && [styles.addCommentButtonDisabled, { backgroundColor: colors.textTertiary }]]}
                    onPress={handleAddComment}
                    disabled={addCommentMutation.isPending || !commentText.trim()}
                    accessibilityLabel="Submit comment"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: addCommentMutation.isPending || !commentText.trim() }}
                  >
                    {addCommentMutation.isPending ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <Ionicons name="send" size={16} color={colors.surface} />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        ), [note, colors, isOwner, handleDeleteNote, handleVote, voteOnNoteMutation, handleNavigateToNote, toggleBookmarkMutation, isBookmarked, user, commentText, addCommentMutation, handleAddComment])}
        ListFooterComponent={allComments.length === 0 ? (
          <View style={styles.noComments}>
            <Ionicons name="chatbubble-outline" size={32} color={colors.textTertiary} />
            <Text style={[styles.noCommentsText, { color: colors.textTertiary }]}>No comments yet</Text>
          </View>
        ) : hasNextPage ? (
          <TouchableOpacity style={styles.loadMoreButton} onPress={() => fetchNextPage()} accessibilityLabel="Load more comments" accessibilityRole="button">
            <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load More Comments</Text>
          </TouchableOpacity>
        ) : null}
        onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  noteContainer: {
    backgroundColor: colors.surface,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  expirationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  expirationWarningText: {
    fontSize: 10,
    fontWeight: '500',
  },
  expiresText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  noteContent: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  upvotedButton: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  downvotedButton: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  voteText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  upvotedText: {
    color: colors.surface,
  },
  downvotedText: {
    color: colors.surface,
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  commentCountText: {
    marginLeft: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  navigateButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  bookmarkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 12,
  },
  bookmarkedButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  commentsSection: {
    backgroundColor: colors.surface,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 8,
  },
  addCommentButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCommentButtonDisabled: {
    backgroundColor: colors.textTertiary,
  },
  commentContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentAvatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  commentHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentTimestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  commentDeleteButton: {
    padding: 8,
  },
  commentContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  loadMoreButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  loadMoreText: {
    color: colors.primary,
    fontSize: 16,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noCommentsText: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 8,
  },
});
