/**
 * User Preferences Service
 *
 * Handles default theme and language preferences for new users
 * based on device settings.
 * ✅ OPTIMIZED: Logger integration, better error handling
 */

import * as Localization from 'expo-localization';
import { Appearance } from 'react-native';
import type { Locale } from 'expo-localization';
import { logger } from '@/lib/logger';

export type ThemePreference = 'light' | 'dark' | 'system';
export type LanguagePreference = 'tr' | 'en';

export class UserPreferencesService {
  /**
   * Get default theme based on device settings
   * Always returns 'system' to follow device appearance
   *
   * @returns 'system' - follows device light/dark mode
   */
  static getDefaultTheme(): ThemePreference {
    return 'system';
  }

  /**
   * Get default language based on device locale
   * ✅ OPTIMIZED: Added logger, better error handling
   * Supports: Turkish (tr), English (en)
   * Fallback: Turkish (tr) for Turkish market
   *
   * @returns 'tr' | 'en'
   */
  static getDefaultLanguage(): LanguagePreference {
    try {
      // Get device locale (e.g., 'tr-TR', 'en-US', 'de-DE')
      const deviceLocale = Localization.getLocales()[0]?.languageCode;

      logger.debug('[UserPreferences] 🔍 Detecting device language', {
        deviceLocale,
        timestamp: new Date().toISOString(),
      });

      // Extract language code (e.g., 'tr', 'en', 'de')
      const languageCode = deviceLocale?.split('-')[0].toLowerCase();

      // Check if we support this language
      const supportedLanguages: LanguagePreference[] = ['tr', 'en'];

      if (supportedLanguages.includes(languageCode as LanguagePreference)) {
        logger.info('[UserPreferences] ✅ Language detected', {
          language: languageCode,
          deviceLocale,
          timestamp: new Date().toISOString(),
        });
        return languageCode as LanguagePreference;
      }

      // Fallback to Turkish for unsupported languages
      logger.info('[UserPreferences] ℹ️ Unsupported language, using fallback', {
        detectedLanguage: languageCode,
        fallback: 'tr',
        deviceLocale,
        timestamp: new Date().toISOString(),
      });
      return 'tr';
    } catch (error) {
      logger.error(
        '[UserPreferences] ❌ Error getting device language',
        error,
        {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          fallback: 'tr',
          timestamp: new Date().toISOString(),
        }
      );
      return 'tr'; // Safe fallback
    }
  }

  /**
   * Get current device appearance (for debugging/logging)
   * ✅ OPTIMIZED: Added logger for debugging
   *
   * @returns 'light' | 'dark' | null
   */
  static getCurrentDeviceTheme(): 'light' | 'dark' | null {
    try {
      const theme = Appearance.getColorScheme() as 'light' | 'dark' | null;
      logger.debug('[UserPreferences] 🔍 Current device theme', {
        theme,
        timestamp: new Date().toISOString(),
      });
      return theme;
    } catch (error) {
      logger.warn('[UserPreferences] ⚠️ Error getting device theme', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      return null;
    }
  }

  /**
   * Get complete device locale info (for debugging)
   * ✅ OPTIMIZED: Added error handling and logger
   *
   * @returns Object with locale details
   */
  static getDeviceLocaleInfo() {
    try {
      const firstLocale = Localization.getLocales()[0];
      const firstCalendar = Localization.getCalendars()[0];

      const localeInfo = {
        locale: firstLocale?.languageCode || '',
        locales: Localization.getLocales(),
        timezone: firstCalendar?.timeZone || '',
        region: firstLocale?.regionCode || '',
        isRTL: firstLocale?.textDirection === 'rtl',
      } as {
        locale: string;
        locales: Locale[];
        timezone: string;
        region: string;
        isRTL: boolean;
      };

      logger.debug('[UserPreferences] 📱 Device locale info', {
        locale: localeInfo.locale,
        region: localeInfo.region,
        timezone: localeInfo.timezone,
        isRTL: localeInfo.isRTL,
        timestamp: new Date().toISOString(),
      });

      return localeInfo;
    } catch (error) {
      logger.error(
        '[UserPreferences] ❌ Error getting device locale info',
        error,
        {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );

      // Return safe fallback
      return {
        locale: '',
        locales: [],
        timezone: '',
        region: '',
        isRTL: false,
      } as {
        locale: string;
        locales: Locale[];
        timezone: string;
        region: string;
        isRTL: boolean;
      };
    }
  }
}
