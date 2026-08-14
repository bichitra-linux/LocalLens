import ngeohash from 'ngeohash';

export const GEOHASH_PRECISION = 7; // ~150m precision
export const SEARCH_RADIUS_KM = 5; // Default search radius

// Approximate geohash cell width in km per precision (ngeohash)
const PRECISION_WIDTH_KM: Record<number, number> = {
  1: 5000,
  2: 1250,
  3: 156,
  4: 39.1,
  5: 4.89,
  6: 1.22,
  7: 0.153,
};

/**
 * Pick geohash precision so the 3x3 neighbor block fully covers the search radius.
 * (block extends 1.5 cells from the center point, so cell width >= radius / 1.5)
 */
export const getPrecisionForRadius = (radiusKm: number): number => {
  for (let p = GEOHASH_PRECISION; p >= 2; p--) {
    if (radiusKm <= PRECISION_WIDTH_KM[p] * 1.5) return p;
  }
  return 2;
};

/**
 * Generate geohash for coordinates
 */
export const generateGeohash = (latitude: number, longitude: number): string => {
  return ngeohash.encode(latitude, longitude, GEOHASH_PRECISION);
};

/**
 * Generate geohash prefixes for range queries
 * This enables efficient radius-based queries in Firestore
 */
export const generateGeohashPrefixes = (geohash: string): string[] => {
  const prefixes: string[] = [];
  for (let i = 1; i <= geohash.length; i++) {
    prefixes.push(geohash.substring(0, i));
  }
  return prefixes;
};

/**
 * Get neighboring geohashes for a given coordinate
 * Used for expanding search area for better coverage
 */
export const getNeighboringGeohashes = (
  latitude: number,
  longitude: number,
  precision: number = GEOHASH_PRECISION
): string[] => {
  const center = ngeohash.encode(latitude, longitude, precision);
  const neighbors = ngeohash.neighbors(center);
  
  return [
    center,
    ...Object.values(neighbors)
  ];
};

/**
 * Calculate distance between two coordinates in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

