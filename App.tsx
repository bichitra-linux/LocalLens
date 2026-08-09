import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from './src/presentation/store/queryClient';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { OfflineSyncService, GeospatialPollingService } from './src/utils/criticalSolutions';
import { OfflineQueueService } from './src/utils/offlineQueue';
import { ErrorBoundary } from './src/presentation/components/ErrorBoundary';
import { OfflineBanner } from './src/presentation/components/OfflineBanner';
import { useAppStore } from './src/presentation/store/appStore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { config } from './src/utils/config';
import { useConsent } from './src/presentation/hooks/useConsent';

GoogleSignin.configure({
  webClientId: config.firebase.googleWebClientId,
  offlineAccess: true,
});

const AppContent: React.FC = () => {
  const user = useAppStore((state) => state.user);
  const servicesStarted = useRef(false);
  useConsent();

  useEffect(() => {
    const pollingService = GeospatialPollingService.getInstance();
    const offlineSyncService = OfflineSyncService.getInstance();
    const offlineQueueService = OfflineQueueService.getInstance();

    if (user && !servicesStarted.current) {
      offlineSyncService.setupAutoSync();
      offlineQueueService.setupAutoProcess();
      pollingService.startIntelligentPolling();
      servicesStarted.current = true;
    }

    if (!user && servicesStarted.current) {
      pollingService.destroy();
      offlineSyncService.destroy();
      offlineQueueService.destroy();
      servicesStarted.current = false;
    }

    return () => {
      if (servicesStarted.current) {
        pollingService.destroy();
        offlineSyncService.destroy();
        offlineQueueService.destroy();
        servicesStarted.current = false;
      }
    };
  }, [user]);

  return (
    <>
      <OfflineBanner />
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryProvider>
          <AppContent />
        </QueryProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
