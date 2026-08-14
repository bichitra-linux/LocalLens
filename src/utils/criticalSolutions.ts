import { AppState, AppStateStatus } from 'react-native';
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

    // Remove any previous subscription before adding a new one
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

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




