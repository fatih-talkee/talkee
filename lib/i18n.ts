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
  const saved = await getItem<string>('lang');
  if (saved) return saved;
  const deviceTag = Localization.getLocales?.()[0]?.languageTag || '';
  const base = deviceTag.split('-')[0];
  const aliases: Record<string, string> = { az: 'tr' };
  const normalized = aliases[base] || base;
  const supported = Object.keys(resources);
  return supported.includes(normalized) ? normalized : fallback;
}

let initialized = false;

export async function initI18n(): Promise<void> {
  if (initialized) return;
  const lng = await detect();
  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: fallback,
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  // Note: expo-localization does not provide a change event in Expo Go.
  // If you need live updates on device locale change, handle it on app resume.

  initialized = true;
}

export async function setLanguage(lang: string): Promise<void> {
  await i18n.changeLanguage(lang);
  await setItem('lang', lang);
}

export default i18n;
