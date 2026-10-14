import { useEffect, useRef, useState } from 'react';
import { AppearancePicker } from '../components/AppearancePicker';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';
import { request, updateAccount, type User } from '../lib/api';
import { useGame } from '../lib/game';
import { useSession } from '../lib/session';
import type { RoomView } from '../protocol';

/**
 * Salle d'attente côté joueur : on ne voit que soi (la liste complète est sur l'écran projeté)
 * et on personnalise son personnage en attendant le lancement.
 */
export function LobbyScreen({ room }: { room: RoomView }) {
  const { t, tServer } = useI18n();
  const { user } = useSession();
  const { call } = useGame();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!user) return null;
  const me = user;

  async function leave() {
    const res = await call('room:leave');
    if (!res.ok) setError(tServer(res.error));
  }

  async function change(patch: { avatar?: string; color?: string }) {
    const previous = me;
    updateAccount({ ...me, ...patch }); // retour immédiat au toucher
    setError(null);
    try {
      updateAccount(await request<User>('PATCH', '/api/auth/me', patch));
      setSaved(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setSaved(false), 1_500);
    } catch {
      updateAccount(previous);
      setError(t('profile.saveError'));
    }
  }

  return (
    <main className="screen lobby-screen" data-color={me.color}>
      <header className="top-bar">
        <button className="icon-btn" onClick={() => void leave()} aria-label={t('room.leave')}>
          <Icon name="back" />
        </button>
        <div className="room-title">
          <strong>{room.name}</strong>
          <span className="room-state">
            <span className="live-dot" />
            {t('room.waitingHost')}
          </span>
        </div>
        <span className="pill">
          <Icon name="users" size={16} />
          {room.players.length}
        </span>
      </header>

      <section className="me-card">
        <Avatar avatar={me.avatar} color={me.color} size="xl" />
        <h1>{me.displayName}</h1>
        <p className="me-ready">
          <Icon name="check" size={16} /> {t('lobby.you')}
        </p>
      </section>

      <p className="lobby-hint">{t('lobby.wait')}</p>

      <section className="card">
        <header className="card-head">
          <h2>{t('lobby.customize')}</h2>
          <span className={`saved-flag${saved ? ' show' : ''}`} aria-live="polite">
            {saved && (
              <>
                <Icon name="check" size={16} /> {t('common.saved')}
              </>
            )}
          </span>
        </header>
        <AppearancePicker avatar={me.avatar} color={me.color} onChange={(patch) => void change(patch)} />
      </section>

      {error && <p className="alert alert-error">{error}</p>}

      <p className="footnote">
        {t('room.code')} : <strong className="mono">{room.code}</strong>
      </p>
    </main>
  );
}
