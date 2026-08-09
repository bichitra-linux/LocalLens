import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '../../utils/theme';
import { AppSettings, DEFAULT_SETTINGS } from '../../domain/entities/Settings';
import { useAppStore } from './appStore';

interface SettingsState extends AppSettings {
  theme: ThemeMode;
  
  setTheme: (theme: ThemeMode) => void;
  setSearchRadius: (radius: number) => void;
  setDefaultExpirationDays: (days: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setAutoSyncEnabled: (enabled: boolean) => void;
  setCacheWifiOnly: (wifiOnly: boolean) => void;
  setPersonalizedAds: (enabled: boolean) => void;
  resetSettings: () => void;
  initializeSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set) => ({
        theme: 'system' as ThemeMode,
        ...DEFAULT_SETTINGS,
        
        setTheme: (theme) => set({ theme }, false, 'setTheme'),
        setSearchRadius: (radius) => {
          set({ searchRadius: radius }, false, 'setSearchRadius');
          useAppStore.getState().setSearchRadius(radius);
        },
        setDefaultExpirationDays: (defaultExpirationDays) => set({ defaultExpirationDays }, false, 'setDefaultExpirationDays'),
        setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }, false, 'setNotificationsEnabled'),
        setAutoSyncEnabled: (autoSyncEnabled) => set({ autoSyncEnabled }, false, 'setAutoSyncEnabled'),
        setCacheWifiOnly: (cacheWifiOnly) => set({ cacheWifiOnly }, false, 'setCacheWifiOnly'),
        setPersonalizedAds: (personalizedAds) => set({ personalizedAds }, false, 'setPersonalizedAds'),
        resetSettings: () => set({ ...DEFAULT_SETTINGS, theme: 'system' }, false, 'resetSettings'),
        initializeSettings: () => {
          const state = useSettingsStore.getState();
          useAppStore.getState().setSearchRadius(state.searchRadius);
        },
      }),
      {
        name: 'locallens-settings',
        storage: createJSONStorage(() => AsyncStorage),
      }
    ),
    { name: 'LocalLens Settings' }
  )
);
