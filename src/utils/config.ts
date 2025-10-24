/**
 * Configuration utility to centralize environment variable access
 * This provides type safety and fallbacks for all environment variables
 */

export interface AppConfig {
  // Environment
  env: 'development' | 'staging' | 'production';
  isDevelopment: boolean;
  isProduction: boolean;
  
  // Firebase
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  
  // Features
  features: {
    analyticsEnabled: boolean;
    crashlyticsEnabled: boolean;
    devModeEnabled: boolean;
    dummyUsersEnabled: boolean;
  };
  
  // Emulators (for development)
  emulators: {
    useFirebaseEmulator: boolean;
    firestoreHost: string;
    firestorePort: number;
    storageHost: string;
    storagePort: number;
  };
}

// Helper function to get boolean from string
const getBoolean = (value: string | undefined, defaultValue: boolean = false): boolean => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Helper function to get string with fallback
const getString = (value: string | undefined, fallback: string): string => {
  return value || fallback;
};

// Helper function to get number with fallback
const getNumber = (value: string | undefined, fallback: number): number => {
  const num = value ? parseInt(value, 10) : NaN;
  return isNaN(num) ? fallback : num;
};

// Create configuration object
export const config: AppConfig = {
  // Environment detection
  env: (process.env.EXPO_PUBLIC_ENV as any) || 'development',
  isDevelopment: __DEV__ || process.env.EXPO_PUBLIC_ENV !== 'production',
  isProduction: process.env.EXPO_PUBLIC_ENV === 'production',
  
  // Firebase configuration
  firebase: {
    apiKey: getString(process.env.EXPO_PUBLIC_FIREBASE_API_KEY, 'demo-key-fallback'),
    authDomain: getString(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, 'demo-project.firebaseapp.com'),
    projectId: getString(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, 'demo-project'),
    storageBucket: getString(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET, 'demo-project.appspot.com'),
    messagingSenderId: getString(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, '123456789'),
    appId: getString(process.env.EXPO_PUBLIC_FIREBASE_APP_ID, '1:123456789:web:demo'),
  },
  
  // Feature flags
  features: {
    analyticsEnabled: getBoolean(process.env.EXPO_PUBLIC_ANALYTICS_ENABLED, false),
    crashlyticsEnabled: getBoolean(process.env.EXPO_PUBLIC_CRASHLYTICS_ENABLED, false),
    devModeEnabled: getBoolean(process.env.EXPO_PUBLIC_DEV_MODE, __DEV__),
    dummyUsersEnabled: getBoolean(process.env.EXPO_PUBLIC_DUMMY_USERS_ENABLED, __DEV__),
  },
  
  // Firebase emulator settings
  emulators: {
    useFirebaseEmulator: getBoolean(process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR, false),
    firestoreHost: getString(process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST, 'localhost'),
    firestorePort: getNumber(process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT, 8080),
    storageHost: getString(process.env.EXPO_PUBLIC_STORAGE_EMULATOR_HOST, 'localhost'),
    storagePort: getNumber(process.env.EXPO_PUBLIC_STORAGE_EMULATOR_PORT, 9199),
  },
};

// Log configuration in development
if (config.isDevelopment) {
  console.log('⚙️ App Configuration:', {
    env: config.env,
    projectId: config.firebase.projectId,
    features: config.features,
    emulators: config.emulators.useFirebaseEmulator ? 'enabled' : 'disabled',
  });
  
  // Warn about fallback values
  if (config.firebase.apiKey === 'demo-key-fallback') {
    console.warn('⚠️ Using fallback Firebase configuration - check .env.local file');
  }
}

export default config;