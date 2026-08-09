import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';

type DraftsNavigationProp = StackNavigationProp<RootStackParamList>;
import { Ionicons } from '@expo/vector-icons';
import { DraftService, NoteDraft } from '../../utils/drafts';
import { useTheme } from '../hooks/useTheme';
import { formatRelativeTime } from '../../utils/formatTime';

interface DraftCardProps {
  draft: NoteDraft;
  onPress: (draft: NoteDraft) => void;
  onLongPress: (draft: NoteDraft) => void;
}

const DraftCard: React.FC<DraftCardProps> = ({ draft, onPress, onLongPress }) => {
  const { colors } = useTheme();

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => onPress(draft)}
      onLongPress={() => onLongPress(draft)}
      android_ripple={{ color: colors.border }}
      accessibilityLabel={`Draft: ${draft.title}`}
      accessibilityRole="button"
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {draft.title}
        </Text>
        <Text style={[styles.timestamp, { color: colors.textSecondary }]}>{formatRelativeTime(draft.lastSaved)}</Text>
      </View>

      <Text style={[styles.cardContent, { color: colors.textSecondary }]} numberOfLines={2}>
        {draft.content}
      </Text>

      <View style={styles.cardFooter}>
        {draft.location && (
          <View style={styles.indicator}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={[styles.indicatorText, { color: colors.textSecondary }]}>Located</Text>
          </View>
        )}
        {draft.category ? (
          <View style={[styles.categoryChip, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>{draft.category}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
};

export const DraftsScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<DraftsNavigationProp>();
  const [drafts, setDrafts] = useState<NoteDraft[]>([]);
  const draftService = DraftService.getInstance();

  const loadDrafts = useCallback(async () => {
    const loaded = await draftService.getDrafts();
    setDrafts(loaded);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, [loadDrafts])
  );

  const handlePress = (draft: NoteDraft) => {
    navigation.navigate('CreateNote', { draftId: draft.id });
  };

  const handleLongPress = (draft: NoteDraft) => {
    Alert.alert(
      'Delete Draft',
      `Delete "${draft.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await draftService.deleteDraft(draft.id);
            loadDrafts();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (drafts.length === 0) return;
    Alert.alert(
      'Clear All Drafts',
      `Delete all ${drafts.length} draft${drafts.length === 1 ? '' : 's'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            for (const draft of drafts) {
              await draftService.deleteDraft(draft.id);
            }
            setDrafts([]);
          },
        },
      ]
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No drafts</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Start writing a note and it will be saved automatically
      </Text>
    </View>
  );

  const renderDraftItem = useCallback(({ item }: { item: NoteDraft }) => (
    <DraftCard
      draft={item}
      onPress={handlePress}
      onLongPress={handleLongPress}
    />
  ), [handlePress, handleLongPress]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Drafts</Text>
        <TouchableOpacity
          onPress={handleClearAll}
          style={styles.clearButton}
          disabled={drafts.length === 0}
          accessibilityLabel="Clear all drafts"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.clearButtonText, { color: colors.warning }, drafts.length === 0 && styles.clearButtonDisabled]}>
            Clear All
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={drafts}
        keyExtractor={(item) => item.id}
        renderItem={renderDraftItem}
        contentContainerStyle={drafts.length === 0 ? styles.listEmpty : styles.list}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearButtonDisabled: {
    opacity: 0.4,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  listEmpty: {
    flex: 1,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
  },
  cardContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indicatorText: {
    fontSize: 12,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
