import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useCreateNote } from '../hooks/useNotes';
import { useAppStore } from '../store/appStore';
import { locationService } from '../../utils/locationService';

type CreateNoteScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateNote'>;
type CreateNoteScreenRouteProp = RouteProp<RootStackParamList, 'CreateNote'>;

export const CreateNoteScreen: React.FC = () => {
  const navigation = useNavigation<CreateNoteScreenNavigationProp>();
  const route = useRoute<CreateNoteScreenRouteProp>();
  const { location } = useAppStore();
  
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [expiresInDays, setExpiresInDays] = useState('7');
  
  const createNoteMutation = useCreateNote();

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll permissions are needed to select images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permissions are needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCreateNote = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter note content');
      return;
    }

    const noteLocation = route.params?.latitude && route.params?.longitude 
      ? { latitude: route.params.latitude, longitude: route.params.longitude }
      : location.latitude && location.longitude
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
        imageUri: imageUri || undefined,
        location: noteLocation,
        expiresInDays: days,
      });

      Alert.alert('Success', 'Note created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const removeImage = () => {
    setImageUri(null);
  };

  const getCurrentLocation = async () => {
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <Text style={styles.label}>Note Content *</Text>
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
            <Text style={styles.characterCount}>{content.length}/500</Text>

            <Text style={styles.label}>Photo (Optional)</Text>
            {imageUri ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: imageUri }} style={styles.image} />
                <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imageButtons}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={handleCamera}
                  disabled={createNoteMutation.isPending}
                >
                  <Ionicons name="camera" size={24} color="#2196F3" />
                  <Text style={styles.imageButtonText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={handleImagePicker}
                  disabled={createNoteMutation.isPending}
                >
                  <Ionicons name="image" size={24} color="#2196F3" />
                  <Text style={styles.imageButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

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
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.locationText}>
                {route.params?.latitude && route.params?.longitude
                  ? `Custom location: ${route.params.latitude.toFixed(4)}, ${route.params.longitude.toFixed(4)}`
                  : location.latitude && location.longitude
                  ? `Current location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : 'No location available'}
              </Text>
            </View>

            {!route.params?.latitude && !route.params?.longitude && (
              <TouchableOpacity
                style={styles.locationButton}
                onPress={getCurrentLocation}
                disabled={createNoteMutation.isPending}
              >
                <Ionicons name="locate" size={20} color="#2196F3" />
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
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.createButton]}
            onPress={handleCreateNote}
            disabled={createNoteMutation.isPending || !content.trim()}
          >
            {createNoteMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.createButtonText}>Create Note</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    height: 100,
    textAlignVertical: 'top',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  characterCount: {
    textAlign: 'right',
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  imageButtonText: {
    color: '#2196F3',
    marginTop: 8,
    fontSize: 14,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  locationText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
    marginTop: 8,
  },
  locationButtonText: {
    marginLeft: 8,
    color: '#2196F3',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#2196F3',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});