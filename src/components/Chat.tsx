import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { useGame } from '../lib/game';
import { LIMITS } from '../protocol';

export function Chat() {
  const { t, tServer } = useI18n();
  const { messages, call } = useGame();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

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
        {messages.map((m) => (
          <li key={m.id} className={`msg ${m.channel}`}>
            {m.channel !== 'system' && <strong>{m.author} : </strong>}
            {/* Texte rendu par React -> échappé automatiquement (pas de XSS) */}
            {m.text}
          </li>
        ))}
      </ol>
      {error && <p className="game-error small">{error}</p>}
      <form className="composer" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('room.chatPlaceholder')}
          maxLength={LIMITS.chatMax}
          enterKeyHint="send"
          aria-label={t('room.message')}
        />
        <button className="btn-send" disabled={!text.trim()} aria-label={t('room.send')}>
          ➤
        </button>
      </form>
    </section>
  );
}
