import { useState } from 'react';
import type { Maintenance } from '../lib/status';

const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

function eta(iso: string): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? `vers ${timeFmt.format(d)}` : `le ${dayFmt.format(d)} vers ${timeFmt.format(d)}`;
}

/** Affiché à la place du jeu pendant une maintenance */
export function MaintenanceScreen({
  gameName,
  maintenance,
  onRetry,
}: {
  gameName: string;
  maintenance: Maintenance;
  onRetry: () => Promise<void>;
}) {
  const [checking, setChecking] = useState(false);

  return (
    <main className="game-bg center-screen maintenance-screen">
      <div className="maintenance-content">
        <div className="maintenance-icon" aria-hidden="true">
          🛠️
        </div>
        <p className="maintenance-game">{gameName}</p>
        <h1>Maintenance en cours</h1>
        <p className="maintenance-message">{maintenance.message}</p>
        {maintenance.endsAt && new Date(maintenance.endsAt).getTime() > Date.now() && (
          <p className="maintenance-eta">Retour prévu {eta(maintenance.endsAt)}</p>
        )}
        <button
          className="btn-ghost"
          disabled={checking}
          onClick={() => {
            setChecking(true);
            void onRetry().finally(() => setChecking(false));
          }}
        >
          {checking ? 'Vérification…' : 'Réessayer'}
        </button>
        <p className="maintenance-hint">La page se rafraîchit automatiquement.</p>
      </div>
    </main>
  );
}
