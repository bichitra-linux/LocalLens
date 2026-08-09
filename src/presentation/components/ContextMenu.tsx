import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, spacing, typography } from '../../utils/theme';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  visible: boolean;
  items: ContextMenuItem[];
  onSelect: (item: ContextMenuItem) => void;
  onClose: () => void;
  title?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  items,
  onSelect,
  onClose,
  title,
}) => {
  const { colors } = useTheme();

  const handleSelect = useCallback((item: ContextMenuItem) => {
    if (!item.disabled) {
      onSelect(item);
      onClose();
    }
  }, [onSelect, onClose]);

  // Handle Android back button
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible) return;

    const handleBack = () => {
      onCloseRef.current();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => subscription.remove();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View 
          style={[
            styles.menu, 
            { 
              backgroundColor: colors.surface,
              shadowColor: colors.shadow,
            }
          ]}
        >
          {title && (
            <View style={[styles.titleContainer, { borderBottomColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
            </View>
          )}

          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.item,
                { borderBottomColor: colors.border },
                item.disabled && styles.itemDisabled,
              ]}
              onPress={() => handleSelect(item)}
              disabled={item.disabled}
              activeOpacity={0.7}
            >
              {item.icon && (
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={item.destructive ? colors.error : colors.textSecondary}
                />
              )}
              <Text
                style={[
                  styles.itemLabel,
                  { color: item.destructive ? colors.error : colors.text },
                  item.disabled && { color: colors.textTertiary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 100,
  },
  menu: {
    width: '90%',
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  titleContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    flex: 1,
  },
});