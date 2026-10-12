import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { detectLanguage, type Language } from '../i18n';

/**
 * Préférences d'affichage du joueur, propres à l'appareil (localStorage).
 * Elles sont appliquées via des attributs sur <html>, lus par la feuille de style.
 */
export interface Prefs {
  language: Language;
  /** Palette plus contrastée et motifs, pour les daltoniens */
  colorBlind: boolean;
  /** Fond noir, animations et flous désactivés : moins de batterie */
  powerSaver: boolean;
}

const KEY = 'gol.prefs';

function load(): Prefs {
  const defaults: Prefs = { language: detectLanguage(), colorBlind: false, powerSaver: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<Prefs>;
    return {
      language: saved.language === 'fr' || saved.language === 'en' ? saved.language : defaults.language,
      colorBlind: saved.colorBlind === true,
      powerSaver: saved.powerSaver === true,
    };
  } catch {
    // Stockage indisponible (navigation privée…) : réglages par défaut
    return defaults;
  }
}

interface PrefsState {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
}

const PrefsContext = createContext<PrefsState | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(load);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = prefs.language;
    root.dataset.colorBlind = String(prefs.colorBlind);
    root.dataset.powerSaver = String(prefs.powerSaver);
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      // Sans stockage, les réglages valent pour la session en cours
    }
  }, [prefs]);

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  }, []);

  const value = useMemo(() => ({ prefs, setPref }), [prefs, setPref]);
  return <PrefsContext value={value}>{children}</PrefsContext>;
}

export function usePrefs(): PrefsState {
  const ctx = use(PrefsContext);
  if (!ctx) throw new Error('usePrefs doit être utilisé dans <PrefsProvider>');
  return ctx;
}
