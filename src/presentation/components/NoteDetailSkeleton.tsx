import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export const NoteDetailSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={[styles.avatar, { backgroundColor: colors.border }]} />
        <View style={styles.headerText}>
          <View style={[styles.usernameLine, { backgroundColor: colors.border }]} />
          <View style={[styles.timestampLine, { backgroundColor: colors.border }]} />
        </View>
      </View>

      <View style={[styles.content, { backgroundColor: colors.surface }]}>
        <View style={[styles.line1, { backgroundColor: colors.border }]} />
        <View style={[styles.line2, { backgroundColor: colors.border }]} />
        <View style={[styles.line3, { backgroundColor: colors.border, width: '60%' }]} />
      </View>

      <View style={[styles.actions, { backgroundColor: colors.surface }]}>
        <View style={[styles.voteButton, { backgroundColor: colors.border }]} />
        <View style={[styles.voteButton, { backgroundColor: colors.border }]} />
        <View style={[styles.navigateButton, { backgroundColor: colors.border }]} />
      </View>

      <View style={[styles.commentsSection, { backgroundColor: colors.surface }]}>
        <View style={[styles.commentTitle, { backgroundColor: colors.border }]} />
        <View style={[styles.comment1, { backgroundColor: colors.border }]} />
        <View style={[styles.comment2, { backgroundColor: colors.border }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerText: {
    flex: 1,
    gap: 8,
  },
  usernameLine: {
    width: '60%',
    height: 14,
    borderRadius: 4,
  },
  timestampLine: {
    width: '40%',
    height: 10,
    borderRadius: 3,
  },
  content: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  line1: {
    width: '100%',
    height: 16,
    borderRadius: 4,
  },
  line2: {
    width: '95%',
    height: 16,
    borderRadius: 4,
  },
  line3: {
    height: 16,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'center',
  },
  voteButton: {
    width: 60,
    height: 36,
    borderRadius: 18,
  },
  navigateButton: {
    flex: 1,
    height: 36,
    borderRadius: 18,
  },
  commentsSection: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  commentTitle: {
    width: '30%',
    height: 18,
    borderRadius: 4,
  },
  comment1: {
    width: '100%',
    height: 60,
    borderRadius: 8,
  },
  comment2: {
    width: '100%',
    height: 60,
    borderRadius: 8,
  },
});