import { Platform, NativeModules } from 'react-native';
import { logger } from '@/lib/logger';
import { twilioVoiceService } from '@/services/twilioVoice.service';

/**
 * Audio routing for Twilio Voice calls - DIAGNOSTIC VERSION
 * Logs all available methods to help find the right API
 */

const { TwilioVoiceReactNative } = NativeModules;

export async function setSpeakerEnabled(enabled: boolean): Promise<boolean> {
  if (Platform.OS === 'web') {
    logger.warn('[AudioRoute] Web platform does not support speaker toggle');
    return false;
  }

  try {
    const activeCall = twilioVoiceService.getActiveCall();

    if (!activeCall) {
      logger.warn('[AudioRoute] No active call - cannot toggle speaker');
      return false;
    }

    // 🔍 DIAGNOSTIC: Log all available properties and methods
    const callProto = Object.getPrototypeOf(activeCall);
    const callKeys = Object.keys(activeCall);
    const protoKeys = Object.getOwnPropertyNames(callProto);

    logger.info('[AudioRoute] 🔍 DIAGNOSTIC - Call object analysis', {
      callKeys: callKeys.slice(0, 20), // First 20 keys
      protoKeys: protoKeys.slice(0, 20),
      audioMethods: {
        setSpeakerPhone: typeof (activeCall as any).setSpeakerPhone,
        selectAudioDevice: typeof (activeCall as any).selectAudioDevice,
        getAudioDevices: typeof (activeCall as any).getAudioDevices,
        getSelectedAudioDevice: typeof (activeCall as any)
          .getSelectedAudioDevice,
        isSpeakerPhoneOn: typeof (activeCall as any).isSpeakerPhoneOn,
      },
      nativeModules: {
        TwilioVoiceReactNative: !!TwilioVoiceReactNative,
        hasSpeakerPhone: TwilioVoiceReactNative
          ? typeof TwilioVoiceReactNative.setSpeakerPhone
          : 'N/A',
      },
    });

    logger.info('[AudioRoute] Setting speaker', {
      enabled,
      platform: Platform.OS,
    });

    // Try all possible methods in order of preference

    // Method 1: Native module direct call
    if (
      TwilioVoiceReactNative &&
      typeof TwilioVoiceReactNative.setSpeakerPhone === 'function'
    ) {
      try {
        TwilioVoiceReactNative.setSpeakerPhone(enabled);
        logger.info(
          '[AudioRoute] ✅ Method 1 SUCCESS: TwilioVoiceReactNative.setSpeakerPhone',
          { enabled }
        );
        return true;
      } catch (err) {
        logger.warn(
          '[AudioRoute] ❌ Method 1 FAILED: TwilioVoiceReactNative.setSpeakerPhone',
          {
            error: err instanceof Error ? err.message : String(err),
          }
        );
      }
    }

    // Method 2: Call object setSpeakerPhone
    if (typeof (activeCall as any).setSpeakerPhone === 'function') {
      try {
        (activeCall as any).setSpeakerPhone(enabled);
        logger.info('[AudioRoute] ✅ Method 2 SUCCESS: Call.setSpeakerPhone', {
          enabled,
        });
        return true;
      } catch (err) {
        logger.warn('[AudioRoute] ❌ Method 2 FAILED: Call.setSpeakerPhone', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Method 3: selectAudioDevice with device name
    if (typeof (activeCall as any).selectAudioDevice === 'function') {
      try {
        const deviceName = enabled ? 'Speaker' : 'Earpiece';
        (activeCall as any).selectAudioDevice(deviceName);
        logger.info(
          '[AudioRoute] ✅ Method 3 SUCCESS: Call.selectAudioDevice',
          {
            enabled,
            deviceName,
          }
        );
        return true;
      } catch (err) {
        logger.warn('[AudioRoute] ❌ Method 3 FAILED: Call.selectAudioDevice', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Method 4: getAudioDevices + select by index/uuid
    if (typeof (activeCall as any).getAudioDevices === 'function') {
      try {
        const devices = (activeCall as any).getAudioDevices();
        logger.info('[AudioRoute] Available audio devices', {
          devices,
          deviceCount: devices?.length,
        });

        if (devices && Array.isArray(devices) && devices.length > 0) {
          // Find speaker device
          const speakerDevice = devices.find(
            (d: any) =>
              d.name?.toLowerCase().includes('speaker') ||
              d.type?.toLowerCase().includes('speaker')
          );

          const earDevice = devices.find(
            (d: any) =>
              d.name?.toLowerCase().includes('ear') ||
              d.type?.toLowerCase().includes('ear') ||
              d.name?.toLowerCase().includes('receiver')
          );

          const targetDevice = enabled ? speakerDevice : earDevice;

          if (
            targetDevice &&
            typeof (activeCall as any).selectAudioDevice === 'function'
          ) {
            (activeCall as any).selectAudioDevice(targetDevice);
            logger.info(
              '[AudioRoute] ✅ Method 4 SUCCESS: selectAudioDevice with device object',
              {
                enabled,
                device: targetDevice,
              }
            );
            return true;
          }
        }
      } catch (err) {
        logger.warn(
          '[AudioRoute] ❌ Method 4 FAILED: getAudioDevices + select',
          {
            error: err instanceof Error ? err.message : String(err),
          }
        );
      }
    }

    logger.warn(
      '[AudioRoute] ❌ ALL METHODS FAILED - No working audio routing method found',
      {
        hasTwilioModule: !!TwilioVoiceReactNative,
        callMethods: {
          setSpeakerPhone: typeof (activeCall as any).setSpeakerPhone,
          selectAudioDevice: typeof (activeCall as any).selectAudioDevice,
          getAudioDevices: typeof (activeCall as any).getAudioDevices,
        },
      }
    );
    return false;
  } catch (error) {
    logger.error('[AudioRoute] ❌ EXCEPTION in setSpeakerEnabled', error, {
      enabled,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

export async function getSpeakerEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const activeCall = twilioVoiceService.getActiveCall();

    if (!activeCall) {
      return false;
    }

    // Method 1: getSelectedAudioDevice
    if (typeof (activeCall as any).getSelectedAudioDevice === 'function') {
      try {
        const device = (activeCall as any).getSelectedAudioDevice();
        const isSpeaker =
          device?.name?.toLowerCase().includes('speaker') ||
          device?.type?.toLowerCase().includes('speaker') ||
          device === 'Speaker';
        logger.info('[AudioRoute] Speaker state from getSelectedAudioDevice', {
          device,
          isSpeaker,
        });
        return isSpeaker;
      } catch (err) {
        logger.warn('[AudioRoute] getSelectedAudioDevice failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Method 2: isSpeakerPhoneOn
    if (typeof (activeCall as any).isSpeakerPhoneOn === 'function') {
      try {
        const enabled = (activeCall as any).isSpeakerPhoneOn();
        logger.info('[AudioRoute] Speaker state from isSpeakerPhoneOn', {
          enabled,
        });
        return enabled;
      } catch (err) {
        logger.warn('[AudioRoute] isSpeakerPhoneOn failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Fallback: assume earpiece (safer default)
    logger.info(
      '[AudioRoute] Cannot determine speaker state, assuming earpiece'
    );
    return false;
  } catch (error) {
    logger.error('[AudioRoute] Error getting speaker state', error);
    return false;
  }
}

/**
 * Get available audio devices
 */
export async function getAvailableAudioDevices(): Promise<string[]> {
  if (Platform.OS === 'web') {
    return [];
  }

  try {
    const activeCall = twilioVoiceService.getActiveCall();

    if (!activeCall) {
      return [];
    }

    if (typeof (activeCall as any).getAudioDevices === 'function') {
      const devices = (activeCall as any).getAudioDevices();
      logger.info('[AudioRoute] Available audio devices', { devices });
      return devices || [];
    }

    // Fallback: typical mobile devices
    return ['earpiece', 'speaker'];
  } catch (error) {
    logger.error('[AudioRoute] Error getting audio devices', error);
    return ['earpiece', 'speaker'];
  }
}
