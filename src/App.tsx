import { useCallback, useEffect, useState } from 'react';
import { Icon } from './components/Icon';
import { JoinModal } from './components/JoinModal';
import { TabBar, type Tab } from './components/TabBar';
import { useI18n } from './i18n';
import { logout, updateAccount, type User } from './lib/api';
import { GameProvider, useGame } from './lib/game';
import { useSession } from './lib/session';
import { useStatus } from './lib/status';
import { HomeScreen } from './screens/HomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { MaintenanceScreen } from './screens/MaintenanceScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { RoomScreen } from './screens/RoomScreen';
import { SettingsScreen } from './screens/SettingsScreen';

/** Lien direct possible : https://…/?code=ABC123 (ouvre la saisie du code, pré-remplie, après connexion) */
const codeFromUrl = () => new URLSearchParams(location.search).get('code') ?? '';

function GameScreens() {
  const { t, tServer } = useI18n();
  const { user } = useSession();
  const { room, status, kicked, notice, clearNotice, call } = useGame();
  const welcome = useStatus().status.welcomeMessage;
  const [tab, setTab] = useState<Tab>('play');
  // Code reçu par lien direct : utilisé une seule fois, à l'ouverture
  const [prefill, setPrefill] = useState(codeFromUrl);
  const [joinOpen, setJoinOpen] = useState(() => prefill !== '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onUpdated = useCallback((fresh: User) => updateAccount(fresh), []);

  // L'URL reflète la partie en cours (rechargement de page = reprise automatique côté serveur)
  useEffect(() => {
    if (room) history.replaceState(null, '', `/?code=${room.code}`);
    else if (status === 'online') history.replaceState(null, '', '/');
  }, [room, status]);

  // Partie rejointe : la saisie se ferme, et l'on revient sur « Jouer » à la sortie
  useEffect(() => {
    if (room) {
      setJoinOpen(false);
      setPrefill('');
      setTab('play');
    }
  }, [room]);

  // Chaque onglet s'ouvre en haut de page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  async function join(code: string) {
    setBusy(true);
    setError(null);
    clearNotice();
    const res = await call('room:join', { code });
    if (!res.ok) setError(tServer(res.error));
    setBusy(false);
  }

  if (kicked) {
    return (
      <main className="screen center-screen">
        <div className="card state-card">
          <div className="state-icon warn">
            <Icon name="wifiOff" size={34} />
          </div>
          <h1>{t('session.title')}</h1>
          <p className="muted">{tServer(kicked)}</p>
          <button className="btn btn-primary" onClick={() => location.reload()}>
            {t('session.resume')}
          </button>
          <button className="btn btn-ghost" onClick={() => void logout()}>
            {t('common.logout')}
          </button>
        </div>
      </main>
    );
  }

  const offline = status !== 'online' && (
    <div className="net-banner" role="status">
      <span className="spinner tiny" />
      {status === 'connecting' ? t('net.connecting') : t('net.reconnecting')}
    </div>
  );

  if (room) {
    return (
      <>
        {offline}
        <RoomScreen room={room} />
      </>
    );
  }

  return (
    <>
      {offline}
      {tab === 'play' && (
        <HomeScreen
          user={user!}
          welcome={welcome}
          notice={notice ? tServer(notice) : null}
          disabled={status !== 'online'}
          onJoin={() => {
            setError(null);
            setJoinOpen(true);
          }}
          onProfile={() => setTab('profile')}
        />
      )}
      {tab === 'profile' && <ProfileScreen user={user!} onUpdated={onUpdated} />}
      {tab === 'settings' && <SettingsScreen />}
      <TabBar tab={tab} onChange={setTab} />
      <JoinModal
        open={joinOpen}
        initialCode={prefill}
        busy={busy || status !== 'online'}
        error={error}
        onJoin={(code) => void join(code)}
        onClose={() => {
          setJoinOpen(false);
          setPrefill('');
        }}
      />
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
      <main className="screen center-screen">
        <span className="spinner big" aria-label="…" />
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
