import { Platform } from 'react-native';

// MapLibre style URLs - all free, no API key required
export const MAP_STYLES = {
  // Default style for general use
  default: 'https://demotiles.maplibre.org/style.json',
  // OpenFreeMap styles (community-maintained, free)
  streets: 'https://tiles.openfreemap.org/styles/liberty',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  positron: 'https://tiles.openfreemap.org/styles/positron',
};

// Default map configuration
export const DEFAULT_CENTER: [number, number] = [-74.006, 40.7128]; // NYC
export const DEFAULT_ZOOM = 12;
export const MIN_ZOOM = 2;
export const MAX_ZOOM = 20;

// Offline pack defaults
export const DEFAULT_PACK_MIN_ZOOM = 10;
export const DEFAULT_PACK_MAX_ZOOM = 16;

// Preset regions for offline download
export interface MapRegionPreset {
  id: string;
  name: string;
  description: string;
  bounds: [number, number, number, number]; // [west, south, east, north]
  estimatedSizeMB: number;
}

export const PRESET_REGIONS: MapRegionPreset[] = [
  {
    id: 'nyc',
    name: 'New York City',
    description: 'Manhattan, Brooklyn, Queens, Bronx, Staten Island',
    bounds: [-74.259, 40.477, -73.700, 40.918],
    estimatedSizeMB: 35,
  },
  {
    id: 'sf',
    name: 'San Francisco',
    description: 'San Francisco Bay Area',
    bounds: [-122.52, 37.70, -122.35, 37.83],
    estimatedSizeMB: 20,
  },
  {
    id: 'london',
    name: 'London',
    description: 'Greater London area',
    bounds: [-0.51, 51.28, 0.34, 51.69],
    estimatedSizeMB: 40,
  },
  {
    id: 'la',
    name: 'Los Angeles',
    description: 'Los Angeles metropolitan area',
    bounds: [-118.52, 33.70, -118.15, 34.34],
    estimatedSizeMB: 45,
  },
  {
    id: 'chicago',
    name: 'Chicago',
    description: 'Chicago metropolitan area',
    bounds: [-87.94, 41.64, -87.52, 42.02],
    estimatedSizeMB: 25,
  },
  {
    id: 'paris',
    name: 'Paris',
    description: 'Paris and surrounding area',
    bounds: [2.22, 48.81, 2.47, 48.90],
    estimatedSizeMB: 20,
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    description: 'Tokyo metropolitan area',
    bounds: [139.50, 35.50, 139.95, 35.85],
    estimatedSizeMB: 40,
  },
];

// Get the appropriate style URL for the current platform
export const getMapStyle = (): string => {
  // Demo style in dev, real streets style in production (also used for offline packs)
  return __DEV__ ? MAP_STYLES.default : MAP_STYLES.streets;
};


