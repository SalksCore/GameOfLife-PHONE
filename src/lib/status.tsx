import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface Maintenance {
  message: string;
  endsAt: string | null;
}

export interface ServerStatus {
  gameName: string;
  welcomeMessage: string;
  maintenance: Maintenance | null;
}

interface StatusState {
  status: ServerStatus;
  /** Relit l'état du serveur (après un refus de connexion, par exemple) */
  refresh: () => Promise<void>;
  /** Passage en maintenance annoncé par le serveur en temps réel */
  enterMaintenance: (m: Maintenance) => void;
}

const DEFAULT: ServerStatus = { gameName: 'GameOfLife', welcomeMessage: '', maintenance: null };
const StatusContext = createContext<StatusState | null>(null);

async function fetchStatus(): Promise<ServerStatus> {
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/status`, { cache: 'no-store' });
  if (!res.ok) throw new Error('status');
  return res.json();
}

export function StatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ServerStatus>(DEFAULT);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await fetchStatus());
    } catch {
      // Serveur injoignable : on garde le dernier état connu
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // En maintenance : vérification régulière pour reprendre dès que possible
  useEffect(() => {
    if (!status.maintenance) return;
    const id = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(id);
  }, [status.maintenance, refresh]);

  useEffect(() => {
    document.title = status.gameName;
  }, [status.gameName]);

  const enterMaintenance = useCallback((m: Maintenance) => setStatus((s) => ({ ...s, maintenance: m })), []);

  const value = useMemo(() => ({ status, refresh, enterMaintenance }), [status, refresh, enterMaintenance]);
  if (!ready) return null;
  return <StatusContext value={value}>{children}</StatusContext>;
}

export function useStatus(): StatusState {
  const ctx = use(StatusContext);
  if (!ctx) throw new Error('useStatus doit être utilisé dans <StatusProvider>');
  return ctx;
}
