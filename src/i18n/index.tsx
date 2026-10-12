import { createContext, use, useMemo, type ReactNode } from 'react';
import { usePrefs } from '../lib/prefs';
import { en } from './en';
import { fr, type TranslationKey } from './fr';

export const LANGUAGES = { fr: 'Français', en: 'English' } as const;
export type Language = keyof typeof LANGUAGES;

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { fr, en };

export type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;

interface I18n {
  lang: Language;
  t: Translate;
  /** Traduit un message d'erreur renvoyé par le serveur (français par défaut) */
  tServer: (message: string | undefined) => string;
  locale: string;
}

const I18nContext = createContext<I18n | null>(null);

export function detectLanguage(): Language {
  const stored = navigator.languages ?? [navigator.language];
  return stored.some((l) => l.toLowerCase().startsWith('fr')) ? 'fr' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { prefs } = usePrefs();
  const lang = prefs.language;

  const value = useMemo<I18n>(() => {
    const dict = DICTIONARIES[lang];
    const t: Translate = (key, values) => {
      const text = dict[key] ?? fr[key] ?? key;
      return values
        ? text.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match))
        : text;
    };
    return {
      lang,
      t,
      tServer: (message) => {
        if (!message) return '';
        const key = `server.${message}` as TranslationKey;
        return dict[key] ?? message;
      },
      locale: lang === 'fr' ? 'fr-FR' : 'en-GB',
    };
  }, [lang]);

  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const ctx = use(I18nContext);
  if (!ctx) throw new Error('useI18n doit être utilisé dans <I18nProvider>');
  return ctx;
}
