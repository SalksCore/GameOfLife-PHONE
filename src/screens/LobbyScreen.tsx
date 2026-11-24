import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AppearancePicker } from '../components/AppearancePicker';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';
import { request, updateAccount, type User } from '../lib/api';
import { useGame } from '../lib/game';
import { useSession } from '../lib/session';
import type { RoomView } from '../protocol';

/**
 * Salle d'attente côté joueur : on ne voit que soi (la liste complète est sur l'écran projeté)
 * et on personnalise son personnage en attendant le lancement.
 */
export function LobbyScreen({ room }: { room: RoomView }) {
  const { t, tServer } = useI18n();
  const { user } = useSession();
  const { call } = useGame();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!user) return null;
  const me = user;

  async function leave() {
    const res = await call('room:leave');
    if (!res.ok) setError(tServer(res.error));
  }

  async function change(patch: { avatar?: string; color?: string }) {
    const previous = me;
    updateAccount({ ...me, ...patch }); // retour immédiat au toucher
    setError(null);
    try {
      updateAccount(await request<User>('PATCH', '/api/auth/me', patch));
      setSaved(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setSaved(false), 1_500);
    } catch {
      updateAccount(previous);
      setError(t('profile.saveError'));
    }
  }

  return (
    <main className="screen lobby-screen" data-color={me.color}>
      <header className="top-bar">
        <button className="icon-btn" onClick={() => void leave()} aria-label={t('room.leave')}>
          <Icon name="back" />
        </button>
        <div className="room-title">
          <strong>{room.name}</strong>
          <span className="room-state">
            <span className="live-dot" />
            {t('room.waitingHost')}
          </span>
        </div>
        <span className="pill">
          <Icon name="users" size={16} />
          {room.players.length}
        </span>
      </header>

      <section className="me-card">
        <Avatar avatar={me.avatar} color={me.color} size="xl" />
        <h1>{me.displayName}</h1>
        <p className="me-ready">
          <Icon name="check" size={16} /> {t('lobby.you')}
        </p>
      </section>

      <p className="lobby-hint">{t('lobby.wait')}</p>

      <Pairing room={room} meId={me.id} onError={setError} />

      <section className="card">
        <header className="card-head">
          <h2>{t('lobby.customize')}</h2>
          <span className={`saved-flag${saved ? ' show' : ''}`} aria-live="polite">
            {saved && (
              <>
                <Icon name="check" size={16} /> {t('common.saved')}
              </>
            )}
          </span>
        </header>
        <AppearancePicker avatar={me.avatar} color={me.color} onChange={(patch) => void change(patch)} />
      </section>

      {error && <p className="alert alert-error">{error}</p>}

      <p className="footnote">
        {t('room.code')} : <strong className="mono">{room.code}</strong>
      </p>
    </main>
  );
}

/**
 * Binôme : deux comptes, un seul personnage, chacun peut jouer.
 * On saisit le code binôme imprimé sur la fiche du partenaire : pas besoin que son téléphone marche.
 */
function Pairing({ room, onError }: { room: RoomView; meId: string; onError: (e: string | null) => void }) {
  const { call } = useGame();
  const { tServer } = useI18n();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const p = room.pairing;
  const partner = p.partnerId ? room.players.find((x) => x.id === p.partnerId) : null;

  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const res = await call('room:pairCode', { code });
    onError(res.ok ? null : tServer(res.error));
    if (res.ok) setCode('');
    setBusy(false);
  };
  const leave = async () => {
    const res = await call('room:pair', { action: 'leave', playerId: null });
    onError(res.ok ? null : tServer(res.error));
  };

  return (
    <section className="card pair-card">
      <header className="card-head">
        <h2>🤝 Jouer en binôme</h2>
      </header>
      {partner ? (
        <div className="pair-row">
          <Avatar avatar={partner.avatar} color={partner.color} size="sm" />
          <p>
            Tu joues avec <strong>{partner.displayName}</strong>
            {!partner.connected && <span className="muted"> (hors ligne)</span>} : un seul personnage, chacun peut jouer.
          </p>
          <button className="btn btn-ghost small" onClick={() => void leave()}>
            Se séparer
          </button>
        </div>
      ) : (
        <form className="pair-code" onSubmit={add}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Code binôme (ex. K7M-4PZ)"
            aria-label="Code binôme de ton partenaire"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={9}
            className="mono"
          />
          <button className="btn btn-primary small" disabled={busy || code.replace(/[^a-z0-9]/gi, '').length !== 6}>
            Ajouter
          </button>
        </form>
      )}
      {!partner && (
        <p className="muted small-print">
          Un téléphone sans batterie ? Tape le code binôme imprimé sur la fiche de ton partenaire : il joue avec toi, sur ton téléphone.
        </p>
      )}
    </section>
  );
}
