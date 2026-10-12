import { useEffect, useState } from 'react';
import { logout } from './lib/api';
import { GameProvider, useGame } from './lib/game';
import { useSession } from './lib/session';
import { useStatus } from './lib/status';
import { MaintenanceScreen } from './screens/MaintenanceScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { RoomScreen } from './screens/RoomScreen';

/** Lien direct possible : https://…/?code=ABC123 (pré-remplit le code après connexion) */
const codeFromUrl = () => new URLSearchParams(location.search).get('code') ?? '';

function GameScreens() {
  const { user } = useSession();
  const { room, status, kicked, notice, clearNotice, call } = useGame();
  const welcome = useStatus().status.welcomeMessage;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState(false);

  // L'URL reflète la partie en cours (rechargement de page = reprise automatique côté serveur)
  useEffect(() => {
    if (room) history.replaceState(null, '', `/?code=${room.code}`);
    else if (status === 'online') history.replaceState(null, '', '/');
  }, [room, status]);

  async function join(code: string) {
    setBusy(true);
    setError(null);
    clearNotice();
    const res = await call('room:join', { code });
    if (!res.ok) setError(res.error);
    setBusy(false);
  }

  if (kicked) {
    return (
      <main className="game-bg center-screen">
        <div className="glass-card stack">
          <h2>Session terminée</h2>
          <p>{kicked}</p>
          <button className="btn-play" onClick={() => location.reload()}>
            REPRENDRE ICI
          </button>
          <button className="btn-ghost" onClick={() => void logout()}>
            Se déconnecter
          </button>
        </div>
      </main>
    );
  }

  if (profile && !room) return <ProfileScreen user={user!} onBack={() => setProfile(false)} />;

  return (
    <>
      {status !== 'online' && (
        <div className="net-banner">{status === 'connecting' ? 'Connexion…' : 'Reconnexion…'}</div>
      )}
      {room ? (
        <RoomScreen room={room} />
      ) : (
        <HomeScreen
          user={user!}
          initialCode={codeFromUrl()}
          busy={busy || status !== 'online'}
          error={error}
          notice={notice}
          welcome={welcome}
          onJoin={(code) => void join(code)}
          onProfile={() => setProfile(true)}
        />
      )}
    </>
  );
}

export function App() {
  const { user, ready } = useSession();
  const { status, refresh } = useStatus();
  if (status.maintenance) {
    return <MaintenanceScreen gameName={status.gameName} maintenance={status.maintenance} onRetry={refresh} />;
  }
  if (!ready) {
    return (
      <main className="game-bg center-screen">
        <span className="spinner big" aria-label="Chargement" />
      </main>
    );
  }
  // Connexion obligatoire avant de pouvoir saisir un code
  if (!user) return <LoginScreen />;
  // key : nouvelle connexion socket si le joueur change
  return (
    <GameProvider key={user.id}>
      <GameScreens />
    </GameProvider>
  );
}
