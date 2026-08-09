export interface LatLng {
  latitude: number;
  longitude: number;
}

export type ManeuverType =
  | 'turn-left'
  | 'turn-right'
  | 'turn-sharp-left'
  | 'turn-sharp-right'
  | 'turn-slight-left'
  | 'turn-slight-right'
  | 'continue'
  | 'new-name'
  | 'merge'
  | 'on-ramp'
  | 'off-ramp'
  | 'fork'
  | 'roundabout'
  | 'rotary'
  | 'arrive'
  | 'depart';

export interface RouteStep {
  instruction: string;
  distance: number;       // meters
  duration: number;       // seconds
  maneuver: ManeuverType;
  location: LatLng;
  name: string;           // street/road name
  bearingBefore: number;  // degrees
  bearingAfter: number;   // degrees
}

export interface Route {
  id: string;
  geometry: LatLng[];     // Route polyline points
  distance: number;       // total meters
  duration: number;       // total seconds
  steps: RouteStep[];     // Turn-by-turn instructions
  origin: LatLng;
  destination: LatLng;
  destinationName?: string;
  createdAt: string;      // ISO date
  isOffline: boolean;     // true if loaded from local storage
}

export interface NavigationState {
  isActive: boolean;
  route: Route | null;
  currentStepIndex: number;
  distanceToNextStep: number;   // meters
  distanceRemaining: number;    // meters
  durationRemaining: number;    // seconds
  currentSpeed: number;         // m/s
  isOnRoute: boolean;
  offRouteDistance: number;     // meters from route
}
