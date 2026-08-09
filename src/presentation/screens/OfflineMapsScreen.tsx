import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useOfflinePacks,
  useAvailableRegions,
  useDownloadPack,
  useDeletePack,
} from '../hooks/useOfflineMaps';
import { MapRegion, OfflinePackStatus } from '../../domain/entities/MapRegion';
import { MapRegionPreset } from '../../utils/mapConfig';
import { useTheme } from '../hooks/useTheme';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

interface RegionCardProps {
  region: MapRegionPreset & { isDownloaded: boolean };
  onDownload: (region: MapRegionPreset) => void;
  onDelete: (regionId: string) => void;
  downloadingId: string | null;
  downloadProgress: number;
}

const RegionCard: React.FC<RegionCardProps> = ({
  region,
  onDownload,
  onDelete,
  downloadingId,
  downloadProgress,
}) => {
  const { colors } = useTheme();
  const isDownloading = downloadingId === region.id;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{region.name}</Text>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>{region.description}</Text>
          <Text style={[styles.cardSize, { color: colors.textSecondary }]}>
            ~{region.estimatedSizeMB} MB
          </Text>
        </View>
        <View style={styles.cardActions}>
          {region.isDownloaded ? (
            <View style={styles.downloadedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.downloadedText, { color: colors.success }]}>Downloaded</Text>
              <TouchableOpacity
                onPress={() => onDelete(region.id)}
                style={styles.deleteButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={`Delete ${region.name}`}
                accessibilityRole="button"
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ) : isDownloading ? (
            <View style={styles.downloadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.progressText, { color: colors.primary }]}>{Math.round(downloadProgress)}%</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.downloadButton, { backgroundColor: colors.primary }]}
              onPress={() => onDownload(region)}
              accessibilityLabel={`Download ${region.name}`}
              accessibilityRole="button"
            >
              <Ionicons name="download-outline" size={20} color={colors.surface} />
              <Text style={[styles.downloadButtonText, { color: colors.surface }]}>Download</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {isDownloading && (
        <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
          <View
            style={[styles.progressBar, { width: `${downloadProgress}%`, backgroundColor: colors.primary }]}
          />
        </View>
      )}
    </View>
  );
};

export const OfflineMapsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { data: downloadedPacks } = useOfflinePacks();
  const regions = useAvailableRegions();
  const downloadMutation = useDownloadPack();
  const deleteMutation = useDeletePack();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const totalStorageMB = downloadedPacks
    ? downloadedPacks.reduce((sum, p) => sum + (p.downloadSize || 0), 0) / (1024 * 1024)
    : 0;

  const handleDownload = useCallback((region: MapRegionPreset) => {
    const mapRegion: MapRegion = {
      ...region,
      minZoom: 10,
      maxZoom: 16,
    };

    setDownloadingId(region.id);
    setDownloadProgress(0);

    downloadMutation.mutate(
      {
        region: mapRegion,
        onProgress: (status: OfflinePackStatus) => {
          setDownloadProgress(status.percentage);
        },
      },
      {
        onSuccess: () => {
          setDownloadingId(null);
          setDownloadProgress(0);
        },
        onError: () => {
          setDownloadingId(null);
          setDownloadProgress(0);
          Alert.alert('Download Failed', 'Could not download the map pack. Please try again.');
        },
      }
    );
  }, [downloadMutation]);

  const handleDelete = useCallback((regionId: string) => {
    const region = regions.find(r => r.id === regionId);
    Alert.alert(
      'Delete Map Pack',
      `Remove "${region?.name}" offline map? This frees ${region?.estimatedSizeMB} MB.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(regionId),
        },
      ]
    );
  }, [regions, deleteMutation]);

  const renderRegionItem = useCallback(({ item }: { item: MapRegionPreset & { isDownloaded: boolean } }) => (
    <RegionCard
      region={item}
      onDownload={handleDownload}
      onDelete={handleDelete}
      downloadingId={downloadingId}
      downloadProgress={downloadProgress}
    />
  ), [handleDownload, handleDelete, downloadingId, downloadProgress]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Offline Maps</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Download regions for offline use
        </Text>
      </View>

      <View style={[styles.storageCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
        <Ionicons name="cloud-download-outline" size={24} color={colors.primary} />
        <View style={styles.storageInfo}>
          <Text style={[styles.storageLabel, { color: colors.textSecondary }]}>Storage Used</Text>
          <Text style={[styles.storageValue, { color: colors.text }]}>{totalStorageMB.toFixed(1)} MB</Text>
        </View>
        <View style={styles.packCount}>
          <Text style={[styles.packCountValue, { color: colors.primary }]}>{downloadedPacks?.length || 0}</Text>
          <Text style={[styles.packCountLabel, { color: colors.textSecondary }]}>packs</Text>
        </View>
      </View>

      <FlatList
        data={regions}
        keyExtractor={item => item.id}
        renderItem={renderRegionItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  storageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  storageInfo: {
    flex: 1,
    marginLeft: 12,
  },
  storageLabel: {
    fontSize: 12,
  },
  storageValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  packCount: {
    alignItems: 'center',
  },
  packCountValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  packCountLabel: {
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  cardSize: {
    fontSize: 12,
    marginTop: 4,
  },
  cardActions: {
    alignItems: 'flex-end',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadedText: {
    fontSize: 13,
    marginLeft: 4,
    marginRight: 8,
  },
  deleteButton: {
    padding: 12,
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
