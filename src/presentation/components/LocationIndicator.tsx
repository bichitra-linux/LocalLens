import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../hooks/useTheme';
import { typography } from '../../utils/theme';

interface LocationIndicatorProps {
  showLabel?: boolean;
}

export const LocationIndicator: React.FC<LocationIndicatorProps> = ({ showLabel = false }) => {
  const { colors } = useTheme();
  const { location, locationSource } = useAppStore();

  const getSignalStrength = (): 'strong' | 'medium' | 'weak' | 'none' => {
    if (!location.accuracy) return 'none';
    if (location.accuracy < 10) return 'strong';
    if (location.accuracy < 30) return 'medium';
    return 'weak';
  };

  const strength = getSignalStrength();

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    if (locationSource === 'gps') {
      switch (strength) {
        case 'strong': return 'navigate';
        case 'medium': return 'navigate-outline';
        case 'weak': return 'compass-outline';
        default: return 'location-outline';
      }
    }
    return 'wifi-outline';
  };

  const getColor = (): string => {
    switch (strength) {
      case 'strong': return colors.success;
      case 'medium': return colors.warning;
      case 'weak': return colors.error;
      default: return colors.textTertiary;
    }
  };

  const getLabel = (): string => {
    if (!location.accuracy) return 'No signal';
    if (locationSource === 'gps') {
      return `GPS ${Math.round(location.accuracy)}m`;
    }
    return `Network ${Math.round(location.accuracy)}m`;
  };

  return (
    <View style={styles.container}>
      <Ionicons name={getIcon()} size={16} color={getColor()} />
      {showLabel && (
        <Text style={[styles.label, { color: getColor() }]}>{getLabel()}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
});
