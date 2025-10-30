## i18n (Internationalization) Setup

Stack:

- i18next + react-i18next
- expo-localization (device locale detection)
- AsyncStorage persistence via `lib/storage.ts`

Files:

- `lib/i18n.ts` — initialization and `setLanguage`
- `locales/en.json`, `locales/tr.json` — single file per language
- `app/settings/language.tsx` — language switch UI

Usage:

```ts
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
```

Change language:

```ts
import { setLanguage } from '@/lib/i18n';
await setLanguage('tr');
```

Notes:

- App auto-detects device language (normalized to supported locales) on first run.
- Add more languages by creating `locales/<code>.json` and mapping aliases if needed in `lib/i18n.ts`.
