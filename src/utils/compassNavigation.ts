import * as turf from '@turf/turf';
import { LatLng } from '../domain/entities/Route';

export interface CompassData {
  bearing: number;          // degrees from north (0-360)
  distance: number;         // meters to destination
  direction: string;        // N, NE, E, SE, S, SW, W, NW
  estimatedTime: number;    // seconds (assuming walking speed 5km/h)
}

// Calculate bearing from current location to destination
export const calculateBearing = (from: LatLng, to: LatLng): number => {
  const fromPoint = turf.point([from.longitude, from.latitude]);
  const toPoint = turf.point([to.longitude, to.latitude]);
  return turf.bearing(fromPoint, toPoint);
};

// Calculate distance from current location to destination
export const calculateDistanceToDestination = (from: LatLng, to: LatLng): number => {
  const fromPoint = turf.point([from.longitude, from.latitude]);
  const toPoint = turf.point([to.longitude, to.latitude]);
  return turf.distance(fromPoint, toPoint, { units: 'meters' });
};

// Get compass direction string from bearing
export const getDirectionFromBearing = (bearing: number): string => {
  const normalized = ((bearing % 360) + 360) % 360;
  
  if (normalized >= 337.5 || normalized < 22.5) return 'N';
  if (normalized >= 22.5 && normalized < 67.5) return 'NE';
  if (normalized >= 67.5 && normalized < 112.5) return 'E';
  if (normalized >= 112.5 && normalized < 157.5) return 'SE';
  if (normalized >= 157.5 && normalized < 202.5) return 'S';
  if (normalized >= 202.5 && normalized < 247.5) return 'SW';
  if (normalized >= 247.5 && normalized < 292.5) return 'W';
  return 'NW';
};

// Get full compass data for navigation
export const getCompassData = (currentLocation: LatLng, destination: LatLng): CompassData => {
  const bearing = calculateBearing(currentLocation, destination);
  const distance = calculateDistanceToDestination(currentLocation, destination);
  const direction = getDirectionFromBearing(bearing);
  
  // Estimate time assuming walking speed (5 km/h = 1.39 m/s)
  const walkingSpeed = 1.39;
  const estimatedTime = distance / walkingSpeed;

  return {
    bearing: ((bearing % 360) + 360) % 360,
    distance,
    direction,
    estimatedTime,
  };
};

// Format distance for display
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

// Format duration for display
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return '< 1 min';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

// Check if user has arrived at destination (within threshold)
export const hasArrived = (currentLocation: LatLng, destination: LatLng, thresholdMeters: number = 20): boolean => {
  const distance = calculateDistanceToDestination(currentLocation, destination);
  return distance <= thresholdMeters;
};


