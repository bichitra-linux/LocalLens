import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../hooks/useTheme';

import { NoteCacheService } from '../../utils/noteCache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../store/appStore';
import { useDeleteAccount } from '../hooks/useAuth';

const THEMES = ['Light', 'Dark', 'System'] as const;

export const SettingsScreen: React.FC = () => {
  const {
    theme,
    setTheme,
    searchRadius,
    setSearchRadius,
    defaultExpirationDays,
    setDefaultExpirationDays,
    notificationsEnabled,
    setNotificationsEnabled,
    autoSyncEnabled,
    setAutoSyncEnabled,
    cacheWifiOnly,
    setCacheWifiOnly,
    personalizedAds,
    setPersonalizedAds,
  } = useSettingsStore();
  const { colors } = useTheme();
  const { user, clearUser } = useAppStore();
  const deleteAccountMutation = useDeleteAccount();

  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all locally cached notes and offline data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await NoteCacheService.getInstance().clearCache();
              await AsyncStorage.removeItem('locallens_offline_notes');
              await AsyncStorage.removeItem('locallens_bookmarks');
              await AsyncStorage.removeItem('locallens_drafts');
              Alert.alert('Success', 'Cache cleared successfully.');
            } catch {
              Alert.alert('Error', 'Failed to clear cache.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (!deleteEmail || !deletePassword) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    if (deleteEmail !== user.email) {
      Alert.alert('Error', 'Email address does not match');
      return;
    }

    try {
      await deleteAccountMutation.mutateAsync({
        userId: user.id,
        email: deleteEmail,
        password: deletePassword,
      });

      clearUser();
      setShowDeleteConfirm(false);
      Alert.alert(
        'Account Deleted',
        'Your account has been permanently deleted. We are sorry to see you go.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Deletion Failed',
        error.message || 'Failed to delete account. Please try again.'
      );
    }
  };

  const adjustSearchRadius = (delta: number) => {
    const next = Math.min(50, Math.max(1, searchRadius + delta));
    setSearchRadius(next);
  };

  const adjustExpiration = (delta: number) => {
    const next = Math.min(30, Math.max(1, defaultExpirationDays + delta));
    setDefaultExpirationDays(next);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Appearance */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="color-palette-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Theme</Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>Select your preferred appearance</Text>
            </View>
          </View>
          <View style={styles.themeRow}>
            {THEMES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.themeButton, theme === t.toLowerCase() && [styles.themeButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }], { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setTheme(t.toLowerCase() as 'light' | 'dark' | 'system')}
                accessibilityLabel={t}
                accessibilityRole="button"
                accessibilityState={{ selected: theme === t.toLowerCase() }}
              >
  <Text
    style={[styles.themeButtonText, theme === t.toLowerCase() && styles.themeButtonTextActive]}
  >
    {t}
  </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Discovery */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Discovery</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="search-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Search Radius</Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>How far to look for local notes</Text>
            </View>
            <Text style={[styles.valueLabel, { color: colors.primary }]}>{searchRadius} km</Text>
          </View>
          <View style={styles.sliderRow}>
            <TouchableOpacity style={[styles.sliderButton, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => adjustSearchRadius(-1)} accessibilityLabel="Decrease search radius" accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="remove" size={20} color={colors.primary} />
            </TouchableOpacity>
            <View style={[styles.sliderTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.sliderFill, { width: `${((searchRadius - 1) / 49) * 100}%`, backgroundColor: colors.primary }]} />
              <View style={[styles.sliderThumb, { left: `${((searchRadius - 1) / 49) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
            <TouchableOpacity style={[styles.sliderButton, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => adjustSearchRadius(1)} accessibilityLabel="Increase search radius" accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="time-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Note Expiration</Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>Default days before notes expire</Text>
            </View>
            <Text style={[styles.valueLabel, { color: colors.primary }]}>{defaultExpirationDays} d</Text>
          </View>
          <View style={styles.sliderRow}>
            <TouchableOpacity style={[styles.sliderButton, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => adjustExpiration(-1)} accessibilityLabel="Decrease expiration" accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="remove" size={20} color={colors.primary} />
            </TouchableOpacity>
            <View style={[styles.sliderTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.sliderFill, { width: `${((defaultExpirationDays - 1) / 29) * 100}%`, backgroundColor: colors.primary }]} />
              <View style={[styles.sliderThumb, { left: `${((defaultExpirationDays - 1) / 29) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
            <TouchableOpacity style={[styles.sliderButton, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => adjustExpiration(1)} accessibilityLabel="Increase expiration" accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Data & Sync */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Data & Sync</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Notifications</Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>Receive alerts for nearby notes</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="sync-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Auto-Sync</Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>Automatically sync notes in background</Text>
            </View>
            <Switch
              value={autoSyncEnabled}
              onValueChange={setAutoSyncEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="wifi-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Cache on WiFi Only</Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>Save mobile data by caching on WiFi</Text>
            </View>
            <Switch
              value={cacheWifiOnly}
              onValueChange={setCacheWifiOnly}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.row} onPress={handleClearCache} accessibilityLabel="Clear local cache" accessibilityRole="button">
            <View style={styles.iconContainer}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.error }]}>Clear Local Cache</Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>Remove all cached notes and offline data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity 
            style={styles.row} 
            onPress={() => setShowDeleteConfirm(true)} 
            accessibilityLabel="Delete account" 
            accessibilityRole="button"
          >
            <View style={styles.iconContainer}>
              <Ionicons name="remove-circle-outline" size={22} color={colors.error} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.error }]}>Delete Account</Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>Permanently delete your account and all data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Privacy & Ads */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Privacy & Ads</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Personalized Ads</Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>Allow ad personalization based on your activity</Text>
            </View>
            <Switch
              value={personalizedAds}
              onValueChange={setPersonalizedAds}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        {/* About */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>About</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>App Version</Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>LocalLens</Text>
            </View>
            <Text style={[styles.valueLabel, { color: colors.primary }]}>1.0.4</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="code-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Build</Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>React Native / Expo</Text>
            </View>
            <Text style={[styles.valueLabel, { color: colors.primary }]}>2026.05</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: colors.error + '1A' }]}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            </View>
            
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Account?</Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              This action is permanent and will delete:
            </Text>
            
            <View style={styles.deleteList}>
              <View style={styles.deleteListItem}>
                <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                <Text style={[styles.deleteListItemText, { color: colors.text }]}>All your notes</Text>
              </View>
              <View style={styles.deleteListItem}>
                <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                <Text style={[styles.deleteListItemText, { color: colors.text }]}>All your comments and votes</Text>
              </View>
              <View style={styles.deleteListItem}>
                <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                <Text style={[styles.deleteListItemText, { color: colors.text }]}>Your profile and achievements</Text>
              </View>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Your email address"
              placeholderTextColor={colors.textTertiary}
              value={deleteEmail}
              onChangeText={setDeleteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              accessibilityLabel="Email address"
            />

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              accessibilityLabel="Password"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={deleteAccountMutation.isPending}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton, { backgroundColor: colors.error }]}
                onPress={handleDeleteAccount}
                disabled={deleteAccountMutation.isPending}
              >
                {deleteAccountMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.surface }]}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.warningText, { color: colors.error }]}>
              ⚠️ This action cannot be undone
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 36,
    alignItems: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  valueLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    marginLeft: 64,
  },
  themeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  themeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  themeButtonActive: {},
  themeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeButtonTextActive: {
    color: colors.text,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  sliderButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
  },
  bottomSpacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  deleteList: {
    marginBottom: 20,
    gap: 8,
  },
  deleteListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteListItemText: {
    fontSize: 14,
    flex: 1,
  },
  input: {
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  deleteButton: {
    backgroundColor: '#e53935',
    borderColor: '#e53935',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 16,
  },
});
