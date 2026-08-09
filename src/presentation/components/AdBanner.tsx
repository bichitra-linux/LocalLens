import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useTheme } from '../hooks/useTheme';
import { useSettingsStore } from '../store/settingsStore';

const adUnitId = Platform.select({
  ios: __DEV__ ? TestIds.BANNER : 'ca-app-pub-xxxxxxxxxxxx/yyyyyy',
  android: __DEV__ ? TestIds.BANNER : 'ca-app-pub-xxxxxxxxxxxx/zzzzzz',
  default: TestIds.BANNER,
});

interface AdBannerProps {
  size?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ size = 'banner' }) => {
  const { colors } = useTheme();
  const personalizedAds = useSettingsStore((s) => s.personalizedAds);

  if (__DEV__) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.border }]}>
        <Text style={[styles.placeholderText, { color: colors.textTertiary }]}>
          Ad Banner{personalizedAds ? ' (personalized)' : ''}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: !personalizedAds }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    marginVertical: 8,
  },
  placeholderText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});