import { useActionState, useState } from 'react';
import { ApiError, login } from '../lib/api';
import { useStatus } from '../lib/status';

/** Page de connexion joueur, ambiance jeu. Pas d'inscription : les comptes sont fournis par l'organisateur. */
export function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const { status, refresh } = useStatus();
  // "GameOfLife" -> Game<span>Of</span>Life ; tout autre nom est affiché tel quel
  const title = status.gameName === 'GameOfLife' ? (
    <>
      Game<span>Of</span>Life
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
      return err instanceof Error ? err.message : 'Connexion impossible';
    }
  }, null);

  return (
    <main className="game-bg login-screen">
      <div className="sky" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>

      <div className="login-content">
        <header className="game-logo">
          <img src="/icon.svg" alt="" width={96} height={96} className="logo-bounce" />
          <h1>{title}</h1>
          <p>Prêt à jouer ?</p>
        </header>

        <form action={submit} className="glass-card stack">
          <label className="field">
            <span>Identifiant</span>
            <input
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="ex. djean"
              required
              maxLength={64}
            />
          </label>

          <label className="field">
            <span>Mot de passe</span>
            <div className="password-wrap">
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
                className="eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          {error && (
            <p className="game-error" role="alert">
              {error}
            </p>
          )}

          <button className="btn-play" disabled={pending}>
            {pending ? <span className="spinner" aria-label="Connexion…" /> : 'JOUER'}
          </button>
        </form>

        <p className="login-help">
          Pas encore de compte ? Tes identifiants te sont remis par l’organisateur.
        </p>
      </div>
    </main>
  );
}
