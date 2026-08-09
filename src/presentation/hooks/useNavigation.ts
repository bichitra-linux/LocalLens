import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { RoutingService } from '../../utils/routing';
import { getCompassData, hasArrived, formatDistance, formatDuration, calculateDistanceToDestination } from '../../utils/compassNavigation';
import { Route, LatLng, NavigationState, RouteStep } from '../../domain/entities/Route';

const routingService = RoutingService.getInstance();

export const useAppNavigation = () => {
  const { location } = useAppStore();
  const [navigationState, setNavigationState] = useState<NavigationState>({
    isActive: false,
    route: null,
    currentStepIndex: 0,
    distanceToNextStep: 0,
    distanceRemaining: 0,
    durationRemaining: 0,
    currentSpeed: 0,
    isOnRoute: true,
    offRouteDistance: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getCurrentLatLng = useCallback((): LatLng | null => {
    if (location.latitude !== null && location.longitude !== null) {
      return { latitude: location.latitude, longitude: location.longitude };
    }
    return null;
  }, [location]);

  const startNavigation = useCallback(async (destination: LatLng, destinationName?: string) => {
    const currentLocation = getCurrentLatLng();
    if (!currentLocation) {
      setError('Current location not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let route: Route;
      try {
        route = await routingService.getRoute(currentLocation, destination, destinationName);
      } catch {
        const compass = getCompassData(currentLocation, destination);
        route = {
          id: `compass_${Date.now()}`,
          geometry: [currentLocation, destination],
          distance: compass.distance,
          duration: compass.estimatedTime,
          steps: [{
            instruction: `Head ${compass.direction} toward ${destinationName || 'destination'}`,
            distance: compass.distance,
            duration: compass.estimatedTime,
            maneuver: 'depart',
            location: currentLocation,
            name: destinationName || '',
            bearingBefore: 0,
            bearingAfter: compass.bearing,
          }],
          origin: currentLocation,
          destination,
          destinationName,
          createdAt: new Date().toISOString(),
          isOffline: true,
        };
      }

      setNavigationState({
        isActive: true,
        route,
        currentStepIndex: 0,
        distanceToNextStep: route.steps[0]?.distance || 0,
        distanceRemaining: route.distance,
        durationRemaining: route.duration,
        currentSpeed: 0,
        isOnRoute: true,
        offRouteDistance: 0,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentLatLng]);

  const stopNavigation = useCallback(() => {
    setNavigationState({
      isActive: false,
      route: null,
      currentStepIndex: 0,
      distanceToNextStep: 0,
      distanceRemaining: 0,
      durationRemaining: 0,
      currentSpeed: 0,
      isOnRoute: true,
      offRouteDistance: 0,
    });
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!navigationState.isActive || !navigationState.route) return;

    const currentLocation = getCurrentLatLng();
    if (!currentLocation) return;

    const route = navigationState.route;

    if (hasArrived(currentLocation, route.destination)) {
      setNavigationState(prev => ({
        ...prev,
        distanceRemaining: 0,
        durationRemaining: 0,
      }));
      return;
    }

    const isOnRoute = routingService.isOnRoute(route, currentLocation);
    const nearest = routingService.getNearestPointOnRoute(route, currentLocation);

    const compass = getCompassData(currentLocation, route.destination);

    const currentStepIdx = routingService.getCurrentStepIndex(route, currentLocation);
    const nextStep = route.steps[currentStepIdx + 1];

    let distanceToNext = 0;
    if (nextStep) {
      distanceToNext = calculateDistanceToDestination(currentLocation, nextStep.location);
    } else {
      distanceToNext = compass.distance;
    }

    setNavigationState(prev => ({
      ...prev,
      isOnRoute,
      offRouteDistance: nearest.distance,
      distanceRemaining: compass.distance,
      durationRemaining: compass.estimatedTime,
      currentStepIndex: currentStepIdx,
      distanceToNextStep: distanceToNext,
    }));
  }, [location, navigationState.isActive, navigationState.route, getCurrentLatLng]);

  return {
    ...navigationState,
    isLoading,
    error,
    startNavigation,
    stopNavigation,
    formatDistance,
    formatDuration,
  };
};
