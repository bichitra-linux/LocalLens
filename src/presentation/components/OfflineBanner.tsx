import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTheme } from '../hooks/useTheme';
import { OfflineQueueService } from '../../utils/offlineQueue';
import { OfflineQueueStats } from '../../domain/entities/OfflineAction';
import { borderRadius, spacing, typography } from '../../utils/theme';

const queueService = OfflineQueueService.getInstance();

export const OfflineBanner: React.FC = () => {
  const { colors } = useTheme();
  const { isOnline, connectionType } = useNetworkStatus();
  const [stats, setStats] = useState<OfflineQueueStats>({
    totalActions: 0,
    pendingActions: 0,
    failedActions: 0,
  });
  const [expanded, setExpanded] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-60)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateStats = async () => {
    const currentStats = await queueService.getStats();
    setStats(currentStats);
  };

  useEffect(() => {
    updateStats();

    const shouldPoll = !isOnline || stats.pendingActions > 0;
    if (shouldPoll) {
      intervalRef.current = setInterval(updateStats, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOnline, stats.pendingActions]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOnline ? -60 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [isOnline, slideAnim]);

  if (isOnline && stats.pendingActions === 0) return null;

  const getStatusColor = (): string => {
    if (isOnline) return colors.success;
    if (stats.failedActions > 0) return colors.error;
    return colors.warning;
  };

  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isOnline) return 'cloud-done';
    if (connectionType === 'cellular') return 'cellular';
    return 'cloud-offline';
  };

  const getStatusText = (): string => {
    if (isOnline && stats.pendingActions > 0) {
      return `Syncing ${stats.pendingActions} action${stats.pendingActions > 1 ? 's' : ''}...`;
    }
    return 'Offline Mode';
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity
        style={[styles.banner, { backgroundColor: getStatusColor() }]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
        accessibilityLabel={getStatusText()}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.content}>
          <Ionicons name={getStatusIcon()} size={18} color={colors.surface} />
          <Text style={[styles.statusText, { color: colors.surface }]}>{getStatusText()}</Text>
          {stats.pendingActions > 0 && (
            <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <Text style={[styles.badgeText, { color: colors.surface }]}>{stats.pendingActions}</Text>
            </View>
          )}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.surface}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.details, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.detailRow}>
            <Ionicons name="cloud-offline-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {isOnline ? 'Connected' : 'No internet connection'}
            </Text>
          </View>
          {stats.pendingActions > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color={colors.warning} />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {stats.pendingActions} action{stats.pendingActions > 1 ? 's' : ''} waiting to sync
              </Text>
            </View>
          )}
          {stats.failedActions > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {stats.failedActions} action{stats.failedActions > 1 ? 's' : ''} failed
              </Text>
            </View>
          )}
          <Text style={[styles.hintText, { color: colors.textTertiary }]}>
            Notes, votes, and comments will sync when you're back online
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  banner: {
    paddingTop: 48,
    paddingBottom: 8,
    paddingHorizontal: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  details: {
    padding: 12,
    borderBottomWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
  },
  hintText: {
    fontSize: typography.fontSize.xs,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
