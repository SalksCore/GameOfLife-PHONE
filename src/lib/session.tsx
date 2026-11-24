import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { login, onSessionChange, refreshSession, type User } from './api';

/**
 * Connexion par le QR code de la fiche : https://…/#login=<base64url(identifiant, retour à la ligne, mot de passe)>.
 * Le fragment (#) n'est jamais envoyé au serveur ; il est effacé de l'adresse dès la lecture.
 */
function takeQrLogin(): { username: string; password: string } | null {
  const m = /[#&]login=([A-Za-z0-9_-]+)/.exec(location.hash);
  if (!m) return null;
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const raw = atob(m[1]!.replace(/-/g, '+').replace(/_/g, '/'));
    const text = new TextDecoder().decode(Uint8Array.from(raw, (c) => c.charCodeAt(0)));
    const [username, password] = text.split(String.fromCharCode(10));
    return username && password ? { username, password } : null;
  } catch {
    return null;
  }
}

/** Échec de la connexion par QR (affiché sur l'écran de connexion) */
export let qrLoginFailed = false;

interface SessionState {
  user: User | null;
  ready: boolean;
}

const SessionContext = createContext<SessionState>({ user: null, ready: false });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ user: null, ready: false });

  useEffect(() => {
    const off = onSessionChange((user) => setState({ user, ready: true }));
    const qr = takeQrLogin();
    if (qr) {
      // Le QR d'une fiche connecte à CE compte, même si un autre était ouvert sur le téléphone
      login(qr.username, qr.password)
        .then((user) => setState({ user, ready: true }))
        .catch(() => {
          qrLoginFailed = true;
          return refreshSession().then((user) => setState({ user, ready: true }));
        });
    } else {
      // Restaure la session au chargement grâce au cookie httpOnly
      refreshSession().then((user) => setState({ user, ready: true }));
    }
    // QR scanné alors que l'application est déjà ouverte dans cet onglet : on recharge pour se connecter
    const onHash = () => {
      if (/[#&]login=/.test(location.hash)) location.reload();
    };
    window.addEventListener('hashchange', onHash);
    return () => {
      off();
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  return <SessionContext value={state}>{children}</SessionContext>;
}

export const useSession = () => use(SessionContext);
