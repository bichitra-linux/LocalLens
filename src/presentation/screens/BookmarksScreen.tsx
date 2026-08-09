import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBookmarks } from '../hooks/useBookmarks';
import { BookmarkService } from '../../utils/bookmarks';
import { BookmarkEntry } from '../../utils/bookmarks';
import { useQueryClient } from '@tanstack/react-query';
import { bookmarkKeys } from '../hooks/useBookmarks';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../hooks/useTheme';
import { formatTimeAgo } from '../../utils/formatTime';

type BookmarksNavigationProp = StackNavigationProp<RootStackParamList>;

const STALE_DAYS = 7;

const bookmarkService = BookmarkService.getInstance();

export const BookmarksScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<BookmarksNavigationProp>();
  const queryClient = useQueryClient();
  const { data: bookmarks, isLoading, refetch, isRefetching } = useBookmarks();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const isStale = (bookmarkedAt: string): boolean => {
    const bookmarkDate = new Date(bookmarkedAt);
    const now = new Date();
    const diffMs = now.getTime() - bookmarkDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > STALE_DAYS;
  };

  const handleRemoveBookmark = useCallback(
    async (noteId: string) => {
      Alert.alert('Remove Bookmark', 'Remove this note from your bookmarks?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await bookmarkService.removeBookmark(noteId);
            queryClient.invalidateQueries({ queryKey: bookmarkKeys.list() });
            queryClient.setQueryData(bookmarkKeys.isBookmarked(noteId), false);
          },
        },
      ]);
    },
    [queryClient],
  );

  const renderBookmarkCard = useCallback(
    ({ item }: { item: BookmarkEntry }) => {
      const note = item.noteSnapshot;
      const stale = isStale(item.bookmarkedAt);

      return (
        <Pressable
          onLongPress={() => handleRemoveBookmark(item.noteId)}
          onPress={() => navigation.navigate('NoteDetail', { noteId: item.noteId })}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.surface },
            pressed && styles.cardPressed,
          ]}
          accessibilityLabel={`Note by ${note.username}`}
          accessibilityRole="button"
        >
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.userInfo}>
                <Ionicons name="person-circle-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.username, { color: colors.text }]}>{note.username}</Text>
              </View>
              {stale && (
                <View style={[styles.staleBadge, { backgroundColor: colors.error + '1A' }]}>
                  <Ionicons name="warning-outline" size={12} color={colors.error} />
                  <Text style={[styles.staleText, { color: colors.error }]}>May be outdated</Text>
                </View>
              )}
            </View>

            <Text style={[styles.content, { color: colors.text }]} numberOfLines={3}>
              {note.content}
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Ionicons name="arrow-up-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>{note.upvotes}</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="arrow-down-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>{note.downvotes}</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>{note.commentsCount}</Text>
                </View>
              </View>
              <Text style={[styles.timestamp, { color: colors.textSecondary }]}>{formatTimeAgo(typeof note.createdAt === 'string' ? new Date(note.createdAt) : note.createdAt)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveBookmark(item.noteId)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Remove bookmark"
            accessibilityRole="button"
          >
            <Ionicons name="bookmark" size={22} color={colors.primary} />
          </TouchableOpacity>
        </Pressable>
      );
    },
    [navigation, handleRemoveBookmark, colors],
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '1A' }]}>
        <Ionicons name="bookmark-outline" size={64} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No bookmarks yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Save interesting notes to read them later
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('Main', { screen: 'Map' })}
        accessibilityLabel="Explore notes"
        accessibilityRole="button"
      >
        <Ionicons name="map-outline" size={20} color={colors.surface} />
        <Text style={[styles.emptyButtonText, { color: colors.surface }]}>Explore Notes</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={bookmarks ?? []}
        keyExtractor={(item) => item.noteId}
        renderItem={renderBookmarkCard}
        contentContainerStyle={bookmarks && bookmarks.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefetching}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 12,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  staleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  staleText: {
    fontSize: 10,
    fontWeight: '500',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    fontSize: 12,
  },
  timestamp: {
    fontSize: 11,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 8,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
