import React, { useState, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../../utils/theme';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppStore } from '../store/appStore';
import { useSignOut, useUpdateProfile } from '../hooks/useAuth';
import { useUserNotes } from '../hooks/useNotes';
import { useDeleteNote } from '../hooks/useNotes';
import { Note } from '../../domain/entities/Note';
import { RootStackParamList } from '../navigation/AppNavigator';
import { formatTimeAgoFull } from '../../utils/formatTime';
import { AdBanner } from '../components/AdBanner';

type ProfileNavigationProp = StackNavigationProp<RootStackParamList>;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 12,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editProfileText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  editForm: {
    width: '100%',
    paddingHorizontal: 20,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 12,
  },
  editInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  editButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  enhancedStatsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  enhancedStatsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  enhancedStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  enhancedStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  enhancedStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancedStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  enhancedStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
  },
  signOutButton: {
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error,
  },
  signOutText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  menuSection: {
    marginBottom: 24,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  notesList: {
    padding: 16,
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  noteContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  noteStats: {
    flexDirection: 'row',
    gap: 16,
  },
  noteStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noteStatText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textTertiary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 4,
  },
});

export const ProfileScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<ProfileNavigationProp>();
  const { user } = useAppStore();
  const signOutMutation = useSignOut();
  const updateProfileMutation = useUpdateProfile();
  const deleteNoteMutation = useDeleteNote();

  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'notes'>('profile');

  const { data: notesData, isLoading: notesLoading, refetch, isRefetching } = useUserNotes(user?.id || '');
  const userNotes = notesData?.pages.flatMap(page => page.data) ?? [];

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutMutation.mutateAsync();
            } catch (error) {
              console.error('Sign out error:', error);
            }
          },
        },
      ]
    );
  };

  const handleStartEdit = () => {
    if (user) {
      setEditDisplayName(user.displayName);
      setEditUsername(user.username);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!user) return;

    if (!editDisplayName.trim()) {
      Alert.alert('Error', 'Display name is required');
      return;
    }

    if (editUsername.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        userId: user.id,
        updates: {
          displayName: editDisplayName.trim(),
          username: editUsername.trim(),
        },
      });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditDisplayName('');
    setEditUsername('');
  };

  const handleAvatarPress = () => {
    Alert.alert('Not Available', 'Avatar upload is not available - Firebase Storage is not configured.');
  };

  const handleDeleteNote = useCallback((note: Note) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNoteMutation.mutateAsync(note.id);
              Alert.alert('Success', 'Note deleted');
            } catch (error: unknown) {
              Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
            }
          },
        },
      ]
    );
  }, [deleteNoteMutation]);

  const renderNoteItem = useCallback(({ item }: { item: Note }) => (
    <View style={styles.noteCard}>
      <View style={styles.noteHeader}>
        <Text style={styles.noteTime}>{formatTimeAgoFull(item.createdAt)}</Text>
        <TouchableOpacity
          onPress={() => handleDeleteNote(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Delete note"
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
      <Text style={styles.noteContent} numberOfLines={3}>
        {item.content}
      </Text>
      <View style={styles.noteStats}>
        <View style={styles.noteStat}>
          <Ionicons name="arrow-up" size={14} color={colors.success} />
          <Text style={styles.noteStatText}>{item.upvotes}</Text>
        </View>
        <View style={styles.noteStat}>
          <Ionicons name="arrow-down" size={14} color={colors.error} />
          <Text style={styles.noteStatText}>{item.downvotes}</Text>
        </View>
        <View style={styles.noteStat}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.noteStatText}>{item.commentsCount}</Text>
        </View>
      </View>
    </View>
  ), [styles, colors, handleDeleteNote]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text>No user data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
          accessibilityLabel="Profile"
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'profile' }}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
            Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notes' && styles.activeTab]}
          onPress={() => setActiveTab('notes')}
          accessibilityLabel="My Notes"
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'notes' }}
        >
          <Text style={[styles.tabText, activeTab === 'notes' && styles.activeTabText]}>
            My Notes ({user.notesCount})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'profile' ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.userInfo}>
            <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarContainer} accessibilityLabel="Change avatar" accessibilityRole="button">
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} accessibilityLabel="User avatar" accessibilityRole="image" />
              ) : (
                <View style={styles.avatar}>
                  <Ionicons name="person" size={48} color={colors.primary} />
                </View>
              )}
              <View style={styles.avatarOverlay}>
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Ionicons name="camera" size={16} color={colors.surface} />
                )}
              </View>
            </TouchableOpacity>

            {isEditing ? (
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ width: '100%' }}
              >
                <View style={styles.editForm}>
                <Text style={styles.editLabel}>Display Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={editDisplayName}
                  onChangeText={setEditDisplayName}
                  placeholder="Display Name"
                />
                <Text style={styles.editLabel}>Username</Text>
                <TextInput
                  style={styles.editInput}
                  value={editUsername}
                  onChangeText={setEditUsername}
                  placeholder="Username"
                  autoCapitalize="none"
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.editButton, styles.cancelButton]}
                    onPress={handleCancelEdit}
                    accessibilityLabel="Cancel editing"
                    accessibilityRole="button"
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editButton, styles.saveButton]}
                    onPress={handleSaveEdit}
                    disabled={updateProfileMutation.isPending}
                    accessibilityLabel="Save profile changes"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: updateProfileMutation.isPending }}
                  >
                    {updateProfileMutation.isPending ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
                </View>
              </KeyboardAvoidingView>
            ) : (
              <>
                <Text style={styles.displayName}>{user.displayName}</Text>
                <Text style={styles.username}>@{user.username}</Text>
                <Text style={styles.email}>{user.email}</Text>
                <TouchableOpacity style={styles.editProfileButton} onPress={handleStartEdit} accessibilityLabel="Edit profile" accessibilityRole="button">
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                  <Text style={styles.editProfileText}>Edit Profile</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={styles.statNumber}>{user.notesCount}</Text>
              <Text style={styles.statLabel}>Notes</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="thumbs-up-outline" size={20} color={colors.success} />
              <Text style={styles.statNumber}>{user.votesCount}</Text>
              <Text style={styles.statLabel}>Votes</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color={colors.warning} />
              <Text style={[styles.statNumber, { fontSize: 16 }]}>
                {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
          </View>

          {/* Enhanced Statistics Card */}
          <View style={[styles.enhancedStatsCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
            <Text style={[styles.enhancedStatsTitle, { color: colors.text }]}>Activity Summary</Text>
            <View style={styles.enhancedStatsGrid}>
              <View style={styles.enhancedStatItem}>
                <View style={[styles.enhancedStatIcon, { backgroundColor: colors.primary + '1A' }]}>
                  <Ionicons name="star-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.enhancedStatValue, { color: colors.text }]}>
                  {Math.floor(user.votesCount / 5)}
                </Text>
                <Text style={[styles.enhancedStatLabel, { color: colors.textSecondary }]}>Avg. Votes/Note</Text>
              </View>
              <View style={styles.enhancedStatItem}>
                <View style={[styles.enhancedStatIcon, { backgroundColor: colors.success + '1A' }]}>
                  <Ionicons name="trending-up" size={20} color={colors.success} />
                </View>
                <Text style={[styles.enhancedStatValue, { color: colors.text }]}>
                  {user.notesCount > 0 ? Math.round((user.votesCount / user.notesCount) * 10) / 10 : 0}
                </Text>
                <Text style={[styles.enhancedStatLabel, { color: colors.textSecondary }]}>Engagement Rate</Text>
              </View>
              <View style={styles.enhancedStatItem}>
                <View style={[styles.enhancedStatIcon, { backgroundColor: colors.warning + '1A' }]}>
                  <Ionicons name="flame-outline" size={20} color={colors.warning} />
                </View>
                <Text style={[styles.enhancedStatValue, { color: colors.text }]}>
                  {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                </Text>
                <Text style={[styles.enhancedStatLabel, { color: colors.textSecondary }]}>Days Active</Text>
              </View>
            </View>
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Quick Actions</Text>
            <View style={styles.menuCard}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('Bookmarks')}
                accessibilityLabel="View bookmarks"
                accessibilityRole="button"
              >
                <Ionicons name="bookmark-outline" size={22} color={colors.primary} />
                <Text style={styles.menuItemText}>Bookmarks</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.border} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('Drafts')}
                accessibilityLabel="View drafts"
                accessibilityRole="button"
              >
                <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                <Text style={styles.menuItemText}>Drafts</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.border} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('Achievements')}
                accessibilityLabel="View achievements"
                accessibilityRole="button"
              >
                <Ionicons name="trophy-outline" size={22} color={colors.warning} />
                <Text style={styles.menuItemText}>Achievements</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.border} />
              </TouchableOpacity>
            </View>

            <Text style={styles.menuSectionTitle}>Offline & Settings</Text>
            <View style={styles.menuCard}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('OfflineMaps')}
                accessibilityLabel="View offline maps"
                accessibilityRole="button"
              >
                <Ionicons name="map-outline" size={22} color={colors.success} />
                <Text style={styles.menuItemText}>Offline Maps</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.border} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('OfflineStatus')}
                accessibilityLabel="View offline status"
                accessibilityRole="button"
              >
                <Ionicons name="cloud-offline-outline" size={22} color={colors.primary} />
                <Text style={styles.menuItemText}>Offline Status</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.border} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemLast]}
                onPress={() => navigation.navigate('Settings')}
                accessibilityLabel="Open settings"
                accessibilityRole="button"
              >
                <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.menuItemText}>Settings</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.border} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.signOutButton]}
              onPress={handleSignOut}
              accessibilityLabel="Sign out"
              accessibilityRole="button"
            >
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={userNotes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notesList}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            notesLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <View style={styles.center}>
                <Ionicons name="document-text-outline" size={48} color={colors.border} />
                <Text style={styles.emptyText}>No notes yet</Text>
                <Text style={styles.emptySubtext}>Create your first note from the map!</Text>
              </View>
            )
          }
        />
      )}

      {/* Ad Banner at Bottom */}
      <AdBanner size="banner" />
    </SafeAreaView>
  );
};