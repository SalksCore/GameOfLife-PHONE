import { useEffect, useRef, useState } from 'react';
import { AppearancePicker } from '../components/AppearancePicker';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';
import { logout, request, type User } from '../lib/api';

/** Onglet « Profil » : carte du joueur, statistiques, apparence (avatar + couleur), compte. */
export function ProfileScreen({ user: initial, onUpdated }: { user: User; onUpdated: (user: User) => void }) {
  const { t, locale } = useI18n();
  const [user, setUser] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const lookRef = useRef<HTMLElement>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Statistiques à jour (elles évoluent après chaque partie)
  useEffect(() => {
    request<User>('GET', '/api/auth/me').then(
      (fresh) => {
        setUser(fresh);
        onUpdated(fresh);
      },
      () => {},
    );
    return () => clearTimeout(savedTimer.current);
    // onUpdated est stable (useCallback côté App)
  }, [onUpdated]);

  async function change(patch: { avatar?: string; color?: string }) {
    const previous = user;
    setUser({ ...user, ...patch }); // retour immédiat au toucher
    setError(null);
    try {
      const fresh = await request<User>('PATCH', '/api/auth/me', patch);
      setUser(fresh);
      onUpdated(fresh);
      setSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 1_600);
    } catch {
      setUser(previous);
      setError(t('profile.saveError'));
    }
  }

  const since = new Date(user.createdAt);
  const days = Math.max(1, Math.round((Date.now() - since.getTime()) / 86_400_000));

  return (
    <main className="screen with-tabbar profile-screen" data-color={user.color}>
      <section className="profile-hero">
        <button
          className="hero-avatar"
          onClick={() => lookRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          aria-label={t('profile.appearance')}
        >
          <Avatar avatar={user.avatar} color={user.color} size="xl" />
          <span className="edit-badge">
            <Icon name="pencil" size={16} />
          </span>
        </button>
        <h1>
          {user.firstName} {user.lastName}
        </h1>
        <p className="handle">
          <Icon name="at" size={15} />
          {user.username}
        </p>
      </section>

      <section className="stat-grid">
        <div className="stat-tile">
          <span className="stat-icon">
            <Icon name="trophy" />
          </span>
          <strong>{user.gamesPlayed}</strong>
          <span>{user.gamesPlayed > 1 ? t('profile.gamesPlural') : t('profile.games')}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-icon">
            <Icon name="calendar" />
          </span>
          <strong>{days}</strong>
          <span>{days > 1 ? t('profile.daysPlural') : t('profile.days')}</span>
        </div>
      </section>

      <section ref={lookRef} className="card">
        <header className="card-head">
          <h2>{t('profile.appearance')}</h2>
          <span className={`saved-flag${saved ? ' show' : ''}`} aria-live="polite">
            {saved && (
              <>
                <Icon name="check" size={16} /> {t('common.saved')}
              </>
            )}
          </span>
        </header>

        <AppearancePicker avatar={user.avatar} color={user.color} onChange={(patch) => void change(patch)} />

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="card list-card">
        <h2 className="list-title">{t('profile.account')}</h2>
        <div className="list-row">
          <Icon name="user" />
          <span>{t('profile.fullName')}</span>
          <strong>
            {user.firstName} {user.lastName}
          </strong>
        </div>
        <div className="list-row">
          <Icon name="at" />
          <span>{t('profile.identifier')}</span>
          <strong className="mono">{user.username}</strong>
        </div>
        <div className="list-row">
          <Icon name="users" />
          <span>{t('profile.inGameName')}</span>
          <strong>{user.displayName}</strong>
        </div>
        <div className="list-row">
          <Icon name="calendar" />
          <span>{t('profile.memberSince')}</span>
          <strong>{since.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
        </div>
      </section>

      {confirmLogout ? (
        <div className="card confirm-card">
          <p>{t('profile.logoutConfirm')}</p>
          <div className="row-2">
            <button className="btn btn-ghost" onClick={() => setConfirmLogout(false)}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-danger" onClick={() => void logout()}>
              {t('common.logout')}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-danger-soft" onClick={() => setConfirmLogout(true)}>
          <Icon name="logout" size={20} />
          {t('common.logout')}
        </button>
      )}

      <p className="footnote">{t('profile.managedBy')}</p>
    </main>
  );
}
