import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../../utils/theme';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAppNavigation } from '../hooks/useNavigation';
import { NavigationView } from '../components/NavigationView';
import { CompassNavigation } from '../components/CompassNavigation';
import { LatLng } from '../../domain/entities/Route';
import { getMapStyle } from '../../utils/mapConfig';
import { useAppStore } from '../store/appStore';

let MapLibreGL: typeof import('@maplibre/maplibre-react-native').default | null = null;

const initializeMapComponents = () => {
  try {
    MapLibreGL = require('@maplibre/maplibre-react-native').default;
  } catch (error) {
    console.warn('@maplibre/maplibre-react-native not available:', error);
  }
};

type NavigationScreenRouteProp = RouteProp<RootStackParamList, 'Navigation'>;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export const NavigationScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const route = useRoute<NavigationScreenRouteProp>();
  const { destinationLat, destinationLng, destinationName } = route.params;
  const { location } = useAppStore();
  const [componentsInitialized, setComponentsInitialized] = useState(false);
  const mapRef = useRef<any>(null);

  const destination: LatLng = {
    latitude: destinationLat,
    longitude: destinationLng,
  };

  const {
    isActive,
    route: navRoute,
    currentStepIndex,
    distanceToNextStep,
    distanceRemaining,
    durationRemaining,
    isOnRoute,
    offRouteDistance,
    isLoading,
    error,
    startNavigation,
    stopNavigation,
    formatDistance,
    formatDuration,
  } = useAppNavigation();

  useEffect(() => {
    initializeMapComponents();
    setComponentsInitialized(true);
    startNavigation(destination, destinationName);
  }, []);

  const routeGeoJSON = useMemo((): GeoJSON.Feature<GeoJSON.LineString> | null => {
    if (!navRoute || navRoute.geometry.length < 2) return null;
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: navRoute.geometry.map((p: LatLng) => [p.longitude, p.latitude]),
      },
      properties: {},
    };
  }, [navRoute]);

  const destinationGeoJSON = useMemo((): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [destination.longitude, destination.latitude],
        },
        properties: { title: destinationName || 'Destination' },
      },
    ],
  }), [destination, destinationName]);

  const routeLineCoords = useMemo((): [number, number][] => {
    if (!navRoute) return [];
    return navRoute.geometry.map((p: LatLng) => [p.latitude, p.longitude]);
  }, [navRoute]);

  const mapCenter: [number, number] | null =
    location.latitude !== null && location.longitude !== null
      ? [location.longitude, location.latitude]
      : null;

  const renderNativeMap = () => {
    if (!MapLibreGL || !mapCenter) return null;

    return (
      <MapLibreGL.MapView
        style={styles.map}
        styleJSON={getMapStyle()}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapLibreGL.Camera
          followUserLocation={true}
          followZoomLevel={16}
          followHeading={0}
        />

        <MapLibreGL.UserLocation visible={true} />

        <MapLibreGL.ShapeSource id="destination" shape={destinationGeoJSON}>
          <MapLibreGL.SymbolLayer
            id="destination-marker"
            style={{
              textField: ['get', 'title'],
              textSize: 12,
              textColor: '#ffffff',
              textHaloColor: colors.error,
              textHaloWidth: 1,
              textOffset: [0, -2],
              textAnchor: 'bottom',
              iconImage: 'marker-15',
              iconSize: 1.5,
              iconColor: colors.error,
            }}
          />
        </MapLibreGL.ShapeSource>

        {routeGeoJSON && (
          <MapLibreGL.ShapeSource id="route" shape={routeGeoJSON}>
            <MapLibreGL.LineLayer
              id="route-line"
              style={{
                lineColor: colors.primary,
                lineWidth: 5,
                lineOpacity: 0.85,
              }}
            />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Calculating route...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !isActive) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <CompassNavigation destination={destination} destinationName={destinationName} />
        </View>
      </SafeAreaView>
    );
  }

  if (!componentsInitialized || !mapCenter) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        {renderNativeMap()}
      </View>

      {isActive && navRoute && (
        <NavigationView
          isActive={isActive}
          route={navRoute}
          currentStepIndex={currentStepIndex}
          distanceToNextStep={distanceToNextStep}
          distanceRemaining={distanceRemaining}
          durationRemaining={durationRemaining}
          currentSpeed={0}
          isOnRoute={isOnRoute}
          offRouteDistance={offRouteDistance}
          onStopNavigation={stopNavigation}
          formatDistance={formatDistance}
          formatDuration={formatDuration}
        />
      )}
    </SafeAreaView>
  );
};
