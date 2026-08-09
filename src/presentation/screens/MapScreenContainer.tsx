import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../../utils/theme';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { MapScreen } from '../components/MapScreen';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Note } from '../../domain/entities/Note';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

type MapScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export const MapScreenContainer: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<MapScreenNavigationProp>();
  const { location } = useAppStore();
  const { isOnline } = useNetworkStatus();

  const handleNotePress = (note: Note) => {
    navigation.navigate('NoteDetail', { noteId: note.id });
  };

  const handleMapPress = (coordinate: { latitude: number; longitude: number }) => {
    if (location.latitude !== null && location.longitude !== null) {
      navigation.navigate('CreateNote', {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });
    }
  };

return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LocalLens</Text>
        <View style={styles.headerActions}>
          {!isOnline && (
            <View style={[styles.offlineIndicator, { backgroundColor: colors.warning + '1A' }]}>
              <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
            </View>
          )}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Bookmarks')}
            accessibilityLabel="View bookmarks"
            accessibilityRole="button"
          >
            <Ionicons name="bookmark-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('CreateNote', {})}
            accessibilityLabel="Add new note"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <MapScreen 
        onNotePress={handleNotePress}
        onMapPress={handleMapPress}
      />
    </SafeAreaView>
  );
};
