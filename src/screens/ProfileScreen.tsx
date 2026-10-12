import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { useI18n } from '../i18n';
import { logout, request, type User } from '../lib/api';
import { AVATARS, COLORS } from '../avatars';

/** Profil du joueur : apparence (avatar + couleur), statistiques, déconnexion. */
export function ProfileScreen({
  user: initial,
  onBack,
  onUpdated,
}: {
  user: User;
  onBack: () => void;
  onUpdated: (user: User) => void;
}) {
  const { t, locale } = useI18n();
  const [user, setUser] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Statistiques à jour (elles évoluent après chaque partie)
  useEffect(() => {
    request<User>('GET', '/api/auth/me').then(
      (fresh) => {
        setUser(fresh);
        onUpdated(fresh);
      },
      () => {},
    );
    // onUpdated est stable (useCallback côté App)
  }, [onUpdated]);

  async function change(patch: { avatar?: string; color?: string }) {
    const previous = user;
    const optimistic = { ...user, ...patch };
    setUser(optimistic); // retour immédiat au toucher
    setError(null);
    try {
      const fresh = await request<User>('PATCH', '/api/auth/me', patch);
      setUser(fresh);
      onUpdated(fresh);
      setSaved(true);
      setTimeout(() => setSaved(false), 1_500);
    } catch {
      setUser(previous);
      setError(t('profile.saveError'));
    }
  }

  return (
    <main className="game-bg profile-screen">
      <header className="room-top">
        <button className="btn-ghost" onClick={onBack}>
          ← {t('common.back')}
        </button>
        {saved && <span className="saved-flag">{t('common.saved')} ✓</span>}
      </header>

      <div className="profile-id">
        <Avatar avatar={user.avatar} color={user.color} size="lg" />
        <h1>
          {user.firstName} {user.lastName}
        </h1>
        <p className="muted small">
          {t('profile.identifier')} : <strong>{user.username}</strong>
        </p>
      </div>

      <section className="glass-card stack">
        <h2 className="section-title">{t('profile.appearance')}</h2>

        <div>
          <p className="field-label">{t('profile.avatar')}</p>
          <div className="picker avatars" role="radiogroup" aria-label={t('profile.avatar')}>
            {AVATARS.map((a) => (
              <button
                key={a}
                role="radio"
                aria-checked={user.avatar === a}
                className="pick-avatar"
                onClick={() => void change({ avatar: a })}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label">{t('profile.color')}</p>
          <div className="picker colors" role="radiogroup" aria-label={t('profile.color')}>
            {COLORS.map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={user.color === c}
                aria-label={c}
                className="pick-color"
                data-color={c}
                onClick={() => void change({ color: c })}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="game-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <div className="stat-block glass-card">
        <strong>{user.gamesPlayed}</strong>
        <span>{user.gamesPlayed > 1 ? t('profile.gamesPlural') : t('profile.games')}</span>
      </div>

      <p className="muted small center-text">
        {t('profile.since', { date: new Date(user.createdAt).toLocaleDateString(locale) })}
      </p>

      <button className="btn-danger" onClick={() => void logout()}>
        {t('common.logout')}
      </button>
    </main>
  );
}
