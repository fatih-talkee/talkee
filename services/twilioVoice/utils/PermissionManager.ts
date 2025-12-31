import { PermissionsAndroid, Platform } from 'react-native';
import { logger } from '@/lib/logger';
import { PermissionError } from '../types/ErrorTypes';

/**
 * Utility class for managing microphone permissions
 */
export class PermissionManager {
  /**
   * Ensure microphone permission is granted (Android only)
   * @param debugId - Optional debug ID for logging
   * @throws Error if permission is not granted
   */
  static async ensureMicrophonePermission(
    debugId?: string
  ): Promise<void> {
    const permissionStartTime = Date.now();
    logger.debug('[PermissionManager] 🎤 Checking microphone permission', {
      platform: Platform.OS,
      debugId,
      timestamp: new Date().toISOString(),
    });

    // iOS handles permissions automatically via CallKit
    if (Platform.OS !== 'android') {
      logger.debug(
        '[PermissionManager] ⏭️ Skipping permission check (not Android)',
        {
          platform: Platform.OS,
          debugId,
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }

    const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    const checkStartTime = Date.now();
    const alreadyGranted = await PermissionsAndroid.check(permission);
    const checkElapsed = Date.now() - checkStartTime;

    logger.debug('[PermissionManager] 🔍 Permission check result', {
      alreadyGranted,
      elapsed: `${checkElapsed}ms`,
      debugId,
      timestamp: new Date().toISOString(),
    });

    if (alreadyGranted) {
      logger.info(
        '[PermissionManager] ✅ RECORD_AUDIO permission already granted',
        {
          debugId,
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }

    logger.info('[PermissionManager] 🔔 Requesting RECORD_AUDIO permission', {
      debugId,
      timestamp: new Date().toISOString(),
    });

    const requestStartTime = Date.now();
    const result = await PermissionsAndroid.request(permission, {
      title: 'Microphone permission',
      message: 'Talkee needs microphone access to start a call.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    const requestElapsed = Date.now() - requestStartTime;
    const totalElapsed = Date.now() - permissionStartTime;

    logger.info('[PermissionManager] 📊 RECORD_AUDIO permission result', {
      debugId,
      result,
      isGranted: result === PermissionsAndroid.RESULTS.GRANTED,
      requestElapsed: `${requestElapsed}ms`,
      totalElapsed: `${totalElapsed}ms`,
      timestamp: new Date().toISOString(),
    });

    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      logger.error(
        '[PermissionManager] ❌ Microphone permission not granted',
        undefined,
        {
          debugId,
          result,
          timestamp: new Date().toISOString(),
        }
      );
      throw new PermissionError(
        'Microphone permission not granted',
        'RECORD_AUDIO',
        debugId
      );
    }

    logger.info('[PermissionManager] ✅ RECORD_AUDIO permission granted', {
      debugId,
      timestamp: new Date().toISOString(),
    });
  }
}

