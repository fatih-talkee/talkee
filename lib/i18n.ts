import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { getItem, setItem } from './storage';

import en from '../locales/en.json';
import tr from '../locales/tr.json';
import es from '../locales/es.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';

const resources = {
  en: { translation: en },
  tr: { translation: tr },
  es: { translation: es },
  de: { translation: de },
  fr: { translation: fr },
};

const fallback = 'en';

async function detect(): Promise<string> {
  try {
    const saved = await getItem<string>('lang');
    if (saved) {
      console.log('[i18n] Using saved language:', saved);
      return saved;
    }
    
    try {
      const deviceTag = Localization.getLocales?.()[0]?.languageTag || '';
      const base = deviceTag.split('-')[0];
      const aliases: Record<string, string> = { az: 'tr' };
      const normalized = aliases[base] || base;
      const supported = Object.keys(resources);
      const detected = supported.includes(normalized) ? normalized : fallback;
      console.log('[i18n] Detected device language:', detected, 'from tag:', deviceTag);
      return detected;
    } catch (error) {
      console.warn('[i18n] Error detecting device language, using fallback:', error);
      return fallback;
    }
  } catch (error) {
    console.error('[i18n] Error in language detection:', error);
    return fallback;
  }
}

let initialized = false;

export async function initI18n(): Promise<void> {
  if (initialized) {
    console.log('[i18n] Already initialized, skipping');
    return;
  }
  
  try {
    console.log('[i18n] Starting initialization...');
    const lng = await detect();
    console.log('[i18n] Detected language:', lng);
    
    await i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: fallback,
      defaultNS: 'translation',
      interpolation: { escapeValue: false },
      returnNull: false,
    });

    console.log('[i18n] Initialization complete');
    initialized = true;
  } catch (error) {
    console.error('[i18n] Initialization error:', error);
    // Re-throw to be handled by caller
    throw error;
  }
}

export async function setLanguage(lang: string): Promise<void> {
  await i18n.changeLanguage(lang);
  await setItem('lang', lang);
}

export default i18n;
