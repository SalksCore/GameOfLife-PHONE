import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { CODE_ALPHABET, LIMITS, normalizeCode } from '../protocol';
import { Icon } from './Icon';

const allowed = new Set(CODE_ALPHABET);
/** Ne garde que les caractères valides d'un code (majuscules, sans ambiguïtés) */
export const cleanCode = (value: string) =>
  [...normalizeCode(value)].filter((c) => allowed.has(c)).join('').slice(0, LIMITS.codeLength);

/** Feuille de saisie du code de partie (remonte du bas de l'écran). */
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
  const inputRef = useRef<HTMLInputElement>(null);
  const complete = code.length === LIMITS.codeLength;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setCode(cleanCode(initialCode));
      d.showModal();
      inputRef.current?.focus();
    }
    if (!open && d.open) d.close();
  }, [open, initialCode]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (complete && !busy) onJoin(code);
  }

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onCancel={onClose}
      // Toucher le voile (en dehors de la feuille) ferme la saisie
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form className="sheet-body" onSubmit={submit}>
        <span className="sheet-grip" aria-hidden="true" />
        <header className="sheet-head">
          <h2>{t('home.codeTitle')}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="close" />
          </button>
        </header>
        <p className="muted">{t('home.codeHelp', { count: LIMITS.codeLength })}</p>

        <div className="code-boxes" onClick={() => inputRef.current?.focus()}>
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
            ref={inputRef}
            className="code-hidden-input"
            value={code}
            onChange={(e) => setCode(cleanCode(e.target.value))}
            autoComplete="one-time-code"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            aria-label={t('home.codeTitle')}
          />
        </div>

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-primary btn-lg" disabled={!complete || busy}>
          {busy ? <span className="spinner" aria-label={t('common.loading')} /> : t('home.codeSubmit')}
        </button>
      </form>
    </dialog>
  );
}
