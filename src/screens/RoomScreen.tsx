import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Chat } from '../components/Chat';
import { Icon, type IconName } from '../components/Icon';
import { useI18n } from '../i18n';
import { useGame } from '../lib/game';
import { useSession } from '../lib/session';
import type { RoomView } from '../protocol';

function Elapsed({ since, offset }: { since: number; offset: number }) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset), 1_000);
    return () => clearInterval(id);
  }, [offset]);
  const sec = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <>
      {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
    </>
  );
}

/** Écran de partie (socle neutre : salle d'attente, partie en cours, fin). */
export function RoomScreen({ room }: { room: RoomView }) {
  const { t, tServer } = useI18n();
  const { user } = useSession();
  const { call, clockOffset } = useGame();
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    const res = await call('room:leave');
    if (!res.ok) setError(tServer(res.error));
  }

  const stages: Record<RoomView['phase'], { icon: IconName; title: string; sub: string }> = {
    lobby: { icon: 'hourglass', title: t('room.waiting'), sub: t('room.waitingSub') },
    playing: { icon: 'bolt', title: t('room.playing'), sub: t('room.playingSub') },
    ended: { icon: 'flag', title: t('room.ended'), sub: t('room.endedSub') },
  };
  const stage = stages[room.phase];

  const online = room.players.filter((p) => p.connected).length;

  return (
    <main className={`screen room-screen phase-${room.phase}`}>
      <header className="top-bar">
        <button className="icon-btn" onClick={() => void leave()} aria-label={t('room.leave')}>
          <Icon name="back" />
        </button>
        <div className="room-title">
          <strong>{room.name}</strong>
          <span className="code-pill">{room.code}</span>
        </div>
        <span className="pill">
          {room.phase === 'playing' && room.startedAt ? (
            <>
              <Icon name="clock" size={16} />
              <Elapsed since={room.startedAt} offset={clockOffset} />
            </>
          ) : (
            <>
              <Icon name="users" size={16} />
              {room.players.length}/{room.maxPlayers}
            </>
          )}
        </span>
      </header>

      <section className="phase-card">
        <div className="phase-icon">
          <Icon name={stage.icon} size={30} />
        </div>
        <div className="phase-text">
          <p className="eyebrow">{t(`phase.${room.phase}`)}</p>
          <h2>{stage.title}</h2>
          <p>{stage.sub}</p>
        </div>
      </section>
      {room.phase === 'ended' && (
        <button className="btn btn-primary btn-lg" onClick={() => void leave()}>
          {t('room.backHome')}
        </button>
      )}
      {error && <p className="alert alert-error">{error}</p>}

      <section className="roster">
        <h3 className="section-label">
          {t('room.players')}
          <span>
            {online} {t('room.online')}
          </span>
        </h3>
        <ul>
          {room.players.map((p) => (
            <li key={p.id} className={`${p.id === user?.id ? 'me' : ''}${p.connected ? '' : ' away'}`}>
              <Avatar avatar={p.avatar} color={p.color} size="md" offline={!p.connected} />
              <span className="roster-name">{p.id === user?.id ? t('room.you') : p.displayName}</span>
            </li>
          ))}
        </ul>
      </section>

      <Chat />
    </main>
  );
}
