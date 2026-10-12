import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { LifeGrid } from '../components/LifeGrid';
import { Logo } from '../components/Logo';
import { useI18n } from '../i18n';
import type { User } from '../lib/api';
import { useStatus } from '../lib/status';

interface Props {
  user: User;
  welcome: string;
  notice: string | null;
  disabled: boolean;
  onJoin: () => void;
  onProfile: () => void;
}

/** Onglet « Jouer » : salutation, message de l'organisateur et accès à la saisie du code. */
export function HomeScreen({ user, welcome, notice, disabled, onJoin, onProfile }: Props) {
  const { t } = useI18n();
  const gameName = useStatus().status.gameName;

  return (
    <main className="screen with-tabbar home-screen">
      <header className="top-bar">
        <Logo name={gameName} size={30} />
        <button className="avatar-btn" onClick={onProfile} aria-label={t('home.profile')}>
          <Avatar avatar={user.avatar} color={user.color} size="sm" />
        </button>
      </header>

      <section className="hello">
        <p className="eyebrow">{t('home.eyebrow')}</p>
        <h1>{t('home.hello', { name: user.firstName })}</h1>
      </section>

      {notice && (
        <p className="alert alert-info" role="status">
          {notice}
        </p>
      )}

      <section className="join-card" data-color={user.color}>
        <LifeGrid cols={18} rows={5} />
        <h2>{t('home.joinTitle')}</h2>
        <p>{t('home.subtitle')}</p>
        <button className="btn btn-primary btn-lg" onClick={onJoin} disabled={disabled}>
          <Icon name="play" size={20} weight="fill" />
          {t('home.join')}
        </button>
      </section>

      {welcome && (
        <section className="card announce">
          <span className="announce-icon">
            <Icon name="megaphone" />
          </span>
          <div>
            <p className="eyebrow">{t('home.announce')}</p>
            <p className="announce-text">{welcome}</p>
          </div>
        </section>
      )}

      <section className="mini-stats">
        <div className="mini-stat">
          <Icon name="trophy" />
          <strong>{user.gamesPlayed}</strong>
          <span>{user.gamesPlayed > 1 ? t('profile.gamesPlural') : t('profile.games')}</span>
        </div>
        <button className="mini-stat as-link" onClick={onProfile}>
          <Avatar avatar={user.avatar} color={user.color} size="xs" />
          <strong>{user.displayName}</strong>
          <span>
            {t('home.editLook')} <Icon name="chevron" size={14} />
          </span>
        </button>
      </section>
    </main>
  );
}
