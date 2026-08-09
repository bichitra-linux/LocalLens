import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapRegion, OfflinePack, OfflinePackStatus } from '../domain/entities/MapRegion';
import { getMapStyle, DEFAULT_PACK_MIN_ZOOM, DEFAULT_PACK_MAX_ZOOM } from './mapConfig';

const PACKS_KEY = 'locallens_offline_packs';

let OfflineManager: any = null;
if (Platform.OS !== 'web') {
  try {
    OfflineManager = require('@maplibre/maplibre-react-native').OfflineManager;
  } catch (e) {
    console.warn('MapLibre OfflineManager not available:', e);
  }
}

function requireNativeOfflineManager(): any {
  if (!OfflineManager) {
    throw new Error('Offline maps are not available on web platform');
  }
  return OfflineManager;
}

export class OfflineMapPackService {
  private static instance: OfflineMapPackService;

  static getInstance(): OfflineMapPackService {
    if (!OfflineMapPackService.instance) {
      OfflineMapPackService.instance = new OfflineMapPackService();
    }
    return OfflineMapPackService.instance;
  }

  async downloadPack(
    region: MapRegion,
    onProgress?: (status: OfflinePackStatus) => void
  ): Promise<void> {
    await this.savePackRecord(region, 'downloading', 0);

    const packMetadata = {
      name: region.name,
      regionId: region.id,
      bounds: region.bounds,
      createdAt: new Date().toISOString(),
    };

    await OfflineManager.createPack(
      {
        name: region.id,
        styleURL: getMapStyle(),
        minZoom: region.minZoom || DEFAULT_PACK_MIN_ZOOM,
        maxZoom: region.maxZoom || DEFAULT_PACK_MAX_ZOOM,
        bounds: [
          [region.bounds[0], region.bounds[1]], // southwest [lng, lat]
          [region.bounds[2], region.bounds[3]], // northeast [lng, lat]
        ],
        metadata: packMetadata,
      },
      (pack: any, status: any) => {
        if (status.percentage >= 100) {
          this.savePackRecord(region, 'complete', 100, status.completedResourceSize);
        } else {
          this.updatePackProgress(region.id, status.percentage);
        }
        if (onProgress) {
          onProgress({
            name: region.name,
            status: status.state,
            percentage: status.percentage,
            completedResourceCount: status.completedResourceCount,
            completedResourceSize: status.completedResourceSize,
            completedTileCount: status.completedTileCount,
            requiredResourceCount: status.requiredResourceCount,
          });
        }
      },
      (pack: any, error: any) => {
        this.savePackRecord(region, 'error', 0);
        console.error('Offline pack error:', error);
      }
    );
  }

  async getPacks(): Promise<OfflinePack[]> {
    try {
      const json = await AsyncStorage.getItem(PACKS_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('[OfflineMaps] Failed to load packs:', error);
      return [];
    }
  }

  async getNativePacks(): Promise<any[]> {
    const manager = requireNativeOfflineManager();
    return await manager.getPacks();
  }

  async deletePack(regionId: string): Promise<void> {
    try {
      const manager = requireNativeOfflineManager();
      const nativePacks = await manager.getPacks();
      for (const pack of nativePacks) {
        if (pack.name === regionId) {
          await pack.remove();
        }
      }
      await this.removePackRecord(regionId);
    } catch (error) {
      console.error('Error deleting pack:', error);
      throw error;
    }
  }

  async invalidatePack(regionId: string): Promise<void> {
    const manager = requireNativeOfflineManager();
    const nativePacks = await manager.getPacks();
    for (const pack of nativePacks) {
      if (pack.name === regionId) {
        await pack.invalidate();
      }
    }
  }

  async setStorageLimit(limitMB: number): Promise<void> {
    const manager = requireNativeOfflineManager();
    await manager.setMaximumAmbientCacheSize(limitMB * 1024 * 1024);
  }

  async getTotalStorageUsed(): Promise<number> {
    const packs = await this.getPacks();
    return packs.reduce((total, pack) => total + (pack.downloadSize || 0), 0);
  }

  private async savePackRecord(region: MapRegion, status: string = 'complete', progress: number = 100, actualSize?: number): Promise<void> {
    const packs = await this.getPacks();
    const existing = packs.findIndex(p => p.id === region.id);
    const record: OfflinePack = {
      id: region.id,
      name: region.name,
      bounds: region.bounds,
      status: status as OfflinePack['status'],
      progress,
      downloadSize: actualSize || region.estimatedSizeMB * 1024 * 1024,
      tileCount: 0,
      createdAt: new Date().toISOString(),
    };

    if (existing >= 0) {
      packs[existing] = record;
    } else {
      packs.push(record);
    }

    await AsyncStorage.setItem(PACKS_KEY, JSON.stringify(packs));
  }

  private async updatePackProgress(regionId: string, progress: number): Promise<void> {
    const packs = await this.getPacks();
    const pack = packs.find(p => p.id === regionId);
    if (pack) {
      pack.progress = progress;
      pack.status = 'downloading';
      await AsyncStorage.setItem(PACKS_KEY, JSON.stringify(packs));
    }
  }

  private async removePackRecord(regionId: string): Promise<void> {
    const packs = await this.getPacks();
    const filtered = packs.filter(p => p.id !== regionId);
    await AsyncStorage.setItem(PACKS_KEY, JSON.stringify(filtered));
  }
}
