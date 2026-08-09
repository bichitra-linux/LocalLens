import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isOnline: boolean;
  isInternetReachable: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown' | 'none';
  isWifi: boolean;
  isCellular: boolean;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: false,
    isInternetReachable: false,
    connectionType: 'unknown',
    isWifi: false,
    isCellular: false,
  });

  const updateStatus = useCallback((state: NetInfoState) => {
    const isConnected = state.isConnected ?? false;
    const isReachable = state.isInternetReachable ?? false;
    const type = state.type as string;

    setStatus({
      isOnline: isConnected && isReachable,
      isInternetReachable: isReachable,
      connectionType: isConnected ? (type as NetworkStatus['connectionType']) : 'none',
      isWifi: type === 'wifi',
      isCellular: type === 'cellular',
    });
  }, []);

  useEffect(() => {
    NetInfo.fetch().then((state: NetInfoState) => {
      updateStatus(state);
    });

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      updateStatus(state);
    });

    return () => unsubscribe();
  }, [updateStatus]);

  return status;
};


