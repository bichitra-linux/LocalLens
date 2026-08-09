import React, { memo, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NoteCategory, getCategoryById } from '../../domain/entities/Category';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, typography } from '../../utils/theme';

interface CategoryChipProps {
  category: NoteCategory;
  selected?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium';
}

export const CategoryChip: React.FC<CategoryChipProps> = memo(({
  category,
  selected = false,
  onPress,
  size = 'medium'
}) => {
  const { colors } = useTheme();
  const info = getCategoryById(category);
  const isSmall = size === 'small';

  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        isSmall && styles.chipSmall,
        { borderColor: colors.border, backgroundColor: colors.surface },
        selected && { backgroundColor: info.color, borderColor: info.color },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={info.label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={isSmall ? { top: 10, bottom: 10, left: 10, right: 10 } : undefined}
    >
      <Ionicons
        name={info.icon as any}
        size={isSmall ? 12 : 16}
        color={selected ? colors.surface : info.color}
      />
      <Text style={[
        styles.label,
        isSmall && styles.labelSmall,
        { color: colors.text },
        selected && { color: colors.surface },
      ]}>
        {info.label}
      </Text>
    </TouchableOpacity>
  );
});

CategoryChip.displayName = 'CategoryChip';

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  chipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  labelSmall: {
    fontSize: 11,
  },
});
