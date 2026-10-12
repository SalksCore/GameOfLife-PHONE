import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { useGame } from '../lib/game';
import { useSession } from '../lib/session';
import { LIMITS } from '../protocol';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

export function Chat() {
  const { t, tServer, locale } = useI18n();
  const { messages, room, call } = useGame();
  const { user } = useSession();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const players = useMemo(() => new Map(room?.players.map((p) => [p.id, p])), [room?.players]);
  const timeFmt = useMemo(() => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }), [locale]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText('');
    const res = await call('chat:send', { text: value });
    setError(res.ok ? null : tServer(res.error));
  }

  return (
    <section className="chat">
      <ol ref={listRef} className="messages" aria-live="polite">
        {messages.length === 0 && <li className="chat-empty">{t('room.chatEmpty')}</li>}
        {messages.map((m, i) => {
          if (m.channel === 'system') {
            return (
              <li key={m.id} className="msg-system">
                {tServer(m.text)}
              </li>
            );
          }
          const mine = m.authorId === user?.id;
          const author = m.authorId ? players.get(m.authorId) : undefined;
          // Messages consécutifs du même joueur : avatar et nom une seule fois
          const prev = messages[i - 1];
          const grouped = prev && prev.channel !== 'system' && prev.authorId === m.authorId;
          return (
            <li key={m.id} className={`msg${mine ? ' mine' : ''}${grouped ? ' grouped' : ''}`}>
              {!mine && (
                <span className="msg-avatar">
                  {!grouped && <Avatar avatar={author?.avatar ?? '🙂'} color={author?.color ?? 'violet'} size="xs" />}
                </span>
              )}
              <div className="bubble" data-color={mine ? undefined : author?.color}>
                {!mine && !grouped && <strong>{m.author}</strong>}
                {/* Texte rendu par React -> échappé automatiquement (pas de XSS) */}
                <span>{m.text}</span>
                <time>{timeFmt.format(m.at)}</time>
              </div>
            </li>
          );
        })}
      </ol>
      {error && <p className="alert alert-error small">{error}</p>}
      <form className="composer" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('room.chatPlaceholder')}
          maxLength={LIMITS.chatMax}
          enterKeyHint="send"
          aria-label={t('room.message')}
        />
        <button className="send-btn" disabled={!text.trim()} aria-label={t('room.send')}>
          <Icon name="send" size={20} />
        </button>
      </form>
    </section>
  );
}
