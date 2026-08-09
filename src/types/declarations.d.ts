declare module '@maplibre/maplibre-react-native' {
  export const MapView: any;
  export const Camera: any;
  export const UserLocation: any;
  export const ShapeSource: any;
  export const SymbolLayer: any;
  export const CircleLayer: any;
  export const LineLayer: any;
  export const FillLayer: any;
  export const OfflineManager: {
    createPack: (options: any, progressListener?: any, errorListener?: any) => Promise<any>;
    getPacks: () => Promise<any[]>;
    deletePack: (pack: any) => Promise<void>;
    setMaximumAmbientCacheSize: (size: number) => Promise<void>;
  };
  export default any;
}

declare module '@turf/turf' {
  export function point(coordinates: number[]): any;
  export function lineString(coordinates: number[][]): any;
  export function distance(from: any, to: any, options?: { units?: string }): number;
  export function bearing(from: any, to: any): number;
  export function nearestPointOnLine(line: any, point: any, options?: { units?: string }): any;
  export function destination(point: any, distance: number, bearing: number, options?: { units?: string }): any;
  export function along(line: any, distance: number, options?: { units?: string }): any;
  export function length(line: any, options?: { units?: string }): number;
  export function bearingToAzimuth(bearing: number): number;
}
