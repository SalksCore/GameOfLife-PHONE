import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { CODE_ALPHABET, LIMITS, normalizeCode } from '../protocol';

const allowed = new Set(CODE_ALPHABET);
/** Ne garde que les caractères valides d'un code (majuscules, sans ambiguïtés) */
export const cleanCode = (value: string) =>
  [...normalizeCode(value)].filter((c) => allowed.has(c)).join('').slice(0, LIMITS.codeLength);

/** Modale centrale de saisie du code de partie. */
export function JoinModal({
  open,
  initialCode = '',
  busy,
  error,
  onJoin,
  onClose,
}: {
  open: boolean;
  initialCode?: string;
  busy: boolean;
  error: string | null;
  onJoin: (code: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState(() => cleanCode(initialCode));
  const ref = useRef<HTMLDialogElement>(null);
  const complete = code.length === LIMITS.codeLength;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setCode(cleanCode(initialCode));
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, initialCode]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (complete && !busy) onJoin(code);
  }

  return (
    <dialog ref={ref} className="join-modal" onClose={onClose} onCancel={onClose}>
      <form onSubmit={submit}>
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
          ✕
        </button>
        <h2>{t('home.codeTitle')}</h2>

        <div className="code-boxes" onClick={() => document.getElementById('code')?.focus()}>
          {Array.from({ length: LIMITS.codeLength }, (_, i) => (
            <span
              key={i}
              className={`code-box${code[i] ? ' filled' : ''}${i === code.length ? ' current' : ''}`}
              aria-hidden="true"
            >
              {code[i] ?? ''}
            </span>
          ))}
          <input
            id="code"
            className="code-hidden-input"
            value={code}
            onChange={(e) => setCode(cleanCode(e.target.value))}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            aria-label={t('home.codeTitle')}
            autoFocus
          />
        </div>

        <p className="code-help">{t('home.codeHelp', { count: LIMITS.codeLength })}</p>

        {error && (
          <p className="game-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn-play" disabled={!complete || busy}>
          {busy ? <span className="spinner" aria-label={t('common.loading')} /> : t('home.codeSubmit')}
        </button>
      </form>
    </dialog>
  );
}
