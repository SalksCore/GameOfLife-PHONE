import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Chat } from '../components/Chat';
import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';
import { useGame } from '../lib/game';
import { useSession } from '../lib/session';
import type { PlayerView, RoomView } from '../protocol';

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

/** Code de la partie en grand ; un toucher copie le lien d'invitation. */
function ShareCode({ code }: { code: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/?code=${code}`);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1_800);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé) : le code reste lisible à l'écran
    }
  }

  return (
    <button className="share-code" onClick={() => void copy()} aria-label={`${t('room.code')} ${code}`}>
      <span className="share-label">{t('room.code')}</span>
      <span className="share-chars" aria-hidden="true">
        {[...code].map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </span>
      <span className={`share-hint${copied ? ' done' : ''}`}>
        {copied ? (
          <>
            <Icon name="check" size={14} /> {t('room.copied')}
          </>
        ) : (
          t('room.copyLink')
        )}
      </span>
    </button>
  );
}

/** Places de la salle : les joueurs « prennent vie » dans les cellules vides. */
function Seats({ room, meId }: { room: RoomView; meId: string | undefined }) {
  const { t } = useI18n();
  const n = room.players.length;
  const visible = Math.min(room.maxPlayers, Math.max(8, Math.ceil((n + 1) / 4) * 4));
  const seats: (PlayerView | null)[] = [...room.players, ...Array<null>(Math.max(0, visible - n)).fill(null)];

  return (
    <section className="seats">
      <h3 className="section-label">
        {t('room.seats')}
        <span>
          {n}/{room.maxPlayers}
        </span>
      </h3>
      <ul className="seat-grid">
        {seats.map((p, i) =>
          p ? (
            <li key={p.id} className={`seat taken${p.id === meId ? ' me' : ''}${p.connected ? '' : ' away'}`}>
              <Avatar avatar={p.avatar} color={p.color} size="md" offline={!p.connected} />
              <span>{p.id === meId ? t('room.you') : p.displayName}</span>
            </li>
          ) : (
            <li key={`free-${i}`} className="seat free" aria-hidden="true">
              <span className="seat-dot" />
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

/** Écran de partie : salle d'attente, partie en cours, fin. */
export function RoomScreen({ room }: { room: RoomView }) {
  const { t, tServer } = useI18n();
  const { user } = useSession();
  const { call, clockOffset } = useGame();
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    const res = await call('room:leave');
    if (!res.ok) setError(tServer(res.error));
  }

  return (
    <main className={`screen room-screen phase-${room.phase}`}>
      <header className="top-bar">
        <button className="icon-btn" onClick={() => void leave()} aria-label={t('room.leave')}>
          <Icon name="back" />
        </button>
        <div className="room-title">
          <strong>{room.name}</strong>
          <span className="room-state">
            <span className="live-dot" />
            {room.phase === 'lobby' ? t('room.waitingHost') : t(`phase.${room.phase}`)}
          </span>
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
              {room.players.length}
            </>
          )}
        </span>
      </header>

      {room.phase === 'lobby' && (
        <>
          <ShareCode code={room.code} />
          <Seats room={room} meId={user?.id} />
        </>
      )}

      {room.phase !== 'lobby' && (
        <>
          <section className="phase-banner">
            <h2>{room.phase === 'playing' ? t('room.playing') : t('room.ended')}</h2>
            <p>{room.phase === 'playing' ? t('room.playingSub') : t('room.endedSub')}</p>
          </section>
          {room.phase === 'ended' && (
            <button className="btn btn-primary btn-lg" onClick={() => void leave()}>
              {t('room.backHome')}
            </button>
          )}
          <section className="roster">
            <ul>
              {room.players.map((p) => (
                <li key={p.id} className={`${p.id === user?.id ? 'me' : ''}${p.connected ? '' : ' away'}`}>
                  <Avatar avatar={p.avatar} color={p.color} size="md" offline={!p.connected} />
                  <span className="roster-name">{p.id === user?.id ? t('room.you') : p.displayName}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {error && <p className="alert alert-error">{error}</p>}
      <Chat />
    </main>
  );
}
