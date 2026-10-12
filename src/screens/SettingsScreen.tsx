import { Icon } from '../components/Icon';
import { LANGUAGES, useI18n, type Language } from '../i18n';
import { usePrefs } from '../lib/prefs';

/** Onglet « Réglages » : affichage propre à l'appareil */
export function SettingsScreen() {
  const { t } = useI18n();
  const { prefs, setPref } = usePrefs();

  return (
    <main className="screen with-tabbar settings-screen">
      <header className="page-head">
        <h1>{t('settings.title')}</h1>
      </header>

      <section className="card list-card">
        <h2 className="list-title">
          <Icon name="globe" size={18} /> {t('settings.language')}
        </h2>
        <div className="segmented" role="radiogroup" aria-label={t('settings.language')}>
          {(Object.keys(LANGUAGES) as Language[]).map((code) => (
            <button
              key={code}
              role="radio"
              aria-checked={prefs.language === code}
              onClick={() => setPref('language', code)}
            >
              {LANGUAGES[code]}
            </button>
          ))}
        </div>
      </section>

      <section className="card list-card">
        <h2 className="list-title">{t('settings.display')}</h2>

        <label className="switch-row">
          <span className="switch-icon">
            <Icon name="contrast" />
          </span>
          <span className="switch-text">
            <strong>{t('settings.colorBlind')}</strong>
            <small>{t('settings.colorBlindHint')}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={prefs.colorBlind}
            onChange={(e) => setPref('colorBlind', e.target.checked)}
          />
        </label>

        <label className="switch-row">
          <span className="switch-icon">
            <Icon name="battery" />
          </span>
          <span className="switch-text">
            <strong>{t('settings.powerSaver')}</strong>
            <small>{t('settings.powerSaverHint')}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={prefs.powerSaver}
            onChange={(e) => setPref('powerSaver', e.target.checked)}
          />
        </label>
      </section>

      <p className="footnote">{t('settings.storage')}</p>
    </main>
  );
}
