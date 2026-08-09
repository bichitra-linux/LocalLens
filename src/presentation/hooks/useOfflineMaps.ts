import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OfflineMapPackService } from '../../utils/offlineMapPacks';
import { MapRegion, OfflinePackStatus } from '../../domain/entities/MapRegion';
import { PRESET_REGIONS } from '../../utils/mapConfig';

const packService = OfflineMapPackService.getInstance();

export const offlineMapKeys = {
  all: ['offlineMaps'] as const,
  packs: () => [...offlineMapKeys.all, 'packs'] as const,
  storage: () => [...offlineMapKeys.all, 'storage'] as const,
};

export const useOfflinePacks = () => {
  return useQuery({
    queryKey: offlineMapKeys.packs(),
    queryFn: () => packService.getPacks(),
    staleTime: 30000,
  });
};

export const useAvailableRegions = () => {
  const { data: downloadedPacks } = useOfflinePacks();

  return PRESET_REGIONS.map(region => ({
    ...region,
    isDownloaded: downloadedPacks?.some(p => p.id === region.id) ?? false,
  }));
};

export const useDownloadPack = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      region,
      onProgress,
    }: {
      region: MapRegion;
      onProgress?: (status: OfflinePackStatus) => void;
    }) => {
      return packService.downloadPack(region, onProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offlineMapKeys.packs() });
    },
  });
};

export const useDeletePack = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (regionId: string) => packService.deletePack(regionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offlineMapKeys.packs() });
    },
  });
};
