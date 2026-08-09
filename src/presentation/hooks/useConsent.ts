import { useEffect, useRef } from 'react';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';
import { useSettingsStore } from '../store/settingsStore';

export const useConsent = () => {
  const initialized = useRef(false);
  const setPersonalizedAds = useSettingsStore((s) => s.setPersonalizedAds);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    mobileAds()
      .initialize()
      .then(() => mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.G,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      }))
      .then(() => {
        // Set ad targeting based on user consent preference
        const currentSetting = useSettingsStore.getState().personalizedAds;
        mobileAds().setRequestConfiguration({
          maxAdContentRating: currentSetting ? MaxAdContentRating.MA : MaxAdContentRating.G,
        });
        // ponytail: full UMP ConsentForm flow would check EU region
        // and show Google's consent dialog; for now the toggle controls
        // ad content rating. Full UMP flow needs play-services-ads-identifier.
      })
      .catch((e: unknown) => {
        if (__DEV__) console.warn('[Ads] Init failed:', e);
      });
  }, [setPersonalizedAds]);
};
