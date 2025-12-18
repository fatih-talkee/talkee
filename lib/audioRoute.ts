import { NativeModules, Platform } from 'react-native';
import { logger } from '@/lib/logger';

type TalkeeAudioRouteNative = {
  setSpeakerEnabled: (enabled: boolean) => Promise<boolean> | boolean;
  getSpeakerEnabled: () => Promise<boolean> | boolean;
};

const Native: TalkeeAudioRouteNative | undefined = (NativeModules as any)
  ?.TalkeeAudioRoute;

export async function setSpeakerEnabled(enabled: boolean): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (!Native?.setSpeakerEnabled) {
    logger.warn('[AudioRoute] TalkeeAudioRoute native module not available');
    return false;
  }

  const res = await Native.setSpeakerEnabled(enabled);
  return typeof res === 'boolean' ? res : true;
}

export async function getSpeakerEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!Native?.getSpeakerEnabled) return false;
  const res = await Native.getSpeakerEnabled();
  return !!res;
}
