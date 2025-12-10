/**
 * User Preferences Service
 *
 * Handles default theme and language preferences for new users
 * based on device settings.
 */

import * as Localization from 'expo-localization';
import { Appearance } from 'react-native';
import type { Locale } from 'expo-localization';

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
   * Supports: Turkish (tr), English (en)
   * Fallback: Turkish (tr) for Turkish market
   *
   * @returns 'tr' | 'en'
   */
  static getDefaultLanguage(): LanguagePreference {
    try {
      // Get device locale (e.g., 'tr-TR', 'en-US', 'de-DE')
      const deviceLocale = Localization.getLocales()[0]?.languageCode;

      // Extract language code (e.g., 'tr', 'en', 'de')
      const languageCode = deviceLocale?.split('-')[0].toLowerCase();

      // Check if we support this language
      const supportedLanguages: LanguagePreference[] = ['tr', 'en'];

      if (supportedLanguages.includes(languageCode as LanguagePreference)) {
        return languageCode as LanguagePreference;
      }

      // Fallback to Turkish for unsupported languages
      return 'tr';
    } catch (error) {
      console.error('[UserPreferences] Error getting device language:', error);
      return 'tr'; // Safe fallback
    }
  }

  /**
   * Get current device appearance (for debugging/logging)
   *
   * @returns 'light' | 'dark' | null
   */
  static getCurrentDeviceTheme(): 'light' | 'dark' | null {
    return Appearance.getColorScheme() as 'light' | 'dark' | null;
  }

  /**
   * Get complete device locale info (for debugging)
   *
   * @returns Object with locale details
   */
  static getDeviceLocaleInfo() {
    const firstLocale = Localization.getLocales()[0];
    const firstCalendar = Localization.getCalendars()[0];

    return {
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
  }
}
