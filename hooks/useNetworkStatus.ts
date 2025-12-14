import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { logger } from '@/lib/logger';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: NetInfoStateType;
}

/**
 * Hook to monitor network connectivity status
 * Returns current network state and connection type
 * Works on both mobile (iOS/Android) and web platforms
 */
export function useNetworkStatus(): NetworkStatus {
  const [networkState, setNetworkState] = useState<NetworkStatus>({
    isConnected: true, // Optimistic default
    isInternetReachable: true,
    type: NetInfoStateType.unknown,
  });

  useEffect(() => {
    // Web platform: Use navigator.onLine API
    if (Platform.OS === 'web') {
      const updateWebNetworkState = () => {
        const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
        setNetworkState({
          isConnected: isOnline,
          isInternetReachable: isOnline,
          type: NetInfoStateType.wifi, // Web doesn't have specific type
        });

        if (isOnline) {
          logger.info('Network connected (web)');
        } else {
          logger.warn('Network disconnected (web)');
        }
      };

      // Get initial state
      updateWebNetworkState();

      // Listen to online/offline events
      window.addEventListener('online', updateWebNetworkState);
      window.addEventListener('offline', updateWebNetworkState);

      return () => {
        window.removeEventListener('online', updateWebNetworkState);
        window.removeEventListener('offline', updateWebNetworkState);
      };
    }

    // Mobile platform: Use NetInfo
    // Get initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type,
      });
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const newState: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type,
      };

      setNetworkState(newState);

      // Log network state changes
      if (newState.isConnected) {
        logger.info('Network connected', {
          type: newState.type,
          internetReachable: newState.isInternetReachable,
        });
      } else {
        logger.warn('Network disconnected', {
          type: newState.type,
          internetReachable: newState.isInternetReachable,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return networkState;
}

/**
 * Simple hook that returns only connection status (boolean)
 */
export function useIsOnline(): boolean {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  
  // Consider offline if not connected OR if internet is explicitly not reachable
  return isConnected && (isInternetReachable !== false);
}

