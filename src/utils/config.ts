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
    googleWebClientId: string;
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
    authHost: string;
    authPort: number;
    firestoreHost: string;
    firestorePort: number;
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
    googleWebClientId: getString(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, ''),
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
    authHost: getString(process.env.EXPO_PUBLIC_AUTH_EMULATOR_HOST, 'localhost'),
    authPort: getNumber(process.env.EXPO_PUBLIC_AUTH_EMULATOR_PORT, 9099),
    firestoreHost: getString(process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST, 'localhost'),
    firestorePort: getNumber(process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT, 8080),
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

export const APP_CONFIG = {
  osrmBaseUrl: 'https://router.project-osrm.org',
  appUrl: 'https://locallens.app',
  defaultMapCenter: { latitude: 40.7128, longitude: -74.006 },
  walkingSpeedMps: 1.39,
  maxRetries: 5,
  maxCachedNotes: 200,
  maxDrafts: 10,
  staleDays: 7,
};

export default config;