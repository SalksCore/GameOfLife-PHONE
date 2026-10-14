import { useState } from 'react';
import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';
import { useGame } from '../lib/game';
import type { RoomView } from '../protocol';
import { GameScreen } from './GameScreen';
import { LobbyScreen } from './LobbyScreen';

/** Écran de partie : salle d'attente, jeu, fin. */
export function RoomScreen({ room }: { room: RoomView }) {
  if (room.game) return <GameScreen room={room} game={room.game} />;
  if (room.phase === 'lobby') return <LobbyScreen room={room} />;
  return <EndedScreen room={room} />;
}

/** Partie terminée sans jeu (fermée avant le lancement des étapes) */
function EndedScreen({ room }: { room: RoomView }) {
  const { t, tServer } = useI18n();
  const { call } = useGame();
  const [error, setError] = useState<string | null>(null);
  return (
    <main className="screen center-screen">
      <div className="card state-card">
        <div className="state-icon">
          <Icon name="flag" size={34} />
        </div>
        <h1>{t('room.ended')}</h1>
        <p className="muted">{room.name}</p>
        <button
          className="btn btn-primary"
          onClick={() => void call('room:leave').then((r) => !r.ok && setError(tServer(r.error)))}
        >
          {t('room.backHome')}
        </button>
        {error && <p className="alert alert-error">{error}</p>}
      </div>
    </main>
  );
}
