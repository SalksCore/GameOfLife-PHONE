import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Ack, AckFn, ChatMessage, ClientToServerEvents, RoomView, ServerToClientEvents } from '../protocol';
import { getAccessToken, logout, refreshSession } from './api';
import { useStatus } from './status';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type Status = 'connecting' | 'online' | 'offline';

/** Événements qui attendent une réponse (dernier argument = AckFn) */
type EventsWithAck = {
  [E in keyof ClientToServerEvents]: Parameters<ClientToServerEvents[E]> extends [...unknown[], AckFn<any>] ? E : never;
}[keyof ClientToServerEvents];
type Args<E extends EventsWithAck> = Parameters<ClientToServerEvents[E]> extends [...infer A, AckFn<any>] ? A : never;
type Result<E extends EventsWithAck> = Parameters<ClientToServerEvents[E]> extends [...unknown[], AckFn<infer R>]
  ? Ack<R>
  : never;

interface GameState {
  socket: GameSocket | null;
  status: Status;
  room: RoomView | null;
  /** Décalage horloge serveur - horloge locale (ms) */
  clockOffset: number;
  messages: ChatMessage[];
  kicked: string | null;
  /** Message affiché après une sortie forcée (partie fermée, expulsion) */
  notice: string | null;
  clearNotice: () => void;
  call: <E extends EventsWithAck>(event: E, ...args: Args<E>) => Promise<Result<E>>;
}

const MAX_MESSAGES = 200;
const GameContext = createContext<GameState | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<GameSocket | null>(null);
  const [status, setStatus] = useState<Status>('connecting');
  const [room, setRoom] = useState<RoomView | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [kicked, setKicked] = useState<string | null>(null);
  const { refresh: refreshStatus, enterMaintenance } = useStatus();
  const [notice, setNotice] = useState<string | null>(null);
  const clearNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    const s: GameSocket = io(import.meta.env.VITE_API_URL ?? '/', {
      path: '/socket.io',
      transports: ['websocket'],
      // Appelé à chaque (re)connexion : on fournit toujours un token frais
      auth: (cb) => void getAccessToken().then((token) => cb({ token })),
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
    });

    s.on('connect', () => setStatus('online'));
    s.on('disconnect', () => setStatus('offline'));
    s.on('connect_error', async (err) => {
      setStatus('offline');
      if (err.message === 'maintenance') {
        // Le serveur refuse les joueurs : l'application bascule sur l'écran de maintenance
        s.disconnect();
        return void refreshStatus();
      }
      if (err.message === 'unauthorized') {
        // Token refusé : on tente un renouvellement, sinon retour à l'écran de connexion
        const user = await refreshSession();
        if (!user) return void logout();
        s.connect();
      }
    });
    s.on('room:state', (view) => {
      if (view) {
        setClockOffset(view.now - Date.now());
        setNotice(null);
      }
      // Sortie du salon : on repart d'un chat vide
      if (!view) setMessages([]);
      setRoom(view);
    });
    s.on('chat:message', (msg) => setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), msg]));
    s.on('room:notice', setNotice);
    s.on('server:maintenance', (info) => {
      s.disconnect();
      enterMaintenance(info);
    });
    s.on('session:kicked', (reason) => {
      setKicked(reason);
      s.disconnect();
    });

    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
  }, [refreshStatus, enterMaintenance]);

  // Référence stable : utilisable sans risque dans les dépendances des useEffect
  const call = useCallback(
    async (event: EventsWithAck, ...args: unknown[]) => {
      if (!socket?.connected) return { ok: false, error: 'Connexion perdue' };
      try {
        // emitWithAck n'est pas typé pour un nom d'événement générique
        return await (socket.timeout(5_000) as any).emitWithAck(event, ...args);
      } catch {
        return { ok: false, error: 'Le serveur ne répond pas' };
      }
    },
    [socket],
  ) as unknown as GameState['call'];

  const value = useMemo<GameState>(
    () => ({
      socket,
      status,
      room,
      clockOffset,
      messages,
      kicked,
      notice,
      clearNotice,
      call,
    }),
    [socket, status, room, clockOffset, messages, kicked, notice, clearNotice, call],
  );

  return <GameContext value={value}>{children}</GameContext>;
}

export function useGame(): GameState {
  const ctx = use(GameContext);
  if (!ctx) throw new Error('useGame doit être utilisé dans <GameProvider>');
  return ctx;
}
