import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';
import type { TranslationKey } from '../i18n/fr';
import { useGame } from '../lib/game';
import type { Capitals, PlayerGameView, RoomView, RoundResult } from '../protocol';

/** Secondes restantes avant la fin de l'étape (heure serveur corrigée), et part écoulée. */
function useCountdown(endsAt: number | null, offset: number) {
  const [now, setNow] = useState(() => Date.now() + offset);
  const total = useRef<{ endsAt: number | null; ms: number }>({ endsAt: null, ms: 1 });
  if (total.current.endsAt !== endsAt) {
    total.current = { endsAt, ms: Math.max(1, (endsAt ?? 0) - (Date.now() + offset)) };
  }
  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => setNow(Date.now() + offset), 250);
    return () => clearInterval(id);
  }, [endsAt, offset]);
  if (endsAt === null) return { seconds: null, ratio: 0 };
  const left = Math.max(0, endsAt - now);
  return { seconds: Math.ceil(left / 1000), ratio: Math.min(1, left / total.current.ms) };
}

function useFmt() {
  const { locale } = useI18n();
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  return {
    money: (n: number) => money.format(n),
    signedMoney: (n: number) => `${n > 0 ? '+' : ''}${money.format(n)}`,
  };
}

const STAT_KEYS: (keyof Capitals)[] = ['money', 'savoir', 'reseau', 'moral'];
const STAT_ICON = { money: '💶', savoir: '📚', reseau: '🤝', moral: '❤️' } as const;

/** Les 4 capitaux du joueur, toujours visibles */
function Stats({ capitals }: { capitals: Capitals }) {
  const { t } = useI18n();
  const fmt = useFmt();
  return (
    <section className="stats-bar">
      {STAT_KEYS.map((k) => (
        <div key={k} className={`stat stat-${k}`}>
          <span className="stat-ico" aria-hidden="true">
            {STAT_ICON[k]}
          </span>
          <strong>{k === 'money' ? fmt.money(capitals.money) : Math.round(capitals[k])}</strong>
          <small>{t(`game.${k}` as TranslationKey)}</small>
          {k !== 'money' && (
            <span className="stat-gauge" aria-hidden="true">
              <span style={{ width: `${Math.max(0, Math.min(100, capitals[k]))}%` }} />
            </span>
          )}
        </div>
      ))}
    </section>
  );
}

function DeltaChips({ delta }: { delta: Capitals }) {
  const { t } = useI18n();
  const fmt = useFmt();
  const chips = STAT_KEYS.filter((k) => Math.round(delta[k]) !== 0);
  if (!chips.length) return null;
  return (
    <div className="delta-chips">
      {chips.map((k) => {
        const v = delta[k];
        return (
          <span key={k} className={`delta ${v > 0 ? 'up' : 'down'}`}>
            {STAT_ICON[k]} {k === 'money' ? fmt.signedMoney(v) : `${v > 0 ? '+' : ''}${Math.round(v)} ${t(`game.${k}` as TranslationKey).toLowerCase()}`}
          </span>
        );
      })}
    </div>
  );
}

function ResultCard({ result }: { result: RoundResult }) {
  const lines = result.text.split('\n');
  return (
    <section className={`result-card tone-${result.tone}`}>
      <p className="result-main">{lines[0]}</p>
      {lines.slice(1).map((l, i) => (
        <p key={i} className="result-extra">
          {l}
        </p>
      ))}
      <DeltaChips delta={result.delta} />
    </section>
  );
}

/** Partie en cours, côté joueur : situation, choix façon Kahoot, résultats, bilans, fin. */
export function GameScreen({ room, game }: { room: RoomView; game: PlayerGameView }) {
  const { t, tServer } = useI18n();
  const { call, clockOffset } = useGame();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const { seconds, ratio } = useCountdown(game.stepEndsAt, clockOffset);
  const { me, round, story, step } = game;

  // Notification ponctuelle (argent donné, événement) : affichée quelques secondes
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!game.flash) return;
    setFlash(game.flash.text);
    const id = setTimeout(() => setFlash(null), 4_000);
    return () => clearTimeout(id);
  }, [game.flash?.text]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setError(null), [step, round?.situation.id]);

  async function choose(optionId: string) {
    setSending(optionId);
    const res = await call('game:choose', { optionId });
    setSending(null);
    setError(res.ok ? null : tServer(res.error));
  }

  async function leave() {
    await call('room:leave');
  }

  const stageLabel = t(`stage.${game.stage}` as TranslationKey);

  return (
    <main className={`screen game-screen step-${step}`} data-cls={me.cls}>
      {flash && (
        <div className="flash" role="status">
          {flash}
        </div>
      )}

      <header className="game-top">
        <div className="game-stage">
          <span className="stage-steps" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < game.stageIndex ? 'done' : i === game.stageIndex ? 'now' : ''} />
            ))}
          </span>
          <strong>{stageLabel}</strong>
          {(step === 'choose' || step === 'reveal') && (
            <small>{t('game.round', { n: game.roundIndex + 1, total: game.roundCount })}</small>
          )}
        </div>
        <div className="cls-badge" data-cls={me.cls}>
          <small>{t('game.class')}</small>
          <strong>{t(`class.${me.cls}` as TranslationKey)}</strong>
        </div>
      </header>

      {step !== 'final' && (
        <div className="timer" aria-hidden={seconds === null}>
          <span className="timer-bar">
            <span style={{ transform: `scaleX(${game.paused ? 1 : ratio})` }} />
          </span>
          <span className="timer-num">{game.paused ? '⏸' : (seconds ?? '')}</span>
        </div>
      )}

      <Stats capitals={me.capitals} />

      {game.paused && (
        <section className="pause-card">
          <Icon name="clock" size={28} />
          <strong>{t('game.paused')}</strong>
          <span>{t('game.pausedSub')}</span>
        </section>
      )}

      {step === 'intro' && story && (
        <section className="story-card">
          <p className="eyebrow">{stageLabel}</p>
          <h1>{story.title}</h1>
          <p>{story.text}</p>
          <p className="story-origin">
            {t('game.origin')} <strong>{t(`class.${me.origin}` as TranslationKey).toLowerCase()}</strong>
          </p>
        </section>
      )}

      {(step === 'choose' || step === 'reveal') && round && (
        <>
          <section className="situation">
            <span className="situation-emoji" aria-hidden="true">
              {round.situation.emoji}
            </span>
            <div>
              <h1>{round.situation.title}</h1>
              <p>{round.situation.text}</p>
            </div>
          </section>

          {step === 'reveal' && round.result ? (
            <ResultCard result={round.result} />
          ) : (
            <>
              <ul className="choices">
                {round.options.map((o, i) => (
                  <li key={o.id}>
                    <button
                      className={`choice-btn c${i % 4}${round.choice === o.id ? ' picked' : ''}`}
                      disabled={!!o.locked || game.paused || sending !== null}
                      aria-pressed={round.choice === o.id}
                      onClick={() => void choose(o.id)}
                    >
                      <span className="choice-emoji" aria-hidden="true">
                        {o.emoji}
                      </span>
                      <span className="choice-text">
                        <strong>{o.label}</strong>
                        {(o.locked || o.hint) && (
                          <small>
                            {o.locked ? (
                              <>
                                <Icon name="lock" size={12} /> {o.locked}
                              </>
                            ) : (
                              o.hint
                            )}
                          </small>
                        )}
                      </span>
                      {round.choice === o.id && <Icon name="check" size={20} weight="bold" className="choice-check" />}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="choice-status">{round.choice ? t('game.chosen') : t('game.choose')}</p>
            </>
          )}
        </>
      )}

      {step === 'milestone' && story && (
        <section className="story-card milestone">
          <p className="eyebrow">{t('game.milestone')}</p>
          <h1>{story.title}</h1>
          <p>{story.text}</p>
          <p className="story-origin">{t('game.next')}</p>
        </section>
      )}

      {step === 'final' && game.final && (
        <section className="final-card" data-cls={me.cls}>
          <p className="eyebrow">{t('game.finalTitle')}</p>
          <p className="final-rank">{t('game.rank', { rank: game.final.rank, total: game.final.total })}</p>
          <div className="final-move">
            <span className="cls-pill" data-cls={me.origin}>
              {t(`class.${me.origin}` as TranslationKey)}
            </span>
            <Icon name="chevron" size={18} />
            <span className="cls-pill" data-cls={me.cls}>
              {t(`class.${me.cls}` as TranslationKey)}
            </span>
          </div>
          <p>{game.final.text}</p>
          <p className="footnote">{t('game.lookScreen')}</p>
        </section>
      )}

      {me.titles.length > 0 && (
        <section className="card path-card">
          <h2 className="list-title">{t('game.path')}</h2>
          <ol className="path">
            {me.titles.map((title, i) => (
              <li key={i}>{title}</li>
            ))}
          </ol>
        </section>
      )}

      {error && <p className="alert alert-error">{error}</p>}

      {room.phase === 'ended' && (
        <button className="btn btn-ghost" onClick={() => void leave()}>
          {t('room.backHome')}
        </button>
      )}
    </main>
  );
}
