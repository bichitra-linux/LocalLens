export interface AppSettings {
  searchRadius: number;          // 1-50 km, default 5
  defaultExpirationDays: number; // 1-30 days, default 7
  notificationsEnabled: boolean; // default true
  autoSyncEnabled: boolean;      // default true
  cacheWifiOnly: boolean;        // default true
  personalizedAds: boolean;      // GDPR consent for personalized ads, default false
}

export const DEFAULT_SETTINGS: AppSettings = {
  searchRadius: 5,
  defaultExpirationDays: 7,
  notificationsEnabled: true,
  autoSyncEnabled: true,
  cacheWifiOnly: true,
  personalizedAds: false,
};
