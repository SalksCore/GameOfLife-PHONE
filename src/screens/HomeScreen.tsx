import { Avatar } from '../components/Avatar';
import { useI18n } from '../i18n';
import type { User } from '../lib/api';

interface Props {
  user: User;
  welcome: string;
  notice: string | null;
  disabled: boolean;
  onJoin: () => void;
  onProfile: () => void;
  onSettings: () => void;
}

/** Accueil du joueur connecté : profil, paramètres et bouton pour rejoindre une partie. */
export function HomeScreen({ user, welcome, notice, disabled, onJoin, onProfile, onSettings }: Props) {
  const { t } = useI18n();

  return (
    <main className="game-bg home-screen">
      <div className="sky" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
      </div>

      <header className="home-top">
        <button className="player-chip" onClick={onProfile}>
          <Avatar avatar={user.avatar} color={user.color} size="sm" />
          {user.displayName}
        </button>
        <button className="icon-chip" onClick={onSettings} aria-label={t('home.settings')} title={t('home.settings')}>
          ⚙️
        </button>
      </header>

      <div className="home-content">
        <h1 className="home-title">{t('home.hello', { name: user.firstName })}</h1>
        <p className="home-sub">{t('home.subtitle')}</p>

        {welcome && <p className="welcome">{welcome}</p>}
        {notice && (
          <p className="game-notice" role="status">
            {notice}
          </p>
        )}

        <button className="btn-play btn-join" onClick={onJoin} disabled={disabled}>
          {t('home.join')}
        </button>
      </div>
    </main>
  );
}
