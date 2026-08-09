import AsyncStorage from '@react-native-async-storage/async-storage';
import { Route, RouteStep, LatLng, ManeuverType } from '../domain/entities/Route';
import * as turf from '@turf/turf';
import { calculateDistance } from './geospatial';

const OSRM_BASE_URL = 'https://router.project-osrm.org';
const ROUTES_KEY = 'locallens_saved_routes';
const MAX_SAVED_ROUTES = 50;

export class RoutingService {
  private static instance: RoutingService;

  static getInstance(): RoutingService {
    if (!RoutingService.instance) {
      RoutingService.instance = new RoutingService();
    }
    return RoutingService.instance;
  }

  async getRoute(origin: LatLng, destination: LatLng, destinationName?: string): Promise<Route> {
    try {
      const url = `${OSRM_BASE_URL}/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&steps=true&geometries=geojson`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Routing request failed: ${response.status}`);
      }
      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes?.length) {
        throw new Error('No route found');
      }

      const osrmRoute = data.routes[0];
      const route: Route = {
        id: `route_${Date.now()}`,
        geometry: osrmRoute.geometry.coordinates.map((c: number[]) => ({
          latitude: c[1],
          longitude: c[0],
        })),
        distance: osrmRoute.distance,
        duration: osrmRoute.duration,
        steps: this.parseSteps(osrmRoute.legs[0].steps),
        origin,
        destination,
        destinationName,
        createdAt: new Date().toISOString(),
        isOffline: false,
      };

      // Auto-save for offline use
      await this.saveRoute(route);

      return route;
    } catch (error) {
      console.error('Routing error:', error);
      // Try to find a stored route to the same destination
      const storedRoute = await this.findStoredRoute(destination);
      if (storedRoute) {
        return storedRoute;
      }
      throw error;
    }
  }

  async getRouteFromCurrentLocation(destination: LatLng, destinationName?: string): Promise<Route> {
    const { useAppStore } = require('../presentation/store/appStore');
    const { latitude, longitude } = useAppStore.getState().location;
    
    if (!latitude || !longitude) {
      throw new Error('Current location not available');
    }
    
    return this.getRoute({ latitude, longitude }, destination, destinationName);
  }

  async findStoredRoute(destination: LatLng, thresholdMeters: number = 100): Promise<Route | null> {
    const routes = await this.getSavedRoutes();
    
    for (const route of routes) {
      const destDistance = calculateDistance(
        destination.latitude,
        destination.longitude,
        route.destination.latitude,
        route.destination.longitude
      );
      
      if (destDistance * 1000 < thresholdMeters) {
        return { ...route, isOffline: true };
      }
    }
    
    return null;
  }

  async saveRoute(route: Route): Promise<void> {
    const routes = await this.getSavedRoutes();
    
    // Check if route to same destination already exists
    const existingIndex = routes.findIndex(r => {
      const destDist = calculateDistance(
        r.destination.latitude,
        r.destination.longitude,
        route.destination.latitude,
        route.destination.longitude
      );
      return destDist * 1000 < 100; // within 100m
    });

    if (existingIndex >= 0) {
      routes[existingIndex] = route;
    } else {
      routes.unshift(route);
      if (routes.length > MAX_SAVED_ROUTES) {
        routes.splice(MAX_SAVED_ROUTES);
      }
    }

    await AsyncStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
  }

  async getSavedRoutes(): Promise<Route[]> {
    try {
      const json = await AsyncStorage.getItem(ROUTES_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('[Routing] Failed to load saved routes:', error);
      return [];
    }
  }

  async deleteSavedRoute(routeId: string): Promise<void> {
    const routes = await this.getSavedRoutes();
    const filtered = routes.filter(r => r.id !== routeId);
    await AsyncStorage.setItem(ROUTES_KEY, JSON.stringify(filtered));
  }

  getNearestPointOnRoute(route: Route, location: LatLng): { point: LatLng; index: number; distance: number } {
    const turfPoint = turf.point([location.longitude, location.latitude]);
    const turfLine = turf.lineString(route.geometry.map(p => [p.longitude, p.latitude]));
    
    const nearest = turf.nearestPointOnLine(turfLine, turfPoint, { units: 'meters' });
    
    return {
      point: {
        latitude: nearest.geometry.coordinates[1],
        longitude: nearest.geometry.coordinates[0],
      },
      index: nearest.properties.index,
      distance: nearest.properties.dist,
    };
  }

  isOnRoute(route: Route, location: LatLng, thresholdMeters: number = 50): boolean {
    const { distance } = this.getNearestPointOnRoute(route, location);
    return distance <= thresholdMeters;
  }

  getCurrentStepIndex(route: Route, location: LatLng): number {
    const { index: geometryIndex } = this.getNearestPointOnRoute(route, location);
    
    let bestStepIndex = 0;
    let bestDistance = Infinity;
    
    for (let i = 0; i < route.steps.length; i++) {
      const stepLoc = route.steps[i].location;
      const dist = calculateDistance(
        location.latitude, location.longitude,
        stepLoc.latitude, stepLoc.longitude
      );
      
      if (dist < bestDistance) {
        bestDistance = dist;
        bestStepIndex = i;
      }
    }
    
    return bestStepIndex;
  }

  private parseSteps(osrmSteps: any[]): RouteStep[] {
    return osrmSteps.map(step => ({
      instruction: this.getInstructionFromManeuver(step.maneuver),
      distance: step.distance,
      duration: step.duration,
      maneuver: this.mapManeuverType(step.maneuver.type, step.maneuver.modifier),
      location: {
        latitude: step.maneuver.location[1],
        longitude: step.maneuver.location[0],
      },
      name: step.name || '',
      bearingBefore: step.maneuver.bearing_before || 0,
      bearingAfter: step.maneuver.bearing_after || 0,
    }));
  }

  private mapManeuverType(type: string, modifier?: string): ManeuverType {
    const typeMap: Record<string, ManeuverType> = {
      'turn': modifier === 'left' ? 'turn-left' : modifier === 'right' ? 'turn-right' : 'continue',
      'new name': 'new-name',
      'merge': 'merge',
      'on ramp': 'on-ramp',
      'off ramp': 'off-ramp',
      'fork': 'fork',
      'roundabout': 'roundabout',
      'rotary': 'rotary',
      'arrive': 'arrive',
      'depart': 'depart',
    };
    return typeMap[type] || 'continue';
  }

  private getInstructionFromManeuver(maneuver: any): string {
    const type = maneuver.type;
    const modifier = maneuver.modifier || '';
    const name = maneuver.name || '';

    switch (type) {
      case 'depart': return `Head ${modifier}`;
      case 'arrive': return 'Arrive at destination';
      case 'turn': return `Turn ${modifier}${name ? ` onto ${name}` : ''}`;
      case 'roundabout': return `Enter roundabout${name ? ` onto ${name}` : ''}`;
      default: return `Continue${name ? ` on ${name}` : ''}`;
    }
  }

}
