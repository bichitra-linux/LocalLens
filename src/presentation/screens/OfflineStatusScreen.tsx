import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../../utils/theme';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAppStore } from '../store/appStore';
import { OfflineQueueService } from '../../utils/offlineQueue';
import { NoteCacheService } from '../../utils/noteCache';
import { BookmarkService } from '../../utils/bookmarks';
import { DraftService } from '../../utils/drafts';
import { RoutingService } from '../../utils/routing';
import { OfflineQueueStats } from '../../domain/entities/OfflineAction';
import { LocationIndicator } from '../components/LocationIndicator';

const queueService = OfflineQueueService.getInstance();
const noteCacheService = NoteCacheService.getInstance();
const bookmarkService = BookmarkService.getInstance();
const draftService = DraftService.getInstance();
const routingService = RoutingService.getInstance();

const createStyles = (colors: ThemeColors) => StyleSheet.create({
container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  connectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  cardAction: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  cardActionText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: 8,
  },
  refreshText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
});

const StatusCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  action?: { label: string; onPress: () => void };
  styles: ReturnType<typeof createStyles>;
}> = ({ icon, title, value, subtitle, color, action, styles }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    <Text style={[styles.cardValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
    {action && (
      <TouchableOpacity style={styles.cardAction} onPress={action.onPress} accessibilityLabel={action.label} accessibilityRole="button">
        <Text style={styles.cardActionText}>{action.label}</Text>
      </TouchableOpacity>
    )}
  </View>
);

export const OfflineStatusScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const network = useNetworkStatus();
  const { location, locationSource } = useAppStore();

  const [queueStats, setQueueStats] = useState<OfflineQueueStats>({ totalActions: 0, pendingActions: 0, failedActions: 0 });
  const [cacheSize, setCacheSize] = useState({ noteCount: 0, lastUpdated: null as string | null });
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [savedRouteCount, setSavedRouteCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [stats, cache, bookmarks, drafts, routes] = await Promise.all([
        queueService.getStats(),
        noteCacheService.getCacheSize(),
        bookmarkService.getBookmarks(),
        draftService.getDrafts(),
        routingService.getSavedRoutes(),
      ]);

      setQueueStats(stats);
      setCacheSize(cache);
      setBookmarkCount(bookmarks.length);
      setDraftCount(drafts.length);
      setSavedRouteCount(routes.length);
    } catch (error) {
      console.error('Error loading offline status:', error);
    }
  }, []);

  const handleClearQueue = useCallback(() => {
    Alert.alert('Clear Queue', 'Remove all pending sync actions?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await queueService.clearQueue();
          await loadData();
        },
      },
    ]);
  }, [colors]);

  const handleClearCache = useCallback(() => {
    Alert.alert('Clear Cache', 'Remove all cached notes?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await noteCacheService.clearCache();
          await loadData();
        },
      },
    ]);
  }, [colors]);

    return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Connection Status */}
        <View style={[styles.connectionCard, { backgroundColor: network.isOnline ? colors.success + '20' : colors.warning + '20' }]}>
          <Ionicons
            name={network.isOnline ? 'cloud-done' : 'cloud-offline'}
            size={32}
            color={network.isOnline ? colors.success : colors.warning}
          />
          <View style={styles.connectionInfo}>
            <Text style={styles.connectionTitle}>
              {network.isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text style={styles.connectionSubtitle}>
              {network.isOnline
                ? `Connected via ${network.connectionType}`
                : 'No internet connection'}
            </Text>
          </View>
        </View>

        {/* GPS Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <LocationIndicator showLabel />
            </View>
            {location.latitude !== null && location.longitude !== null ? (
              <>
                <Text style={styles.cardValue}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
                <Text style={styles.cardSubtitle}>
                  Source: {locationSource === 'gps' ? 'GPS (satellite)' : locationSource === 'network' ? 'Network' : 'Unknown'} | 
                  Accuracy: {location.accuracy ? `${Math.round(location.accuracy)}m` : 'Unknown'}
                </Text>
              </>
            ) : (
              <Text style={styles.cardSubtitle}>Waiting for location...</Text>
            )}
          </View>
        </View>

        {/* Offline Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offline Data</Text>
          
          <StatusCard
            icon="document-text-outline"
            title="Cached Notes"
            value={cacheSize.noteCount}
            subtitle={cacheSize.lastUpdated ? `Last updated: ${new Date(cacheSize.lastUpdated).toLocaleDateString()}` : 'Never cached'}
            color={colors.primary}
            action={{ label: 'Clear Cache', onPress: handleClearCache }}
            styles={styles}
          />

          <StatusCard
            icon="bookmark-outline"
            title="Bookmarks"
            value={bookmarkCount}
            subtitle="Available offline"
            color={colors.warning}
            styles={styles}
          />

          <StatusCard
            icon="create-outline"
            title="Drafts"
            value={draftCount}
            subtitle="Auto-saved locally"
            color={colors.primary}
            styles={styles}
          />

          <StatusCard
            icon="navigate-outline"
            title="Saved Routes"
            value={savedRouteCount}
            subtitle="Available for offline navigation"
            color={colors.success}
            styles={styles}
          />
        </View>

        {/* Sync Queue */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Queue</Text>
          
          <StatusCard
            icon="sync-outline"
            title="Pending Actions"
            value={queueStats.pendingActions}
            subtitle={
              queueStats.failedActions > 0
                ? `${queueStats.failedActions} failed`
                : 'Will sync when online'
            }
            color={queueStats.failedActions > 0 ? colors.error : colors.primary}
            action={
              queueStats.totalActions > 0
                ? { label: 'Clear Queue', onPress: handleClearQueue }
                : undefined
            }
            styles={styles}
          />
        </View>

        {/* Refresh button */}
        <TouchableOpacity style={styles.refreshButton} onPress={loadData} accessibilityLabel="Refresh status" accessibilityRole="button">
          <Ionicons name="refresh" size={20} color={colors.primary} />
          <Text style={styles.refreshText}>Refresh Status</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
