import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCompassData, formatDistance, formatDuration } from '../../utils/compassNavigation';
import { LatLng } from '../../domain/entities/Route';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../hooks/useTheme';
import { typography } from '../../utils/theme';

interface CompassNavigationProps {
  destination: LatLng;
  destinationName?: string;
}

export const CompassNavigation: React.FC<CompassNavigationProps> = ({
  destination,
  destinationName,
}) => {
  const { colors } = useTheme();
  const { location } = useAppStore();

  if (location.latitude === null || location.longitude === null) {
    return (
      <View style={styles.container}>
        <Ionicons name="compass-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.waitingText, { color: colors.textTertiary }]}>Waiting for GPS signal...</Text>
      </View>
    );
  }

  const currentLocation: LatLng = {
    latitude: location.latitude,
    longitude: location.longitude,
  };

  const compass = getCompassData(currentLocation, destination);

  return (
    <View style={styles.container}>
      <View style={[styles.compassRing, { borderColor: colors.primary, backgroundColor: colors.primary + '0D' }]}>
        <View style={[styles.arrow, { transform: [{ rotate: `${compass.bearing}deg` }] }]}>
          <Ionicons name="navigate" size={48} color={colors.primary} />
        </View>
      </View>

      <View style={styles.info}>
        {destinationName && (
          <Text style={[styles.destination, { color: colors.text }]}>{destinationName}</Text>
        )}
        <Text style={[styles.direction, { color: colors.primary }]}>Heading {compass.direction}</Text>
        <Text style={[styles.distance, { color: colors.text }]}>{formatDistance(compass.distance)}</Text>
        <Text style={[styles.eta, { color: colors.textSecondary }]}>~{formatDuration(compass.estimatedTime)} walking</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
  },
  compassRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  arrow: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    alignItems: 'center',
    gap: 4,
  },
  destination: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: 8,
  },
  direction: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
  },
  distance: {
    fontSize: 28,
    fontWeight: '700',
  },
  eta: {
    fontSize: typography.fontSize.sm,
  },
  waitingText: {
    fontSize: typography.fontSize.md,
    marginTop: 12,
  },
});
