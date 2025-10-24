import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { useAppStore } from '../store/appStore';
import { useNearbyNotes, useNearbyNotesListener } from '../hooks/useNotes';
import { locationService } from '../../utils/locationService';
import { Note } from '../../domain/entities/Note';

// Import map components conditionally - Platform check happens at runtime
let MapView: any, Marker: any, UrlTile: any;
let MapContainer: any, TileLayer: any, LeafletMarker: any, Popup: any;

const initializeMapComponents = () => {
  if (Platform.OS !== 'web') {
    // Import react-native-maps only for native platforms
    try {
      const mapComponents = require('react-native-maps');
      MapView = mapComponents.default;
      Marker = mapComponents.Marker;
      UrlTile = mapComponents.UrlTile; // For OpenStreetMap tiles
    } catch (error) {
      console.warn('react-native-maps not available:', error);
    }
  } else {
    // Import leaflet components for web
    try {
      const leafletComponents = require('react-leaflet');
      MapContainer = leafletComponents.MapContainer;
      TileLayer = leafletComponents.TileLayer;
      LeafletMarker = leafletComponents.Marker;
      Popup = leafletComponents.Popup;
    } catch (e) {
      console.warn('Leaflet components not available:', e);
    }
  }
};

interface MapScreenProps {
  onNotePress?: (note: Note) => void;
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
}

export const MapScreen: React.FC<MapScreenProps> = ({ onNotePress, onMapPress }) => {
  const mapRef = useRef<any>(null);
  const { location, isMapReady, setMapReady, setSelectedNote } = useAppStore();
  const [region, setRegion] = useState<any | null>(null);
  const [componentsInitialized, setComponentsInitialized] = useState(false);

  // Use the real-time listener for live updates
  useNearbyNotesListener();
  
  // Also use the paginated query for initial load and manual refresh
  const { data: notesData, isLoading } = useNearbyNotes();

  // Get all notes from all pages
  const allNotes = notesData?.pages.flatMap(page => page.data) ?? [];

  useEffect(() => {
    initializeMapComponents();
    setComponentsInitialized(true);
    initializeLocation();
  }, []);

  useEffect(() => {
    if (location.latitude && location.longitude && mapRef.current && !region) {
      const initialRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01, // ~1km
        longitudeDelta: 0.01,
      };
      
      setRegion(initialRegion);
      
      if (Platform.OS !== 'web' && mapRef.current?.animateToRegion) {
        mapRef.current.animateToRegion(initialRegion, 1000);
      }
    }
  }, [location, region]);

  const initializeLocation = async () => {
    try {
      const isEnabled = await locationService.checkLocationEnabled();
      
      if (!isEnabled) {
        Alert.alert(
          'Location Required',
          'LocalLens needs location access to show nearby notes. Please enable location services.',
          [{ text: 'OK' }]
        );
        return;
      }

      await locationService.getCurrentLocation();
    } catch (error) {
      console.error('Error initializing location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please check your location permissions.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleMapReady = () => {
    console.log('Map is ready');
    setMapReady(true);
  };

  const handleMapPress = (event: any) => {
    if (onMapPress) {
      let coordinate;
      
      if (Platform.OS === 'web') {
        // Leaflet event structure
        coordinate = {
          latitude: event.latlng?.lat || event.latitude,
          longitude: event.latlng?.lng || event.longitude,
        };
      } else {
        // React Native Maps event structure
        coordinate = event.nativeEvent?.coordinate || event;
      }
      
      onMapPress(coordinate);
    }
  };

  const handleMarkerPress = (note: Note) => {
    setSelectedNote(note.id);
    if (onNotePress) {
      onNotePress(note);
    }
  };

  const renderNativeMap = () => {
    if (!MapView) return null;

    const renderNoteMarkers = () => {
      return allNotes.map((note) => (
        <Marker
          key={note.id}
          coordinate={{
            latitude: note.location.latitude,
            longitude: note.location.longitude,
          }}
          title={note.username}
          description={note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '')}
          onPress={() => handleMarkerPress(note)}
          pinColor={note.hasUserVoted === 'up' ? '#4CAF50' : 
                   note.hasUserVoted === 'down' ? '#f44336' : '#2196F3'}
        />
      ));
    };

    const renderUserLocationMarker = () => {
      if (!location.latitude || !location.longitude) return null;

      return (
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title="Your Location"
          pinColor="#FF5722"
          anchor={{ x: 0.5, y: 0.5 }}
        />
      );
    };

    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        onMapReady={handleMapReady}
        onPress={handleMapPress}
        onRegionChangeComplete={setRegion}
        loadingEnabled={true}
        loadingIndicatorColor="#2196F3"
        moveOnMarkerPress={false}
        mapType="none" // Disable default tiles to use custom OpenStreetMap tiles
      >
        {/* OpenStreetMap tiles - Multiple options available */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          // Attribution: © OpenStreetMap contributors
        />
        {/* Alternative tile servers you can use:
          
          // Carto Light (clean, minimal):
          // urlTemplate="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          
          // Carto Dark (for dark theme):
          // urlTemplate="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          
          // OpenTopoMap (topographic):
          // urlTemplate="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          
        */}
        {renderUserLocationMarker()}
        {renderNoteMarkers()}
      </MapView>
    );
  };

  const renderWebMap = () => {
    if (!MapContainer || !region) return null;

    const center: [number, number] = [region.latitude, region.longitude];

    return (
      <MapContainer
        center={center}
        zoom={15}
        style={styles.map}
        whenCreated={(map: any) => {
          mapRef.current = map;
          handleMapReady();
        }}
        onClick={handleMapPress}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* User location marker */}
        {location.latitude && location.longitude && (
          <LeafletMarker 
            position={[location.latitude, location.longitude]}
          >
            <Popup>Your Location</Popup>
          </LeafletMarker>
        )}
        
        {/* Note markers */}
        {allNotes.map((note) => (
          <LeafletMarker
            key={note.id}
            position={[note.location.latitude, note.location.longitude]}
            eventHandlers={{
              click: () => handleMarkerPress(note),
            }}
          >
            <Popup>
              <div>
                <strong>{note.username}</strong>
                <br />
                {note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '')}
              </div>
            </Popup>
          </LeafletMarker>
        ))}
      </MapContainer>
    );
  };

  if (!region || !componentsInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? renderWebMap() : renderNativeMap()}
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#2196F3" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});