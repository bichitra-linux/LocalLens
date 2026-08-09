import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTrendingNotes } from '../hooks/useTrending';
import { useTheme } from '../hooks/useTheme';
import { useReactions, useToggleReaction } from '../hooks/useReactions';
import { CategoryChip } from '../components/CategoryChip';
import { AdBanner } from '../components/AdBanner';
import { NoteCategory, CATEGORIES } from '../../domain/entities/Category';
import { Note } from '../../domain/entities/Note';
import { borderRadius, spacing, typography } from '../../utils/theme';
import { formatTimeAgo } from '../../utils/formatTime';

type TrendingNavigationProp = StackNavigationProp<RootStackParamList>;

const ReactionBar: React.FC<{ noteId: string; colors: ReturnType<typeof useTheme>['colors'] }> = ({ noteId, colors }) => {
  const { data: reactions } = useReactions(noteId);
  const toggleReaction = useToggleReaction();

  if (!reactions || reactions.length === 0) return null;

  return (
    <View style={localStyles.reactionBar}>
      {reactions.filter(r => r.count > 0).map((reaction) => (
        <TouchableOpacity
          key={reaction.emoji}
          style={[
            { ...localStyles.reactionChip, backgroundColor: colors.background },
            reaction.hasReacted && { backgroundColor: colors.primary + '20' },
          ]}
          onPress={() => toggleReaction.mutate({ noteId, emoji: reaction.emoji })}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={`${reaction.emoji} ${reaction.count}`}
          accessibilityRole="button"
          accessibilityState={{ selected: reaction.hasReacted }}
        >
          <Text style={localStyles.reactionEmoji}>{reaction.emoji}</Text>
          <Text style={[localStyles.reactionCount, { color: colors.textSecondary }]}>{reaction.count}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const NoteCard: React.FC<{ note: Note; colors: ReturnType<typeof useTheme>['colors'] }> = ({ note, colors }) => {
  const navigation = useNavigation<TrendingNavigationProp>();

  return (
    <TouchableOpacity
      style={[localStyles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={() => navigation.navigate('NoteDetail', { noteId: note.id })}
      activeOpacity={0.7}
      accessibilityLabel={`Note by ${note.username}: ${note.content.substring(0, 50)}`}
      accessibilityRole="button"
    >
      <View style={localStyles.cardHeader}>
        <CategoryChip category={(note.category || 'general') as NoteCategory} size="small" />
        <Text style={[localStyles.timeAgo, { color: colors.textSecondary }]}>{formatTimeAgo(note.createdAt)}</Text>
      </View>

      <Text style={[localStyles.username, { color: colors.text }]}>{note.username}</Text>

      <Text style={[localStyles.content, { color: colors.text }]} numberOfLines={4}>
        {note.content}
      </Text>

      <ReactionBar noteId={note.id} colors={colors} />

      <View style={localStyles.statsRow}>
        <View style={localStyles.stat}>
          <Ionicons name="arrow-up" size={16} color={colors.primary} />
          <Text style={[localStyles.statText, { color: colors.textSecondary }]}>{note.upvotes}</Text>
        </View>
        <View style={localStyles.stat}>
          <Ionicons name="arrow-down" size={16} color={colors.textSecondary} />
          <Text style={[localStyles.statText, { color: colors.textSecondary }]}>{note.downvotes}</Text>
        </View>
        <View style={localStyles.stat}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
          <Text style={[localStyles.statText, { color: colors.textSecondary }]}>{note.commentsCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const TrendingScreen: React.FC = () => {
  const { colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | undefined>(undefined);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useTrendingNotes(selectedCategory);

  const notes = data?.pages.flatMap((page) => page.data) ?? [];

  const handleCategoryPress = (category: NoteCategory | undefined) => {
    setSelectedCategory(category);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={localStyles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={localStyles.emptyContainer}>
        <Ionicons name="trending-up-outline" size={48} color={colors.textSecondary} />
        <Text style={[localStyles.emptyText, { color: colors.textSecondary }]}>No trending notes yet</Text>
      </View>
    );
  };

  const renderNoteItem = useCallback(({ item }: { item: Note }) => (
    <NoteCard note={item} colors={colors} />
  ), [colors]);

  return (
    <SafeAreaView style={[localStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[localStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[localStyles.title, { color: colors.text }]}>Trending</Text>
      </View>

      <View style={[localStyles.categoryBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={localStyles.categoryScroll}
        >
          <TouchableOpacity
            style={[
              localStyles.allChip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              !selectedCategory && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => handleCategoryPress(undefined)}
            accessibilityLabel="All categories"
            accessibilityRole="button"
            accessibilityState={{ selected: !selectedCategory }}
          >
            <Text style={[localStyles.allChipText, { color: colors.text }, !selectedCategory && { color: colors.surface }]}>
              All
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat.id}
              category={cat.id}
              selected={selectedCategory === cat.id}
              onPress={() => handleCategoryPress(cat.id)}
            />
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={localStyles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNoteItem}
          contentContainerStyle={localStyles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Ad Banner at Bottom */}
      <AdBanner size="banner" />
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  categoryBar: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  categoryScroll: {
    paddingHorizontal: 12,
    gap: spacing.sm,
  },
  allChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  allChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0a0c10',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeAgo: {
    fontSize: typography.fontSize.xs,
  },
  username: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: 4,
  },
  content: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: 8,
  },
  reactionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: typography.fontSize.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
  },
});
