import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationState } from '../../domain/entities/Route';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, spacing, typography } from '../../utils/theme';

interface NavigationViewProps extends NavigationState {
  onStopNavigation: () => void;
  formatDistance: (meters: number) => string;
  formatDuration: (seconds: number) => string;
}

export const NavigationView: React.FC<NavigationViewProps> = ({
  route,
  currentStepIndex,
  distanceToNextStep,
  distanceRemaining,
  durationRemaining,
  isOnRoute,
  onStopNavigation,
  formatDistance,
  formatDuration,
}) => {
  const { colors } = useTheme();

  if (!route || !route.steps.length) return null;

  const currentStep = route.steps[currentStepIndex];
  const nextStep = route.steps[currentStepIndex + 1];

  const getManeuverIcon = (maneuver: string): keyof typeof Ionicons.glyphMap => {
    switch (maneuver) {
      case 'turn-left': return 'arrow-back';
      case 'turn-right': return 'arrow-forward';
      case 'arrive': return 'flag';
      case 'depart': return 'navigate';
      case 'roundabout': return 'repeat';
      default: return 'arrow-up';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      {!isOnRoute && (
        <View style={[styles.offRouteBanner, { backgroundColor: colors.error }]}>
          <Ionicons name="warning" size={16} color={colors.surface} />
          <Text style={[styles.offRouteText, { color: colors.surface }]}>Off route, recalculating</Text>
        </View>
      )}

      <View style={styles.mainInstruction}>
        <Ionicons
          name={getManeuverIcon(currentStep.maneuver)}
          size={32}
          color={colors.primary}
        />
        <View style={styles.instructionText}>
          <Text style={[styles.instruction, { color: colors.text }]}>{currentStep.instruction}</Text>
          {currentStep.name && (
            <Text style={[styles.streetName, { color: colors.textSecondary }]}>{currentStep.name}</Text>
          )}
        </View>
        <Text style={[styles.stepDistance, { color: colors.primary }]}>{formatDistance(distanceToNextStep)}</Text>
      </View>

      {nextStep && (
        <View style={[styles.nextStep, { borderTopColor: colors.border }]}>
          <Text style={[styles.nextLabel, { color: colors.textTertiary }]}>Then</Text>
          <Ionicons
            name={getManeuverIcon(nextStep.maneuver)}
            size={16}
            color={colors.textSecondary}
          />
          <Text style={[styles.nextInstruction, { color: colors.textSecondary }]} numberOfLines={1}>
            {nextStep.instruction}
          </Text>
        </View>
      )}

      <View style={styles.tripInfo}>
        <View style={styles.tripStat}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.tripValue, { color: colors.text }]}>{formatDuration(durationRemaining)}</Text>
        </View>
        <View style={styles.tripStat}>
          <Ionicons name="map-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.tripValue, { color: colors.text }]}>{formatDistance(distanceRemaining)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.stopButton, { backgroundColor: colors.error + '15' }]}
        onPress={onStopNavigation}
        accessibilityLabel="End navigation"
        accessibilityRole="button"
      >
        <Ionicons name="close-circle" size={20} color={colors.error} />
        <Text style={[styles.stopText, { color: colors.error }]}>End Navigation</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  offRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: 12,
  },
  offRouteText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  mainInstruction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  instructionText: {
    flex: 1,
  },
  instruction: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  streetName: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  stepDistance: {
    fontSize: 20,
    fontWeight: '700',
  },
  nextStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    marginBottom: 12,
  },
  nextLabel: {
    fontSize: typography.fontSize.xs,
  },
  nextInstruction: {
    flex: 1,
    fontSize: typography.fontSize.sm,
  },
  tripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  tripStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripValue: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: borderRadius.md,
  },
  stopText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
});
