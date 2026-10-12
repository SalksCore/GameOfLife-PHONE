import { LANGUAGES, useI18n, type Language } from '../i18n';
import { usePrefs } from '../lib/prefs';

/** Réglages d'affichage, propres à l'appareil */
export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const { prefs, setPref } = usePrefs();

  return (
    <main className="game-bg settings-screen">
      <header className="room-top">
        <button className="btn-ghost" onClick={onBack}>
          ← {t('common.back')}
        </button>
      </header>

      <h1 className="screen-title">{t('settings.title')}</h1>

      <section className="glass-card stack">
        <h2 className="section-title">{t('settings.language')}</h2>
        <div className="choice-row" role="radiogroup" aria-label={t('settings.language')}>
          {(Object.keys(LANGUAGES) as Language[]).map((code) => (
            <button
              key={code}
              role="radio"
              aria-checked={prefs.language === code}
              className="choice"
              onClick={() => setPref('language', code)}
            >
              {LANGUAGES[code]}
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card stack">
        <h2 className="section-title">{t('settings.display')}</h2>

        <label className="switch-row">
          <span>
            <strong>{t('settings.colorBlind')}</strong>
            <small>{t('settings.colorBlindHint')}</small>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={prefs.colorBlind}
            onChange={(e) => setPref('colorBlind', e.target.checked)}
          />
        </label>

        <label className="switch-row">
          <span>
            <strong>{t('settings.powerSaver')}</strong>
            <small>{t('settings.powerSaverHint')}</small>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={prefs.powerSaver}
            onChange={(e) => setPref('powerSaver', e.target.checked)}
          />
        </label>
      </section>

      <p className="muted small center-text">{t('settings.storage')}</p>
    </main>
  );
}
