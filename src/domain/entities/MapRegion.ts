export interface MapRegion {
  id: string;
  name: string;
  description: string;
  bounds: [number, number, number, number]; // [west, south, east, north]
  minZoom: number;
  maxZoom: number;
  estimatedSizeMB: number;
}

export interface OfflinePack {
  id: string;
  name: string;
  bounds: [number, number, number, number];
  status: 'downloading' | 'complete' | 'error' | 'paused';
  progress: number; // 0-100
  downloadSize: number; // bytes
  tileCount: number;
  createdAt: string;
}

export interface OfflinePackStatus {
  name: string;
  status: string;
  percentage: number;
  completedResourceCount: number;
  completedResourceSize: number;
  completedTileCount: number;
  requiredResourceCount: number;
}
