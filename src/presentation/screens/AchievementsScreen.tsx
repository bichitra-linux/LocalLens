import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAchievements, useReputation } from '../hooks/useAchievements';
import { REPUTATION_LEVELS } from '../../domain/entities/Achievement';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, typography, ThemeColors } from '../../utils/theme';

const CATEGORIES = ['All', 'Notes', 'Votes', 'Comments', 'Social', 'Special'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_MAP: Record<Category, string | null> = {
  All: null,
  Notes: 'notes',
  Votes: 'votes',
  Comments: 'comments',
  Social: 'social',
  Special: 'special',
};

export const AchievementsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const { data: achievements, isLoading } = useAchievements();
  const { data: reputation } = useReputation();

  const filtered = achievements?.filter(
    a => !CATEGORY_MAP[selectedCategory] || a.category === CATEGORY_MAP[selectedCategory]
  );

  const nextLevel = REPUTATION_LEVELS.find(l => l.level === (reputation?.level ?? 0) + 1);
  const progressToNext = nextLevel
    ? Math.min(1, (reputation ? reputation.minPoints : 0) / nextLevel.minPoints)
    : 1;

  const renderItem = useCallback(({ item }: { item: NonNullable<typeof filtered>[number] }) => {
    const progressRatio = Math.min(1, item.progress / item.requirement);
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }, item.unlocked && [styles.cardUnlocked, { borderColor: colors.success + '40' }]]} accessibilityLabel={`${item.name}: ${item.description}`}>
        {item.unlocked ? (
          <View style={styles.badgeCheck}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </View>
        ) : (
          <View style={styles.badgeLock}>
            <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
          </View>
        )}
        <Ionicons
          name={item.icon as any}
          size={36}
          color={item.unlocked ? colors.primary : colors.textTertiary}
        />
        <Text style={[styles.cardName, { color: colors.text }, !item.unlocked && { color: colors.textTertiary }]}>
          {item.name}
        </Text>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={[styles.progressBarBackground, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressRatio * 100}%`,
                backgroundColor: item.unlocked ? colors.success : colors.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {Math.min(item.progress, item.requirement)}/{item.requirement}
        </Text>
      </View>
    );
  }, [colors]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Achievements</Text>
      </View>

      <View style={[styles.reputationCard, { backgroundColor: colors.surface }]}>
        <View style={styles.reputationHeader}>
          <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.levelNumber, { color: colors.surface }]}>{reputation?.level ?? 1}</Text>
          </View>
          <View style={styles.reputationInfo}>
            <Text style={[styles.reputationTitle, { color: colors.text }]}>{reputation?.title ?? 'Newcomer'}</Text>
            <Text style={[styles.reputationPoints, { color: colors.textSecondary }]}>
              {achievements?.reduce((sum, a) => sum + a.progress, 0) ?? 0} points
            </Text>
          </View>
        </View>
        {nextLevel && (
          <View style={styles.nextLevelContainer}>
            <Text style={[styles.nextLevelText, { color: colors.textSecondary }]}>
              {nextLevel.minPoints - (reputation?.minPoints ?? 0)} pts to {nextLevel.title}
            </Text>
            <View style={[styles.progressBarBackground, { backgroundColor: colors.border }]}>
              <View style={[styles.progressBarFill, { width: `${progressToNext * 100}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>
        )}
      </View>

      <View style={styles.tabsContainer}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.tab,
              { backgroundColor: colors.surface, borderColor: colors.border },
              selectedCategory === cat && [styles.tabActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
            ]}
            onPress={() => setSelectedCategory(cat)}
            accessibilityLabel={cat}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategory === cat }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.tabText, { color: colors.textSecondary }, selectedCategory === cat && [styles.tabTextActive, { color: colors.surface }]]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={renderItem}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  reputationCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  reputationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  levelNumber: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: '700',
  },
  reputationInfo: {
    flex: 1,
  },
  reputationTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  reputationPoints: {
    fontSize: 13,
    marginTop: 2,
  },
  nextLevelContainer: {
    marginTop: 4,
  },
  nextLevelText: {
    fontSize: 12,
    marginBottom: 6,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabActive: {
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.surface,
  },
  grid: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  cardUnlocked: {
    borderWidth: 1.5,
  },
  badgeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  badgeLock: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 15,
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
