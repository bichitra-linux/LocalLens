import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { useSignOut } from '../hooks/useAuth';
import { MapScreen } from '../components/MapScreen';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Note } from '../../domain/entities/Note';

type MapScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export const MapScreenContainer: React.FC = () => {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const { user, location } = useAppStore();
  const signOutMutation = useSignOut();

  const handleNotePress = (note: Note) => {
    navigation.navigate('NoteDetail', { noteId: note.id });
  };

  const handleMapPress = (coordinate: { latitude: number; longitude: number }) => {
    if (location.latitude && location.longitude) {
      navigation.navigate('CreateNote', {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });
    }
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LocalLens</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('CreateNote', {})}
          >
            <Ionicons name="add" size={24} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={24} color="#2196F3" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
});