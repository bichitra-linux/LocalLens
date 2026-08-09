import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';
import { useAppStore } from '../presentation/store/appStore';
import { queryClient } from '../presentation/store/queryClient';
import { noteKeys } from '../presentation/hooks/useNotes';
import { calculateDistance } from './geospatial';

/**
 * CHALLENGE 1: Efficient Geospatial Polling
 *
 * Problem: Continuously querying for notes in a geographic area is expensive
 * Solution: Implement intelligent polling with geohash-based queries
 */

export class GeospatialPollingService {
  private static instance: GeospatialPollingService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastPolledLocation: { latitude: number; longitude: number } | null = null;
  private readonly POLLING_INTERVAL = 30000;
  private readonly MIN_DISTANCE_FOR_POLL = 100;
  private appStateSubscription: { remove: () => void } | null = null;

  static getInstance(): GeospatialPollingService {
    if (!GeospatialPollingService.instance) {
      GeospatialPollingService.instance = new GeospatialPollingService();
    }
    return GeospatialPollingService.instance;
  }

  startIntelligentPolling(): void {
    this.stopPolling();

    this.pollingInterval = setInterval(() => {
      this.intelligentPoll();
    }, this.POLLING_INTERVAL);

    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  destroy(): void {
    this.stopPolling();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  private async intelligentPoll(): Promise<void> {
    const { location, searchRadius } = useAppStore.getState();

    if (location.latitude === null || location.longitude === null) {
      return;
    }

    if (this.lastPolledLocation) {
      const distance = calculateDistance(
        this.lastPolledLocation.latitude,
        this.lastPolledLocation.longitude,
        location.latitude,
        location.longitude
      );

      if (distance * 1000 < this.MIN_DISTANCE_FOR_POLL) {
        return;
      }
    }

    this.lastPolledLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
    };

    await queryClient.invalidateQueries({
      queryKey: noteKeys.nearby(location.latitude, location.longitude, searchRadius),
    });
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active') {
      this.startIntelligentPolling();
    } else {
      this.stopPolling();
    }
  };
}

/**
 * CHALLENGE 2: Offline Creation and Sync
 *
 * Problem: Users need to create notes without internet connectivity
 * Solution: Implement offline-first architecture with sync queue
 */

interface OfflineNote {
  id: string;
  content: string;
  location: { latitude: number; longitude: number };
  expiresInDays: number;
  createdAt: string;
  synced: boolean;
}

export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private readonly OFFLINE_NOTES_KEY = 'locallens_offline_notes';
  private syncInProgress = false;
  private netInfoUnsubscribe: NetInfoSubscription | null = null;
  private appStateSubscription: { remove: () => void } | null = null;

  static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  async queueOfflineNote(note: Omit<OfflineNote, 'id' | 'createdAt' | 'synced'>): Promise<string> {
    const offlineNote: OfflineNote = {
      ...note,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    try {
      const existingNotes = await this.getOfflineNotes();
      const updatedNotes = [...existingNotes, offlineNote];

      await AsyncStorage.setItem(
        this.OFFLINE_NOTES_KEY,
        JSON.stringify(updatedNotes)
      );

      this.attemptSync();

      return offlineNote.id;
    } catch (error) {
      console.error('Failed to queue offline note:', error);
      throw error;
    }
  }

  async getOfflineNotes(): Promise<OfflineNote[]> {
    try {
      const notesJson = await AsyncStorage.getItem(this.OFFLINE_NOTES_KEY);
      return notesJson ? JSON.parse(notesJson) : [];
    } catch (error) {
      console.error('Failed to get offline notes:', error);
      return [];
    }
  }

  async attemptSync(): Promise<void> {
    if (this.syncInProgress) return;

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    this.syncInProgress = true;
    try {
      // Just clean up old synced notes - actual sync is handled by OfflineQueueService
      await this.cleanupSyncedNotes();
    } finally {
      this.syncInProgress = false;
    }
  }

  private async cleanupSyncedNotes(): Promise<void> {
    const notes = await this.getOfflineNotes();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    const filteredNotes = notes.filter(note =>
      !note.synced || new Date(note.createdAt) > cutoffDate
    );

    await AsyncStorage.setItem(
      this.OFFLINE_NOTES_KEY,
      JSON.stringify(filteredNotes)
    );
  }

  setupAutoSync(): void {
    this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        this.attemptSync();
      }
    });

    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        this.attemptSync();
      }
    });
  }

  destroy(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}



