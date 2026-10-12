import { useActionState, useState } from 'react';
import { Icon } from '../components/Icon';
import { LifeGrid } from '../components/LifeGrid';
import { LogoMark } from '../components/Logo';
import { useI18n } from '../i18n';
import { ApiError, login } from '../lib/api';
import { useStatus } from '../lib/status';

/** Connexion joueur. Pas d'inscription : les comptes sont fournis par l'organisateur. */
export function LoginScreen() {
  const { t, tServer } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const { status, refresh } = useStatus();
  // "GameOfLife" -> Game<span>of</span>Life ; tout autre nom est affiché tel quel
  const title =
    status.gameName === 'GameOfLife' ? (
      <>
        Game<span>of</span>Life
      </>
    ) : (
      status.gameName
    );

  const [error, submit, pending] = useActionState(async (_prev: string | null, form: FormData) => {
    try {
      await login(String(form.get('username') ?? '').trim(), String(form.get('password') ?? ''));
      return null;
    } catch (err) {
      // 503 = maintenance : l'application affiche l'écran dédié
      if (err instanceof ApiError && err.status === 503) void refresh();
      return err instanceof Error ? tServer(err.message) : t('login.failed');
    }
  }, null);

  return (
    <main className="screen login-screen">
      <div className="login-board">
        <LifeGrid cols={20} rows={9} interval={600} />
      </div>

      <header className="login-brand">
        <LogoMark size={76} />
        <h1>{title}</h1>
        <p>{t('login.tagline')}</p>
      </header>

      <form action={submit} className="card login-card">
        <label className="field">
          <span>{t('login.username')}</span>
          <div className="input-wrap">
            <Icon name="at" size={20} />
            <input
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t('login.usernamePlaceholder')}
              required
              maxLength={64}
            />
          </div>
        </label>

        <label className="field">
          <span>{t('login.password')}</span>
          <div className="input-wrap">
            <Icon name="lock" size={20} />
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Tigre-Lune-Cactus-1234"
              required
              maxLength={128}
            />
            <button
              type="button"
              className="icon-btn eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} size={20} />
            </button>
          </div>
        </label>

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-primary btn-lg" disabled={pending}>
          {pending ? <span className="spinner" aria-label={t('common.loading')} /> : t('login.submit')}
        </button>
      </form>

      <p className="footnote">{t('login.help')}</p>
    </main>
  );
}
