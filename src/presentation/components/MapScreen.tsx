import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Platform, Text, TouchableOpacity } from 'react-native';
import { useAppStore } from '../store/appStore';
import { Ionicons } from '@expo/vector-icons';
import { useNearbyNotes, useNearbyNotesListener } from '../hooks/useNotes';
import { locationService } from '../../utils/locationService';
import { getMapStyle } from '../../utils/mapConfig';
import { calculateDistance } from '../../utils/geospatial';
import { Note } from '../../domain/entities/Note';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../../utils/theme';

let MapLibreGL: typeof import('@maplibre/maplibre-react-native').default | null = null;

const initializeMapComponents = () => {
  try {
    MapLibreGL = require('@maplibre/maplibre-react-native').default;
  } catch (error) {
    console.warn('@maplibre/maplibre-react-native not available:', error);
  }
};

interface Cluster {
  notes: Note[];
  latitude: number;
  longitude: number;
}

interface MapScreenProps {
  onNotePress?: (note: Note) => void;
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
  routeGeometry?: GeoJSON.Feature<GeoJSON.LineString> | null;
}

const clusterNotes = (notes: Note[], radiusKm: number = 5): Cluster[] => {
  if (notes.length === 0) return [];

  const clusters: Cluster[] = [];
  const assigned = new Set<string>();

  for (const note of notes) {
    if (assigned.has(note.id)) continue;

    const cluster: Cluster = {
      notes: [note],
      latitude: note.location.latitude,
      longitude: note.location.longitude,
    };
    assigned.add(note.id);

    for (const other of notes) {
      if (assigned.has(other.id)) continue;

      const distance = calculateDistance(
        note.location.latitude,
        note.location.longitude,
        other.location.latitude,
        other.location.longitude
      );

      if (distance <= radiusKm) {
        cluster.notes.push(other);
        assigned.add(other.id);
      }
    }

    if (cluster.notes.length > 1) {
      cluster.latitude =
        cluster.notes.reduce((sum, n) => sum + n.location.latitude, 0) / cluster.notes.length;
      cluster.longitude =
        cluster.notes.reduce((sum, n) => sum + n.location.longitude, 0) / cluster.notes.length;
    }

    clusters.push(cluster);
  }

  return clusters;
};

const notesToGeoJSON = (clusters: Cluster[]): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: clusters.map((cluster) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [cluster.longitude, cluster.latitude],
    },
    properties: {
      id: cluster.notes.length > 1
        ? `cluster-${cluster.latitude.toFixed(4)}-${cluster.longitude.toFixed(4)}`
        : cluster.notes[0].id,
      isCluster: cluster.notes.length > 1,
      count: cluster.notes.length,
      title: cluster.notes.length > 1
        ? `${cluster.notes.length} notes`
        : cluster.notes[0].username,
      description: cluster.notes.length > 1
        ? 'Tap to explore nearby notes'
        : cluster.notes[0].content.substring(0, 50) +
          (cluster.notes[0].content.length > 50 ? '...' : ''),
      noteId: cluster.notes.length === 1 ? cluster.notes[0].id : null,
      color: cluster.notes.length > 1
        ? '#9C27B0'
        : cluster.notes[0].hasUserVoted === 'up'
          ? '#4CAF50'
          : cluster.notes[0].hasUserVoted === 'down'
            ? '#f44336'
            : '#2196F3',
    },
  })),
});

const markerStyle = {
  textField: ['get', 'title'],
  textSize: 12,
  textColor: '#ffffff',
  textHaloColor: '#000000',
  textHaloWidth: 1,
  textOffset: [0, -2],
  textAnchor: 'bottom',
  iconImage: 'marker-15',
  iconSize: 1.5,
  iconColor: ['get', 'color'],
};

const clusterStyle = {
  textField: ['get', 'count'],
  textSize: 14,
  textColor: '#ffffff',
  textHaloColor: '#9C27B0',
  textHaloWidth: 2,
  textAnchor: 'center',
  circleRadius: 18,
  circleColor: '#9C27B0',
  circleStrokeWidth: 2,
  circleStrokeColor: '#ffffff',
};

const routeStyle = {
  lineColor: '#2196F3',
  lineWidth: 4,
  lineOpacity: 0.8,
};

export const MapScreen: React.FC<MapScreenProps> = ({ onNotePress, onMapPress, routeGeometry }) => {
  const { location, isMapReady, setMapReady } = useAppStore();
  const { colors } = useTheme();
  const [region, setRegion] = useState<{ latitude: number; longitude: number } | null>(null);
  const [componentsInitialized, setComponentsInitialized] = useState(false);
  const mapRef = useRef<any>(null);

  useNearbyNotesListener();

  const { data: notesData, isLoading } = useNearbyNotes();

  const allNotes = notesData?.pages.flatMap((page) => page.data) ?? [];

  useEffect(() => {
    initializeMapComponents();
    setComponentsInitialized(true);
    initializeLocation();
  }, []);

  useEffect(() => {
    if (location.latitude !== null && location.longitude !== null && !region) {
      setRegion({
        latitude: location.latitude,
        longitude: location.longitude,
      });
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
    setMapReady(true);
  };

  const handleMapPress = useCallback(
    (event: any) => {
      if (onMapPress) {
        let coordinate;

        if (Platform.OS === 'web') {
          const lat = event.latlng?.lat ?? event.latitude;
          const lng = event.latlng?.lng ?? event.longitude;
          if (lat === undefined || lng === undefined) return;
          coordinate = { latitude: lat, longitude: lng };
        } else {
          const coords = event.geometry?.coordinates;
          if (coords) {
            coordinate = { latitude: coords[1], longitude: coords[0] };
          } else {
            coordinate = event.nativeEvent?.coordinate || event;
          }
          if (!coordinate?.latitude || !coordinate?.longitude) return;
        }

        onMapPress(coordinate);
      }
    },
    [onMapPress]
  );

  const handleMarkerPress = useCallback(
    (note: Note) => {
      if (onNotePress) {
        onNotePress(note);
      }
    },
    [onNotePress]
  );

  const clusters = useMemo(() => clusterNotes(allNotes), [allNotes]);

  const notesGeoJSON = useMemo(() => notesToGeoJSON(clusters), [clusters]);

  const clusterFeatures = useMemo(
    () =>
      clusters
        .filter((c) => c.notes.length > 1)
        .map(
          (c): GeoJSON.Feature => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
            properties: {
              id: `cluster-${c.latitude.toFixed(4)}-${c.longitude.toFixed(4)}`,
              count: c.notes.length,
              title: `${c.notes.length} notes`,
            },
          })
        ),
    [clusters]
  );

  const clusterGeoJSON: GeoJSON.FeatureCollection = useMemo(
    () => ({ type: 'FeatureCollection', features: clusterFeatures }),
    [clusterFeatures]
  );

  const renderNativeMap = () => {
    if (!MapLibreGL) return null;

    return (
      <MapLibreGL.MapView
        style={styles.map}
        styleJSON={getMapStyle()}
        logoEnabled={false}
        attributionEnabled={false}
        onPress={handleMapPress}
        onDidFinishLoadingMap={handleMapReady}
      >
        <MapLibreGL.Camera
          followUserLocation={!region}
          followZoomLevel={14}
          centerCoordinate={
            region ? [region.longitude, region.latitude] : undefined
          }
          zoomLevel={region ? 14 : undefined}
        />

        <MapLibreGL.UserLocation visible={true} />

        <MapLibreGL.ShapeSource
          id="notes"
          shape={notesGeoJSON}
          onPress={(e: any) => {
            const feature = e.features?.[0];
            if (!feature) return;
            const noteId = feature.properties?.noteId;
            if (noteId) {
              const note = allNotes.find((n) => n.id === noteId);
              if (note) handleMarkerPress(note);
            }
          }}
          cluster={true}
          clusterRadius={50}
          clusterMaxZoom={14}
        >
          <MapLibreGL.SymbolLayer id="note-markers" style={markerStyle} filter={['!', ['has', 'point_count']]} />
          <MapLibreGL.CircleLayer id="cluster-circles" style={clusterStyle} filter={['has', 'point_count']} />
          <MapLibreGL.SymbolLayer id="cluster-counts" style={{
            textField: ['get', 'point_count'],
            textSize: 14,
            textColor: '#ffffff',
            textAnchor: 'center',
          }} filter={['has', 'point_count']} />
        </MapLibreGL.ShapeSource>

        {routeGeometry && (
          <MapLibreGL.ShapeSource id="route" shape={routeGeometry}>
            <MapLibreGL.LineLayer id="route-line" style={routeStyle} />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>
    );
  };

  const styles = createStyles(colors);

  if (!componentsInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!region) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="location-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.unavailableText, { color: colors.textSecondary }]}>
          Location unavailable
        </Text>
        <Text style={[styles.unavailableSubtext, { color: colors.textTertiary }]}>
          Enable location services to see the map
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={initializeLocation}
          accessibilityLabel="Retry location"
          accessibilityRole="button"
        >
          <Text style={[styles.retryButtonText, { color: colors.surface }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderNativeMap()}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    backgroundColor: colors.background,
    gap: 12,
  },
  unavailableText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  unavailableSubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
