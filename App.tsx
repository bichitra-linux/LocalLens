import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from './src/presentation/store/queryClient';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { logDummyCredentials } from './src/utils/devSeeder';

export default function App() {
  useEffect(() => {
    // Log dummy credentials in development
    if (__DEV__) {
      logDummyCredentials();
    }
  }, []);

  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </QueryProvider>
    </SafeAreaProvider>
  );
}
