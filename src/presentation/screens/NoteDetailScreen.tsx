import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useNote } from '../hooks/useNotes';
import { useVoteOnNote, useComments, useAddComment } from '../hooks/useInteractions';
import { useAppStore } from '../store/appStore';
import { VoteType } from '../../domain/entities/Interaction';

type NoteDetailScreenRouteProp = RouteProp<RootStackParamList, 'NoteDetail'>;

export const NoteDetailScreen: React.FC = () => {
  const route = useRoute<NoteDetailScreenRouteProp>();
  const { noteId } = route.params;
  const { user } = useAppStore();
  
  const [commentText, setCommentText] = useState('');
  
  const { data: note, isLoading: noteLoading } = useNote(noteId);
  const { data: commentsData, fetchNextPage, hasNextPage } = useComments(noteId);
  const voteOnNoteMutation = useVoteOnNote();
  const addCommentMutation = useAddComment();

  const allComments = commentsData?.pages.flatMap(page => page.data) ?? [];

  const handleVote = async (voteType: VoteType) => {
    try {
      await voteOnNoteMutation.mutateAsync({ noteId, voteType });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      return;
    }

    try {
      await addCommentMutation.mutateAsync({
        noteId,
        content: commentText.trim(),
      });
      setCommentText('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${Math.max(1, diffInMinutes)} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
  };

  const formatExpiresIn = (expiresAt: Date): string => {
    const now = new Date();
    const diffInMs = expiresAt.getTime() - now.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMs <= 0) {
      return 'Expired';
    } else if (diffInDays > 0) {
      return `Expires in ${diffInDays} day${diffInDays > 1 ? 's' : ''}`;
    } else if (diffInHours > 0) {
      return `Expires in ${diffInHours} hour${diffInHours > 1 ? 's' : ''}`;
    } else {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `Expires in ${Math.max(1, diffInMinutes)} minute${diffInMinutes > 1 ? 's' : ''}`;
    }
  };

  if (noteLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  if (!note) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text>Note not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.noteContainer}>
          <View style={styles.noteHeader}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                {note.userAvatar ? (
                  <Image source={{ uri: note.userAvatar }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={20} color="#2196F3" />
                )}
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.username}>{note.username}</Text>
                <Text style={styles.timestamp}>{formatTimeAgo(note.createdAt)}</Text>
              </View>
            </View>
            <Text style={styles.expiresText}>{formatExpiresIn(note.expiresAt)}</Text>
          </View>

          <Text style={styles.noteContent}>{note.content}</Text>

          {note.imageUrl && (
            <Image source={{ uri: note.imageUrl }} style={styles.noteImage} />
          )}

          <View style={styles.noteActions}>
            <TouchableOpacity
              style={[
                styles.voteButton,
                note.hasUserVoted === 'up' && styles.upvotedButton
              ]}
              onPress={() => handleVote('up')}
              disabled={voteOnNoteMutation.isPending}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={note.hasUserVoted === 'up' ? '#fff' : '#4CAF50'}
              />
              <Text style={[
                styles.voteText,
                note.hasUserVoted === 'up' && styles.upvotedText
              ]}>
                {note.upvotes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.voteButton,
                note.hasUserVoted === 'down' && styles.downvotedButton
              ]}
              onPress={() => handleVote('down')}
              disabled={voteOnNoteMutation.isPending}
            >
              <Ionicons
                name="arrow-down"
                size={20}
                color={note.hasUserVoted === 'down' ? '#fff' : '#f44336'}
              />
              <Text style={[
                styles.voteText,
                note.hasUserVoted === 'down' && styles.downvotedText
              ]}>
                {note.downvotes}
              </Text>
            </TouchableOpacity>

            <View style={styles.commentCount}>
              <Ionicons name="chatbubble-outline" size={20} color="#666" />
              <Text style={styles.commentCountText}>{note.commentsCount}</Text>
            </View>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>

          {user && (
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={280}
              />
              <TouchableOpacity
                style={[
                  styles.addCommentButton,
                  !commentText.trim() && styles.addCommentButtonDisabled
                ]}
                onPress={handleAddComment}
                disabled={addCommentMutation.isPending || !commentText.trim()}
              >
                {addCommentMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}

          {allComments.map((comment) => (
            <View key={comment.id} style={styles.commentContainer}>
              <View style={styles.commentHeader}>
                <View style={styles.commentUserInfo}>
                  <View style={styles.commentAvatar}>
                    {comment.userAvatar ? (
                      <Image source={{ uri: comment.userAvatar }} style={styles.commentAvatarImage} />
                    ) : (
                      <Ionicons name="person" size={16} color="#2196F3" />
                    )}
                  </View>
                  <Text style={styles.commentUsername}>{comment.username}</Text>
                </View>
                <Text style={styles.commentTimestamp}>{formatTimeAgo(comment.createdAt)}</Text>
              </View>
              <Text style={styles.commentContent}>{comment.content}</Text>
            </View>
          ))}

          {hasNextPage && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={() => fetchNextPage()}
            >
              <Text style={styles.loadMoreText}>Load More Comments</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  noteContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
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
    backgroundColor: '#e3f2fd',
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
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  expiresText: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: '500',
  },
  noteContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
  },
  noteImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
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
    borderColor: '#e0e0e0',
  },
  upvotedButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  downvotedButton: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
  },
  voteText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  upvotedText: {
    color: '#fff',
  },
  downvotedText: {
    color: '#fff',
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  commentCountText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  commentsSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 8,
  },
  addCommentButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCommentButtonDisabled: {
    backgroundColor: '#ccc',
  },
  commentContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    backgroundColor: '#e3f2fd',
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
    color: '#333',
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#666',
  },
  commentContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  loadMoreButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  loadMoreText: {
    color: '#2196F3',
    fontSize: 16,
  },
});