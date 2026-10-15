import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';
import type { TranslationKey } from '../i18n/fr';
import { useGame } from '../lib/game';
import { useSession } from '../lib/session';
import { SCENES, type Capitals, type PlayerGameView, type ResultView, type RoomView } from '../protocol';

/** Heure serveur corrigée, rafraîchie régulièrement */
function useNow(offset: number, active = true) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now() + offset), 250);
    return () => clearInterval(id);
  }, [offset, active]);
  return now;
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

function ResultItem({ result, fresh }: { result: ResultView; fresh: boolean }) {
  return (
    <li className={`result-item tone-${result.tone}${fresh ? ' fresh' : ''}`}>
      <p>{result.text}</p>
      <DeltaChips delta={result.delta} />
    </li>
  );
}

/** La scène illustrée de l'étape : lieux à toucher, et l'avatar du joueur là où il se trouve */
function SceneView({
  game,
  selected,
  onSelect,
  interactive,
}: {
  game: PlayerGameView;
  selected: string;
  onSelect: (placeId: string) => void;
  interactive: boolean;
}) {
  const { user } = useSession();
  const scene = SCENES[game.stage];
  const here = scene.places.find((p) => p.id === game.me.place) ?? scene.places[0]!;
  return (
    <section className="scene">
      <div className="scene-frame">
        <img className="scene-img" src={`/scenes/${game.stage}.svg`} alt="" />
        {scene.places.map((p) => (
          <button
            key={p.id}
            className={`scene-pin${selected === p.id ? ' on' : ''}${game.me.place === p.id ? ' here' : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y - 14}%` }}
            onClick={() => onSelect(p.id)}
            disabled={!interactive}
            aria-label={p.name}
            title={p.name}
          >
            {p.emoji}
          </button>
        ))}
        {user && (
          <span className={`scene-me${game.activity ? ' working' : ''}`} style={{ left: `${here.x}%`, top: `${here.y}%` }}>
            {game.activity && <span className="scene-doing">{game.activity.emoji}</span>}
            <Avatar avatar={user.avatar} color={user.color} size="sm" />
          </span>
        )}
      </div>
    </section>
  );
}

/** Situation de vie à traiter : carte prioritaire, avec compte à rebours */
function EventSheet({ game, offset }: { game: PlayerGameView; offset: number }) {
  const { t, tServer } = useI18n();
  const { call } = useGame();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ev = game.event!;
  const now = useNow(offset, ev.endsAt !== null);
  const total = useRef<{ id: string; ms: number }>({ id: '', ms: 1 });
  if (total.current.id !== ev.id) total.current = { id: ev.id, ms: Math.max(1, (ev.endsAt ?? 0) - now) };
  const left = ev.endsAt === null ? null : Math.max(0, ev.endsAt - now);

  async function answer(optionId: string) {
    setSending(true);
    const res = await call('game:answer', { optionId });
    setSending(false);
    setError(res.ok ? null : tServer(res.error));
  }

  return (
    <div className="event-overlay" role="dialog" aria-modal="true" aria-labelledby="event-title">
      <section className="event-card">
        <div className="event-head">
          <span className="event-emoji">{ev.situation.emoji}</span>
          <div>
            <p className="eyebrow">{ev.mandatory ? t('game.mandatory') : t('game.event')}</p>
            <h2 id="event-title">{ev.situation.title}</h2>
          </div>
          {left !== null && <span className="event-timer">{Math.ceil(left / 1000)}</span>}
        </div>
        {left !== null && (
          <span className="event-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${left / total.current.ms})` }} />
          </span>
        )}
        <p className="event-text">{ev.situation.text}</p>
        <ul className="choices">
          {ev.options.map((o, i) => (
            <li key={o.id}>
              <button className={`choice-btn c${i % 4}`} disabled={!!o.locked || sending || game.paused} onClick={() => void answer(o.id)}>
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
              </button>
            </li>
          ))}
        </ul>
        {error && <p className="alert alert-error">{error}</p>}
      </section>
    </div>
  );
}

/** Partie en cours, côté joueur : chacun joue à son rythme dans la scène de l'étape. */
export function GameScreen({ room, game }: { room: RoomView; game: PlayerGameView }) {
  const { t, tServer } = useI18n();
  const { call, clockOffset } = useGame();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState(game.me.place);
  const now = useNow(clockOffset, game.stepEndsAt !== null || !!game.activity);
  const { me, story, step } = game;
  const scene = SCENES[game.stage];

  // Nouvelle étape : on repart du premier lieu de la scène
  useEffect(() => setSelected(SCENES[game.stage].places[0]!.id), [game.stage]);
  useEffect(() => setError(null), [step]);

  // Notification ponctuelle (argent donné, événement) : affichée quelques secondes
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!game.flash) return;
    setFlash(game.flash.text);
    const id = setTimeout(() => setFlash(null), 4_000);
    return () => clearTimeout(id);
  }, [game.flash?.text]); // eslint-disable-line react-hooks/exhaustive-deps

  // Résultat le plus récent mis en avant
  const lastSeen = useRef<string | null>(null);
  const freshId = game.results[0]?.id ?? null;
  const [fresh, setFresh] = useState<string | null>(null);
  useEffect(() => {
    if (freshId && freshId !== lastSeen.current) {
      lastSeen.current = freshId;
      setFresh(freshId);
      const id = setTimeout(() => setFresh(null), 2_500);
      return () => clearTimeout(id);
    }
  }, [freshId]);

  async function act(actionId: string) {
    setSending(true);
    const res = await call('game:act', { actionId });
    setSending(false);
    setError(res.ok ? null : tServer(res.error));
  }

  const stepLeft = game.stepEndsAt === null ? null : Math.max(0, Math.ceil((game.stepEndsAt - now) / 1000));
  const clock = stepLeft === null ? '' : `${Math.floor(stepLeft / 60)}:${String(stepLeft % 60).padStart(2, '0')}`;
  const stageLabel = t(`stage.${game.stage}` as TranslationKey);
  const place = scene.places.find((p) => p.id === selected) ?? scene.places[0]!;
  const actions = game.actions.filter((a) => a.placeId === place.id);
  const activity = game.activity;
  const progress = activity ? Math.min(1, (now - activity.startedAt) / Math.max(1, activity.endsAt - activity.startedAt)) : 0;

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
          {step !== 'final' && <small>{game.paused ? t('game.paused') : clock}</small>}
        </div>
        <div className="cls-badge" data-cls={me.cls}>
          <small>{t('game.class')}</small>
          <strong>{t(`class.${me.cls}` as TranslationKey)}</strong>
        </div>
      </header>

      <Stats capitals={me.capitals} />

      {game.paused && (
        <section className="pause-card">
          <Icon name="clock" size={28} />
          <strong>{t('game.paused')}</strong>
          <span>{t('game.pausedSub')}</span>
        </section>
      )}

      {(step === 'intro' || step === 'play') && (
        <SceneView game={game} selected={selected} onSelect={setSelected} interactive={step === 'play'} />
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

      {step === 'play' && (
        <>
          {activity ? (
            <section className="activity-card">
              <span className="activity-emoji">{activity.emoji}</span>
              <div className="activity-text">
                <small>{t('game.doing')}</small>
                <strong>{activity.label}</strong>
                <span className="activity-bar">
                  <span style={{ transform: `scaleX(${progress})` }} />
                </span>
              </div>
              <button className="icon-btn" onClick={() => void call('game:cancel')} aria-label={t('game.stop')} title={t('game.stop')}>
                <Icon name="close" />
              </button>
            </section>
          ) : null}

          <section className="place-sheet">
            <header className="place-head">
              <h2>
                <span aria-hidden="true">{place.emoji}</span> {place.name}
              </h2>
              {me.place === place.id && <span className="place-here">{t('game.youAreHere')}</span>}
            </header>
            <div className="place-tabs" role="tablist">
              {scene.places.map((p) => (
                <button key={p.id} role="tab" aria-selected={p.id === place.id} onClick={() => setSelected(p.id)}>
                  {p.emoji}
                </button>
              ))}
            </div>
            <ul className="actions">
              {actions.map((a) => (
                <li key={a.id}>
                  <button className="action-btn" disabled={!!a.locked || !!activity || sending || game.paused || !!game.event} onClick={() => void act(a.id)}>
                    <span className="action-emoji" aria-hidden="true">
                      {a.emoji}
                    </span>
                    <span className="action-text">
                      <strong>{a.label}</strong>
                      <small>
                        {a.locked ? (
                          <>
                            <Icon name="lock" size={12} /> {a.locked}
                          </>
                        ) : (
                          a.hint || ' '
                        )}
                      </small>
                    </span>
                    <span className="action-time">{t('game.seconds', { n: a.seconds })}</span>
                  </button>
                </li>
              ))}
              {actions.length === 0 && <li className="actions-empty">{t('game.nothingHere')}</li>}
            </ul>
          </section>

          {game.results.length > 0 && (
            <section className="journal">
              <h2 className="list-title">{t('game.journal')}</h2>
              <ol>
                {game.results.slice(0, 4).map((r) => (
                  <ResultItem key={r.id} result={r} fresh={r.id === fresh} />
                ))}
              </ol>
            </section>
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

      {me.titles.length > 0 && step !== 'play' && (
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
        <button className="btn btn-ghost" onClick={() => void call('room:leave')}>
          {t('room.backHome')}
        </button>
      )}

      {step === 'play' && game.event && <EventSheet game={game} offset={clockOffset} />}
    </main>
  );
}
