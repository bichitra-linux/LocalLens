import * as Location from 'expo-location';
// Note: This utility imports from the presentation layer (Zustand store) for state updates.
// This is an intentional deviation from clean architecture for simplicity.
// In a production app, consider using an event emitter or callback pattern.
import { useAppStore } from '../presentation/store/appStore';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export class LocationService {
  private static instance: LocationService;
  private watchSubscription: Location.LocationSubscription | null = null;
  
  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        if (__DEV__) console.log('Foreground location permission not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<LocationCoordinates | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coordinates: LocationCoordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      // Update store
      useAppStore.getState().setLocation(coordinates);
      useAppStore.getState().setLocationSource(
        (location.coords.accuracy ?? 99) < 20 ? 'gps' : 'network'
      );
      
      return coordinates;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  async startWatchingLocation(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      if (this.watchSubscription) {
        this.stopWatchingLocation();
      }

      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 50, // Update every 50 meters
        },
        (location) => {
          const coordinates: LocationCoordinates = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
          };

          useAppStore.getState().setLocation(coordinates);
          useAppStore.getState().setLocationSource(
            (location.coords.accuracy ?? 99) < 20 ? 'gps' : 'network'
          );
        }
      );

      return true;
    } catch (error) {
      console.error('Error starting location watch:', error);
      return false;
    }
  }

  stopWatchingLocation(): void {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
  }

  async checkLocationEnabled(): Promise<boolean> {
    try {
      const isEnabled = await Location.hasServicesEnabledAsync();
      useAppStore.getState().setLocationEnabled(isEnabled);
      return isEnabled;
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

}

export const locationService = LocationService.getInstance();