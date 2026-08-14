import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useCreateNote } from '../hooks/useNotes';
import { useAppStore } from '../store/appStore';
import { useSettingsStore } from '../store/settingsStore';
import { locationService } from '../../utils/locationService';
import { DraftService } from '../../utils/drafts';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../../utils/theme';
import { useDebounce } from '../hooks/useDebounce';

type CreateNoteScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateNote'>;
type CreateNoteScreenRouteProp = RouteProp<RootStackParamList, 'CreateNote'>;

export const CreateNoteScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<CreateNoteScreenNavigationProp>();
  const route = useRoute<CreateNoteScreenRouteProp>();
  const { location } = useAppStore();
  const headerHeight = useHeaderHeight();
  const { defaultExpirationDays } = useSettingsStore();
  const draftService = DraftService.getInstance();

  const [content, setContent] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(String(defaultExpirationDays));
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const createNoteMutation = useCreateNote();
  const debouncedContent = useDebounce(content, 2000);

  // Auto-save draft when content changes
  React.useEffect(() => {
    const autoSaveDraft = async () => {
      if (debouncedContent.trim().length > 0 && !createNoteMutation.isPending) {
        setIsSavingDraft(true);
        try {
          const noteLocation = route.params?.latitude != null && route.params?.longitude != null
            ? { latitude: route.params.latitude, longitude: route.params.longitude }
            : location.latitude != null && location.longitude != null
            ? { latitude: location.latitude, longitude: location.longitude }
            : undefined;

          const id = await draftService.saveDraft({
            content: debouncedContent,
            expiresInDays: parseInt(expiresInDays) || 7,
            location: noteLocation,
            category,
          });
          setDraftId(id);
        } catch (error) {
          console.error('[CreateNote] Auto-save draft failed:', error);
        } finally {
          setIsSavingDraft(false);
        }
      }
    };

    void autoSaveDraft();
  }, [debouncedContent, expiresInDays, category, route.params, location]);

  const loadDraft = async (id: string) => {
    try {
      const draft = await draftService.getDraft(id);
      if (draft) {
        setContent(draft.content);
        if (draft.category) setCategory(draft.category);
        if (draft.expiresInDays) setExpiresInDays(String(draft.expiresInDays));
        await draftService.deleteDraft(id);
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  };

  React.useEffect(() => {
    if (route.params?.draftId) {
      loadDraft(route.params.draftId);
    }
  }, [route.params?.draftId]);

  const handleCreateNote = useCallback(async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter note content');
      return;
    }

    const noteLocation = route.params?.latitude != null && route.params?.longitude != null
      ? { latitude: route.params.latitude, longitude: route.params.longitude }
      : location.latitude != null && location.longitude != null
      ? { latitude: location.latitude, longitude: location.longitude }
      : null;

    if (!noteLocation) {
      Alert.alert('Error', 'Location is required to create a note');
      return;
    }

    const days = parseInt(expiresInDays);
    if (isNaN(days) || days < 1 || days > 30) {
      Alert.alert('Error', 'Expiration must be between 1 and 30 days');
      return;
    }

    try {
      await createNoteMutation.mutateAsync({
        content: content.trim(),
        location: noteLocation,
        expiresInDays: days,
      });

      Alert.alert('Success', 'Note created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    }
  }, [content, location, route.params, expiresInDays, createNoteMutation, navigation]);

  const getCurrentLocation = useCallback(async () => {
    try {
      const currentLocation = await locationService.getCurrentLocation();
      if (currentLocation) {
        // Update the form with current location - this is just for display
        // The actual location will be used when creating the note
        Alert.alert('Location Updated', 'Current location will be used for this note');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    }
  }, [createNoteMutation.isPending]);

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <View style={styles.formHeader}>
              <Text style={styles.label}>Note Content *</Text>
              {isSavingDraft && (
                <View style={styles.autoSaveIndicator}>
                  <ActivityIndicator size="small" color={colors.textTertiary} />
                  <Text style={[styles.autoSaveText, { color: colors.textTertiary }]}>Saving...</Text>
                </View>
              )}
            </View>
            <TextInput
              style={styles.textArea}
              placeholder="What's happening around here?"
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              maxLength={500}
              editable={!createNoteMutation.isPending}
            />
            <View style={styles.characterCountContainer}>
              <Text style={[
                styles.characterCount,
                content.length > 450 && styles.characterCountWarning,
                content.length > 480 && styles.characterCountDanger,
              ]}>{content.length}/500</Text>
              {content.length > 450 && (
                <Ionicons name="warning-outline" size={14} color={content.length > 480 ? colors.error : colors.warning} />
              )}
            </View>

            <Text style={styles.label}>Expires in (days)</Text>
            <TextInput
              style={styles.input}
              placeholder="7"
              value={expiresInDays}
              onChangeText={setExpiresInDays}
              keyboardType="numeric"
              editable={!createNoteMutation.isPending}
            />

            <View style={styles.locationInfo}>
              <Ionicons name="location" size={16} color={colors.textSecondary} />
              <Text style={styles.locationText}>
                {route.params?.latitude != null && route.params?.longitude != null
                  ? `Custom location: ${route.params.latitude.toFixed(4)}, ${route.params.longitude.toFixed(4)}`
                  : location.latitude != null && location.longitude != null
                  ? `Current location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : 'No location available'}
              </Text>
            </View>

            {route.params?.latitude == null && route.params?.longitude == null && (
              <TouchableOpacity
                style={styles.locationButton}
                onPress={getCurrentLocation}
                disabled={createNoteMutation.isPending}
                accessibilityLabel="Use current location"
                accessibilityRole="button"
              >
                <Ionicons name="locate" size={20} color={colors.primary} />
                <Text style={styles.locationButtonText}>Use Current Location</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            disabled={createNoteMutation.isPending}
            accessibilityLabel="Cancel note creation"
            accessibilityRole="button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.createButton]}
            onPress={handleCreateNote}
            disabled={createNoteMutation.isPending || !content.trim()}
            accessibilityLabel="Create note"
            accessibilityRole="button"
            accessibilityState={{ disabled: createNoteMutation.isPending || !content.trim() }}
          >
            {createNoteMutation.isPending ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Text style={styles.createButtonText}>Create Note</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  autoSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoSaveText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    height: 100,
    textAlignVertical: 'top',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  characterCount: {
    textAlign: 'right',
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    marginRight: 4,
  },
  characterCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  characterCountWarning: {
    color: '#fbc02d',
    fontWeight: '600',
  },
  characterCountDanger: {
    color: colors.error,
    fontWeight: '700',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
  },
  locationText: {
    marginLeft: 8,
    color: colors.textSecondary,
    fontSize: 14,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: 8,
  },
  locationButtonText: {
    marginLeft: 8,
    color: colors.primary,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
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
    fontSize: 16,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: colors.primary,
  },
  createButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
});