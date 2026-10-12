import { useState } from 'react';
import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';
import type { Maintenance } from '../lib/status';

/** Affiché à la place du jeu pendant une maintenance */
export function MaintenanceScreen({
  gameName,
  maintenance,
  onRetry,
}: {
  gameName: string;
  maintenance: Maintenance;
  onRetry: () => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const [checking, setChecking] = useState(false);

  function eta(iso: string): string {
    const d = new Date(iso);
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === new Date().toDateString()) return t('maintenance.etaToday', { time });
    const day = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    return t('maintenance.etaDay', { day, time });
  }

  return (
    <main className="screen center-screen">
      <div className="card state-card">
        <p className="eyebrow">{gameName}</p>
        <div className="state-icon wobble">
          <Icon name="wrench" size={36} />
        </div>
        <h1>{t('maintenance.title')}</h1>
        <p className="state-message">{maintenance.message}</p>
        {maintenance.endsAt && new Date(maintenance.endsAt).getTime() > Date.now() && (
          <p className="pill pill-accent">
            <Icon name="clock" size={16} />
            {t('maintenance.eta', { when: eta(maintenance.endsAt) })}
          </p>
        )}
        <button
          className="btn btn-ghost"
          disabled={checking}
          onClick={() => {
            setChecking(true);
            void onRetry().finally(() => setChecking(false));
          }}
        >
          <Icon name="refresh" size={18} />
          {checking ? t('common.checking') : t('common.retry')}
        </button>
        <p className="footnote">{t('maintenance.auto')}</p>
      </div>
    </main>
  );
}
