import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Chat } from '../components/Chat';
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
    <span className="elapsed">
      {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
    </span>
  );
}

/** Écran de partie (socle neutre : salle d'attente, partie en cours, fin). */
export function RoomScreen({ room }: { room: RoomView }) {
  const { t } = useI18n();
  const { user } = useSession();
  const { call, clockOffset } = useGame();
  const [error, setError] = useState<string | null>(null);
  const { tServer } = useI18n();

  async function leave() {
    const res = await call('room:leave');
    if (!res.ok) setError(tServer(res.error));
  }

  const stage = {
    lobby: { icon: '⏳', title: t('room.waiting'), sub: t('room.waitingSub') },
    playing: { icon: '🎮', title: t('room.playing'), sub: t('room.playingSub') },
    ended: { icon: '🏁', title: t('room.ended'), sub: t('room.endedSub') },
  }[room.phase];

  return (
    <main className={`game-bg room-screen phase-${room.phase}`}>
      <header className="room-top">
        <button className="btn-ghost" onClick={() => void leave()}>
          ← {t('room.leave')}
        </button>
        <div className="room-title">
          <strong>{room.name}</strong>
          <span className="room-code">{room.code}</span>
        </div>
        {room.phase === 'playing' && room.startedAt ? (
          <Elapsed since={room.startedAt} offset={clockOffset} />
        ) : (
          <span className="room-count">
            {room.players.length}/{room.maxPlayers}
          </span>
        )}
      </header>

      <section className="stage">
        <div className={`pulse-ring ${room.phase}`} aria-hidden="true">
          {stage.icon}
        </div>
        <h2>{stage.title}</h2>
        <p>{stage.sub}</p>
        {room.phase === 'ended' && (
          <button className="btn-play" onClick={() => void leave()}>
            {t('room.backHome')}
          </button>
        )}
        {error && <p className="game-error">{error}</p>}
      </section>

      <section className="roster">
        <h3>
          {t('room.players')} ({room.players.length})
        </h3>
        <ul>
          {room.players.map((p) => (
            <li key={p.id} className={`${p.id === user?.id ? 'me' : ''}${p.connected ? '' : ' away'}`}>
              <Avatar avatar={p.avatar} color={p.color} size="sm" offline={!p.connected} />
              {p.displayName}
              {p.id === user?.id && <em> {t('room.you')}</em>}
            </li>
          ))}
        </ul>
      </section>

      <Chat />
    </main>
  );
}
