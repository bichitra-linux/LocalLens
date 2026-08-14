import {
  generateGeohash,
  generateGeohashPrefixes,
  getNeighboringGeohashes,
  getPrecisionForRadius,
  calculateDistance,
} from '../utils/geospatial';
import ngeohash from 'ngeohash';

describe('Geospatial Utilities', () => {
  describe('generateGeohash', () => {
    it('should generate a 7-character geohash by default', () => {
      const geohash = generateGeohash(40.7128, -74.006);
      expect(geohash).toHaveLength(7);
    });

    it('should generate consistent geohash for same coordinates', () => {
      const hash1 = generateGeohash(40.7128, -74.006);
      const hash2 = generateGeohash(40.7128, -74.006);
      expect(hash1).toBe(hash2);
    });

    it('should generate different geohashes for different coordinates', () => {
      const hash1 = generateGeohash(40.7128, -74.006);
      const hash2 = generateGeohash(51.5074, -0.1278);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateGeohashPrefixes', () => {
    it('should generate prefixes of all lengths', () => {
      const prefixes = generateGeohashPrefixes('dr5regp');
      expect(prefixes).toEqual(['d', 'dr', 'dr5', 'dr5r', 'dr5re', 'dr5reg', 'dr5regp']);
    });
  });

  describe('getNeighboringGeohashes', () => {
    it('should return 9 geohashes (center + 8 neighbors)', () => {
      const geohashes = getNeighboringGeohashes(40.7128, -74.006);
      expect(geohashes).toHaveLength(9);
    });
  });

  describe('getPrecisionForRadius', () => {
    it('should pick a precision whose 3x3 block covers the radius', () => {
      const cases: [number, number][] = [
        [5, 5],    // default radius -> precision 5 (~4.9km cells)
        [0.5, 6],  // small radius -> precision 6 (~1.2km cells)
        [20, 4],   // large radius -> precision 4 (~39km cells)
      ];
      for (const [radiusKm, expectedPrecision] of cases) {
        expect(getPrecisionForRadius(radiusKm)).toBe(expectedPrecision);
      }
    });

    it('should cover a 5km radius: every point inside the radius is inside the queried box', () => {
      const lat = 40.7128;
      const lng = -74.006;
      const precision = getPrecisionForRadius(5);
      const box = getNeighboringGeohashes(lat, lng, precision);

      // A note exactly 4.9km away (within the 5km radius) must land in the box
      const offset = 4.9 / 111.32; // degrees latitude for 4.9km
      const farLat = lat + offset;
      const farHash = ngeohash.encode(farLat, lng, precision);

      expect(box).toContain(farHash);
    });
  });

  describe('calculateDistance', () => {
    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(distance).toBe(0);
    });

    it('should calculate approximate distance between NYC and London', () => {
      const distance = calculateDistance(40.7128, -74.006, 51.5074, -0.1278);
      expect(distance).toBeGreaterThan(5500);
      expect(distance).toBeLessThan(5600);
    });

    it('should calculate distance in kilometers', () => {
      const distance = calculateDistance(40.7128, -74.006, 40.7580, -73.9855);
      expect(distance).toBeGreaterThan(5);
      expect(distance).toBeLessThan(7);
    });
  });
});
