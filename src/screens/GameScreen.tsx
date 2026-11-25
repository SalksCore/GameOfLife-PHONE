import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Avatar } from '../components/Avatar';
import { GameIcon } from '../components/GameIcon';
import { useGame } from '../lib/game';
import { useSession } from '../lib/session';
import {
  CLASS_LABELS,
  CLASS_SHORT,
  LIMITS,
  type CharacterView,
  type GameInput,
  type JobsView,
  type MiniGameView,
  type ParcoursupView,
  type PlayerGameView,
  type PollView,
  type RoomView,
  type SocialClass,
  type VoteView,
  type YearView,
} from '../protocol';

// ================================================================= Outils

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const money = (n: number) => euro.format(n);
const grade = (g: number) => g.toFixed(1).replace('.', ',');

function useNow(offset: number, active: boolean) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now() + offset), 250);
    return () => clearInterval(id);
  }, [offset, active]);
  return now;
}

/** Envoi d'une saisie avec retour d'erreur lisible */
function useSend() {
  const { call } = useGame();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const send = async (input: GameInput) => {
    setBusy(true);
    const res = await call('game:input', input);
    setBusy(false);
    setError(res.ok ? null : res.error);
    return res.ok;
  };
  return { send, error, busy, clear: () => setError(null) };
}

const KIND_LABEL: Record<string, string> = {
  slide: 'Exposé',
  poll: 'Sondage',
  pollCompare: 'Avant / après',
  draw: 'Tirage des familles',
  year: 'Année',
  bac: 'Le bac',
  vote: 'Vote',
  parcoursup: 'Parcoursup',
  parcoursupResults: 'Parcoursup',
  parcoursupFinal: 'Parcoursup',
  diploma: 'Diplômes',
  jobs: 'Premier emploi',
  final: 'La pyramide',
  stats: 'Chiffres',
  debrief: 'Débrief',
};

// ================================================================= Écran principal

export function GameScreen({ room, game }: { room: RoomView; game: PlayerGameView }) {
  const { user } = useSession();
  const { clockOffset } = useGame();
  const [tab, setTab] = useState<'play' | 'path'>('play');
  const c = game.character;
  const ended = room.phase === 'ended';
  // Pendant le tirage, la famille reste une surprise jusqu'à ce que la carte soit retournée
  const hideMe = game.step.kind === 'draw' && !game.step.replay;

  // Nouvelle étape : retour sur « Jouer », en haut de page
  useEffect(() => {
    setTab('play');
    window.scrollTo(0, 0);
  }, [game.step.id]);

  return (
    <main className="gx" data-cls={hideMe ? undefined : c?.origin} data-color={user?.color}>
      <TopBar game={game} offset={clockOffset} character={hideMe ? null : c} />
      {c && !hideMe && <Gauges c={c} />}

      <div className="gx-body">
        {tab === 'path' && c ? <PathTab c={c} /> : <StepContent game={game} room={room} ended={ended} />}
      </div>

      {c && (
        <nav className="gx-tabs" aria-label="Navigation de la partie">
          <button className={tab === 'play' ? 'on' : ''} onClick={() => setTab('play')}>
            <span aria-hidden="true"><GameIcon name="gamepad" /></span> Jouer
          </button>
          <button className={tab === 'path' ? 'on' : ''} onClick={() => setTab('path')}>
            <span aria-hidden="true"><GameIcon name="compass" /></span> Mon parcours
          </button>
        </nav>
      )}

      {game.flash && <Flash key={game.flash.id} text={game.flash.text} />}
      {game.timer.paused && !game.step.replay && (
        <div className="gx-pause" role="status">
          <span aria-hidden="true"><GameIcon name="pause" /></span>
          <strong>Partie en pause</strong>
          <p>L’organisateur explique quelque chose. Regarde l’écran.</p>
        </div>
      )}
    </main>
  );
}

function TopBar({ game, offset, character }: { game: PlayerGameView; offset: number; character: CharacterView | null }) {
  const { endsAt, remaining, paused } = game.timer;
  const now = useNow(offset, endsAt !== null);
  const total = useRef<{ endsAt: number | null; ms: number }>({ endsAt: null, ms: 1 });
  if (endsAt !== null && total.current.endsAt !== endsAt) total.current = { endsAt, ms: Math.max(1, endsAt - now) };
  const left = endsAt !== null ? Math.max(0, endsAt - now) : remaining;
  const secs = left === null ? null : Math.ceil(left / 1000);
  const ratio = endsAt !== null ? Math.min(1, (endsAt - now) / total.current.ms) : 1;
  const title = game.step.kind === 'year' && game.year ? `${game.year.label}` : game.step.title;
  return (
    <header className="gx-top">
      <div className="gx-step">
        <small>
          {KIND_LABEL[game.step.kind]} · {game.step.index + 1}/{game.step.total}
        </small>
        <strong>{title}</strong>
      </div>
      {secs !== null && (
        <div className={`gx-clock${secs <= 10 && !paused ? ' hurry' : ''}`} aria-label={`${secs} secondes`}>
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r="15.5" className="track" />
            <circle cx="18" cy="18" r="15.5" className="bar" style={{ strokeDashoffset: `${(1 - ratio) * 97.4}` }} />
          </svg>
          <span>{paused ? <GameIcon name="pause" weight="fill" /> : secs}</span>
        </div>
      )}
      {character && (
        <span className="gx-family" data-cls={character.origin}>
          {CLASS_SHORT[character.origin]}
        </span>
      )}
    </header>
  );
}

function Gauges({ c }: { c: CharacterView }) {
  const s = c.stats;
  const prev = useRef(s);
  const [bump, setBump] = useState<Record<string, 'up' | 'down'>>({});
  useEffect(() => {
    const p = prev.current;
    const next: Record<string, 'up' | 'down'> = {};
    for (const k of ['grade', 'contacts', 'energy', 'budget'] as const) if (s[k] !== p[k]) next[k] = s[k] > p[k] ? 'up' : 'down';
    prev.current = s;
    if (Object.keys(next).length) {
      setBump(next);
      const t = setTimeout(() => setBump({}), 1_400);
      return () => clearTimeout(t);
    }
  }, [s]);
  return (
    <section className="gx-gauges" aria-label="Tes jauges">
      <div className={`gx-g ${bump.grade ?? ''}`}>
        <span aria-hidden="true"><GameIcon name="books" /></span>
        <strong>{grade(s.grade)}</strong>
        <small>moyenne</small>
      </div>
      <div className={`gx-g ${bump.contacts ?? ''}`}>
        <span aria-hidden="true"><GameIcon name="handshake" /></span>
        <strong>{grade(s.contacts)}</strong>
        <small>contacts</small>
      </div>
      <div className={`gx-g ${bump.energy ?? ''}`}>
        <span aria-hidden="true"><GameIcon name="battery" /></span>
        <span className="gx-pips" aria-label={`Énergie ${grade(s.energy)} sur 5`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <i key={i} className={s.energy >= i + 1 ? 'full' : s.energy > i ? 'half' : ''} />
          ))}
        </span>
        <small>énergie</small>
      </div>
      <div className={`gx-g ${bump.budget ?? ''}${s.budget < 0 ? ' debt' : ''}`}>
        <span aria-hidden="true"><GameIcon name="money" /></span>
        <strong>{money(s.budget)}</strong>
        <small>budget</small>
      </div>
    </section>
  );
}

function Flash({ text }: { text: string }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 5_000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="gx-flash" role="status" onClick={() => setShow(false)}>
      {text}
    </div>
  );
}

// ================================================================= Contenu de l'étape

function StepContent({ game, room, ended }: { game: PlayerGameView; room: RoomView; ended: boolean }) {
  const k = game.step.kind;
  const c = game.character;
  if (game.step.replay) return <LookUp c={c} text="On revient sur une étape déjà jouée. Regarde l’écran." />;
  if (k === 'poll' && game.poll) return <Poll poll={game.poll} />;
  if (k === 'vote' && game.vote) return <Vote vote={game.vote} />;
  if (k === 'draw') return c ? <FamilyCard c={c} /> : <LookUp c={null} text="Les familles sont tirées au sort…" />;
  if (k === 'year' && game.year && c) return <Year year={game.year} c={c} />;
  if ((k === 'bac' || k === 'diploma') && c)
    return game.outcome ? <Outcome o={game.outcome} kicker={k === 'bac' ? 'Résultats du bac' : 'Remise des diplômes'} /> : <Suspense text={k === 'bac' ? 'Les copies sont corrigées… Résultats à l’écran dans un instant.' : 'Le jury délibère… Les diplômes arrivent.'} />;
  if (game.parcoursup && c) return <Parcoursup ps={game.parcoursup} />;
  if (game.jobs && c) return <Jobs jobs={game.jobs} />;
  if (k === 'final') return game.final ? <Final f={game.final} c={c} /> : <Suspense text="La pyramide se construit à l’écran, étage par étage…" />;
  if (ended && k !== 'slide') return <LookUp c={c} text={`La partie « ${room.name} » est terminée. Merci d’avoir joué !`} />;
  return <LookUp c={c} text={k === 'stats' ? 'Les chiffres de la partie sont à l’écran.' : 'Regarde l’écran'} />;
}

function LookUp({ c, text }: { c: CharacterView | null; text: string }) {
  return (
    <section className="gx-look">
      <div className="gx-eye" aria-hidden="true">
        <span />
      </div>
      <h1>{text}</h1>
      {c && (
        <p className="gx-look-me">
          <span data-cls={c.origin} className="gx-dot" /> {CLASS_LABELS[c.origin]} · {grade(c.stats.grade)}/20 · {c.status}
        </p>
      )}
    </section>
  );
}

function Suspense({ text }: { text: string }) {
  return (
    <section className="gx-look">
      <div className="gx-drum" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <h1>{text}</h1>
    </section>
  );
}

function Hint({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'ok' }) {
  return (
    <p className={`gx-hint ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

// ================================================================= Sondage

function Poll({ poll }: { poll: PollView }) {
  const { send, error } = useSend();
  const answered = poll.answers.filter((a) => a !== null).length;
  return (
    <section className="gx-card">
      <p className="gx-kicker">Anonyme · {answered}/{poll.questions.length} réponses</p>
      {poll.questions.map((q, i) => (
        <fieldset key={i} className="gx-q" disabled={!poll.open}>
          <legend>{q.question}</legend>
          <div className="gx-choices">
            {q.options.map((o, k) => (
              <button key={k} className={`gx-choice${poll.answers[i] === k ? ' on' : ''}`} aria-pressed={poll.answers[i] === k} onClick={() => void send({ type: 'poll', question: i, option: k })}>
                {o}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      {error && <Hint tone="error">{error}</Hint>}
      <Hint tone={poll.open ? 'ok' : 'info'}>{poll.open ? (answered === poll.questions.length ? 'Choix enregistré. Tu peux encore changer d’avis.' : 'Touche une réponse par question.') : 'Le sondage est fermé : regarde les résultats à l’écran.'}</Hint>
    </section>
  );
}

// ================================================================= Vote de réforme

function Vote({ vote }: { vote: VoteView }) {
  const { send, error } = useSend();
  return (
    <section className="gx-card">
      <p className="gx-kicker">C’est toi le gouvernement</p>
      <h1 className="gx-h1">Quelle réforme avant Parcoursup ?</h1>
      <div className="gx-options">
        {vote.options.map((o) => (
          <button
            key={o.id}
            className={`gx-option${vote.myVote === o.id ? ' on' : ''}${vote.winner === o.id ? ' win' : ''}`}
            disabled={!vote.open}
            onClick={() => void send({ type: 'vote', optionId: o.id })}
            aria-pressed={vote.myVote === o.id}
          >
            <span className="gx-option-emoji" aria-hidden="true">
              <GameIcon name={o.icon} />
            </span>
            <span>
              <strong>{o.label}</strong>
              <small>{o.description}</small>
            </span>
            {vote.winner === o.id && <span className="gx-badge good">Adoptée</span>}
          </button>
        ))}
      </div>
      {error && <Hint tone="error">{error}</Hint>}
      {vote.open && vote.myVote && <Hint tone="ok">Vote enregistré. Tu peux encore changer d’avis.</Hint>}
    </section>
  );
}

// ================================================================= Carte de famille

function FamilyCard({ c }: { c: CharacterView }) {
  const [flipped, setFlipped] = useState(false);
  const f = c.family;
  return (
    <section className="gx-family-wrap">
      <div
        role="button"
        tabIndex={0}
        className={`gx-fcard${flipped ? ' flipped' : ''}`}
        data-cls={c.origin}
        onClick={() => setFlipped(true)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setFlipped(true)}
        aria-label={flipped ? CLASS_LABELS[c.origin] : 'Retourner ta carte de famille'}
      >
        <span className="gx-fcard-back" aria-hidden={flipped}>
          <span className="gx-fcard-dice"><GameIcon name="dice" /></span>
          <strong>Ta famille</strong>
          <small>Touche pour découvrir d’où tu pars</small>
        </span>
        <span className="gx-fcard-front" aria-hidden={!flipped}>
          <span className="gx-fcard-class">{CLASS_LABELS[c.origin]}</span>
          <span className="gx-fcard-parents">{f.parents}</span>
          <span className="gx-fcard-grid">
            <span>
              <b>{grade(f.grade)}</b>
              <small>moyenne d’entrée</small>
            </span>
            <span>
              <b>{f.contacts}</b>
              <small>contacts</small>
            </span>
            <span>
              <b>{money(f.budget)}</b>
              <small>budget perso</small>
            </span>
            <span>
              <b>×{String(f.help).replace('.', ',')}</b>
              <small>aide aux devoirs</small>
            </span>
          </span>
          <span className="gx-fcard-list">
            <span><GameIcon name="school" /> {f.school}</span>
            <span><GameIcon name="family" /> Tes parents paient {Math.round(f.support * 100)} % de tes études</span>
            <span>
       <GameIcon name={f.informed ? 'compass' : 'fog'} />{' '}
       {f.informed ? 'Tu connais les filières sélectives' : 'Personne ne t’a parlé des filières sélectives'}
     </span>
            <span><GameIcon name="gift" /> Don à l’entrée dans la vie active : {money(f.gift)}</span>
            {f.forced && <span className="warn"><GameIcon name="hourglass" /> {f.forced}</span>}
          </span>
        </span>
      </div>
      <p className="gx-note">Même âge, même classe. Mais pas le même départ.</p>
    </section>
  );
}

// ================================================================= Année : temps, décision, bulletin

function Year({ year, c }: { year: YearView; c: CharacterView }) {
  if (year.phase === 'report' && year.report) return <Report year={year} />;
  if (year.phase === 'report') return <Suspense text="Le conseil de classe se réunit…" />;
  return <YearPlay year={year} c={c} />;
}

function YearPlay({ year, c }: { year: YearView; c: CharacterView }) {
  const { send, error } = useSend();
  const forcedCount = year.forced.reduce((s, f) => s + f.count, 0);
  const free = year.totalTokens - forcedCount;
  const [tokens, setTokens] = useState<Record<string, number>>(year.tokens);
  const [part, setPart] = useState<'time' | 'mini' | 'choice'>('time');
  const placed = Object.values(tokens).reduce((s, v) => s + v, 0);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Synchronisation avec le binôme (l'autre peut jouer aussi) : jamais pendant qu'on modifie soi-même
  const lastLocal = useRef(0);
  const serverKey = JSON.stringify(year.tokens);
  useEffect(() => {
    if (Date.now() - lastLocal.current > 1_500) setTokens(year.tokens);
  }, [serverKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function change(id: string, d: number) {
    lastLocal.current = Date.now();
    setTokens((prev) => {
      const used = Object.values(prev).reduce((s, v) => s + v, 0);
      if (d > 0 && used >= free) return prev;
      const next = { ...prev, [id]: Math.max(0, (prev[id] ?? 0) + d) };
      clearTimeout(debounce.current);
      debounce.current = setTimeout(() => void send({ type: 'tokens', tokens: next }), 300);
      return next;
    });
  }

  const forcedCats = year.forced.flatMap((f) => Array.from({ length: f.count }, () => f));
  const choice = year.decision.options.find((o) => o.id === year.decision.choice);

  return (
    <section className="gx-year">
      <div className="gx-year-head">
        <span className="gx-year-num">Année {year.number}/7</span>
        <div className="gx-seg" role="tablist">
          <button role="tab" aria-selected={part === 'time'} className={part === 'time' ? 'on' : ''} onClick={() => setPart('time')}>
            ① Mon temps {placed === free && '✓'}
          </button>
          {year.mini && (
            <button role="tab" aria-selected={part === 'mini'} className={part === 'mini' ? 'on' : ''} onClick={() => setPart('mini')}>
              ② {year.mini.title} {year.mini.done && '✓'}
            </button>
          )}
          <button role="tab" aria-selected={part === 'choice'} className={part === 'choice' ? 'on' : ''} onClick={() => setPart('choice')}>
            {year.mini ? '③' : '②'} Ma décision {choice && '✓'}
          </button>
        </div>
      </div>

      {part === 'time' ? (
        <div className="gx-card">
          <div className="gx-slots" aria-label={`${placed + forcedCount} jetons placés sur ${year.totalTokens}`}>
            {forcedCats.map((f, i) => (
              <span key={`f${i}`} className="gx-slot forced" title={f.reason}>
                <GameIcon name={f.category === 'famille' ? 'home' : 'receipt'} />
              </span>
            ))}
            {Array.from({ length: free }, (_, i) => {
              const cat = year.categories.flatMap((x) => Array.from({ length: tokens[x.id] ?? 0 }, () => x))[i];
              return (
                <span key={i} className={`gx-slot${cat ? ' filled' : ''}`}>
                  {cat && <GameIcon name={cat.icon} />}
                </span>
              );
            })}
          </div>
          {year.forced.map((f) => (
            <p key={f.category} className="gx-forced">
              <GameIcon name="lock" /> {f.count} jeton{f.count > 1 ? 's' : ''} imposé{f.count > 1 ? 's' : ''} : {f.reason}
            </p>
          ))}
          <ul className="gx-cats">
            {year.categories.map((cat) => {
              const n = tokens[cat.id] ?? 0;
              return (
                <li key={cat.id} className={n ? 'on' : ''}>
                  <span className="gx-cat-emoji" aria-hidden="true">
                    <GameIcon name={cat.icon} />
                  </span>
                  <span className="gx-cat-text">
                    <strong>{cat.label}</strong>
                    <small>{cat.hint}</small>
                  </span>
                  <span className="gx-stepper">
                    <button onClick={() => change(cat.id, -1)} disabled={!n} aria-label={`Retirer un jeton : ${cat.label}`}>
                      −
                    </button>
                    <b aria-live="polite">{n}</b>
                    <button onClick={() => change(cat.id, 1)} disabled={placed >= free} aria-label={`Ajouter un jeton : ${cat.label}`}>
                      +
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          {c.stats.energy < 3 && year.stage !== 'travail' && <Hint><GameIcon name="battery" /> Énergie basse : ton travail rapportera moins. Pense au repos.</Hint>}
          <button className="gx-cta" disabled={placed < free} onClick={() => setPart(year.mini ? 'mini' : 'choice')}>
            {placed < free ? `Encore ${free - placed} jeton${free - placed > 1 ? 's' : ''} à placer` : year.mini ? `Continuer : ${year.mini.title} →` : 'Continuer : ma décision →'}
          </button>
        </div>
      ) : part === 'mini' && year.mini ? (
        <MiniGame mini={year.mini} send={send} onNext={() => setPart('choice')} />
      ) : (
        <div className="gx-card">
          <p className="gx-kicker">
            <GameIcon name={year.decision.icon} /> {year.decision.title}
          </p>
          <p className="gx-lead">{year.decision.text}</p>
          <div className="gx-options">
            {year.decision.options.map((o) => (
              <button
                key={o.id}
                className={`gx-option${year.decision.choice === o.id ? ' on' : ''}${o.locked ? ' locked' : ''}`}
                disabled={!!o.locked}
                aria-pressed={year.decision.choice === o.id}
                onClick={() => void send({ type: 'decide', optionId: o.id })}
              >
                <span className="gx-option-emoji" aria-hidden="true">
                  <GameIcon name={o.locked ? 'lock' : o.icon} />
                </span>
                <span>
                  <strong>{o.label}</strong>
                  {o.hint && <small>{o.hint}</small>}
                  {o.locked && <small className="gx-lock">{o.locked}</small>}
                </span>
              </button>
            ))}
          </div>
          <button className="gx-cta" disabled={year.submitted} onClick={() => void send({ type: 'tokens', tokens }).then((ok) => ok && send({ type: 'submit' }))}>
            {year.submitted ? '✓ Année validée' : choice ? 'Valider mon année' : 'Valider (sans choix : la voie la plus probable)'}
          </button>
          {year.submitted && <Hint tone="ok">Choix enregistré. Tu peux encore changer d’avis jusqu’à la fin du temps.</Hint>}
        </div>
      )}
      {error && <Hint tone="error">{error}</Hint>}
    </section>
  );
}

// ================================================================= Mini-jeux

type Send = (input: GameInput) => Promise<boolean>;

function MiniGame({ mini, send, onNext }: { mini: MiniGameView; send: Send; onNext: () => void }) {
  return (
    <div className={`gx-card gx-mini kind-${mini.kind}`}>
      <header className="gx-mini-head">
        <span className="gx-mini-emoji" aria-hidden="true">
          <GameIcon name={mini.icon} />
        </span>
        <div>
          <strong>{mini.title}</strong>
          <small>{mini.intro}</small>
        </div>
      </header>
      {mini.kind === 'cards' && <MiniCards mini={mini} send={send} />}
      {mini.kind === 'budget' && <MiniBudget mini={mini} send={send} />}
      {mini.kind === 'offers' && <MiniOffers mini={mini} send={send} />}
      {mini.kind === 'wheel' && <MiniWheel mini={mini} send={send} />}
      <button className="gx-cta" onClick={onNext}>
        {mini.done ? 'Continuer : ma décision →' : 'Passer (choix par défaut) →'}
      </button>
    </div>
  );
}

/** Situations à trancher, une carte à la fois */
function MiniCards({ mini, send }: { mini: MiniGameView; send: Send }) {
  const firstOpen = mini.items.findIndex((it) => !mini.answers[it.id]);
  const [i, setI] = useState(firstOpen < 0 ? 0 : firstOpen);
  const it = mini.items[Math.min(i, mini.items.length - 1)]!;
  const pick = async (option: string) => {
    if (await send({ type: 'mini', item: it.id, option })) setTimeout(() => setI((x) => Math.min(x + 1, mini.items.length - 1)), 250);
  };
  return (
    <div className="gx-mcards">
      <div className="gx-mdots" aria-hidden="true">
        {mini.items.map((x, k) => (
          <button key={x.id} className={`${k === i ? 'on' : ''}${mini.answers[x.id] ? ' done' : ''}`} onClick={() => setI(k)} aria-label={x.title} />
        ))}
      </div>
      <article className="gx-mcard" key={it.id}>
        <span className="gx-mcard-emoji" aria-hidden="true">
          <GameIcon name={it.icon} />
        </span>
        <h3>{it.title}</h3>
        <p>{it.text}</p>
        <div className="gx-mopts">
          {it.options.map((o) => (
            <button key={o.id} className={`gx-mopt${mini.answers[it.id] === o.id ? ' on' : ''}`} disabled={!!o.locked} onClick={() => void pick(o.id)}>
              <span>{o.label}</span>
              {(o.cost !== null || o.hint) && <small>{[o.cost !== null ? (o.cost ? `−${money(o.cost)}` : 'payé par tes parents') : '', o.hint].filter(Boolean).join(' · ')}</small>}
              {o.locked && <small className="gx-lock"><GameIcon name="lock" /> {o.locked}</small>}
            </button>
          ))}
        </div>
      </article>
    </div>
  );
}

/** Budget du mois : une jauge qui bouge à chaque choix */
function MiniBudget({ mini, send }: { mini: MiniGameView; send: Send }) {
  const b = mini.budget!;
  const left = b.start - b.spent;
  const ratio = b.start > 0 ? Math.max(0, Math.min(1, left / b.start)) : left >= 0 ? 1 : 0;
  return (
    <div className="gx-mbudget">
      <div className={`gx-mgauge${left < 0 ? ' neg' : ratio < 0.3 ? ' low' : ''}`}>
        <span>Reste à la fin du mois</span>
        <strong>{money(left)}</strong>
        <i>
          <b style={{ width: `${ratio * 100}%` }} />
        </i>
      </div>
      {mini.items.map((it) => (
        <div key={it.id} className="gx-mrow">
          <p>
            <span aria-hidden="true"><GameIcon name={it.icon} /></span> {it.title}
          </p>
          <div className="gx-mseg">
            {it.options.map((o) => (
              <button key={o.id} className={mini.answers[it.id] === o.id ? 'on' : ''} disabled={!!o.locked} onClick={() => void send({ type: 'mini', item: it.id, option: o.id })}>
                <span>{o.label}</span>
                <small>{o.cost ? `−${money(o.cost)}` : o.cost === 0 ? 'payé' : '0 €'}</small>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Candidatures : jusqu'à N offres, dans l'ordre de préférence */
function MiniOffers({ mini, send }: { mini: MiniGameView; send: Send }) {
  const it = mini.items[0]!;
  const picks = (mini.answers[it.id] ?? '').split(',').filter(Boolean);
  return (
    <div className="gx-moffers">
      <p className="gx-mcount">
        {picks.length}/{mini.maxPicks} candidatures
      </p>
      {it.options.map((o) => {
        const rank = picks.indexOf(o.id);
        return (
          <button key={o.id} className={`gx-moffer${rank >= 0 ? ' on' : ''}`} disabled={!!o.locked || (rank < 0 && picks.length >= (mini.maxPicks ?? 3))} onClick={() => void send({ type: 'mini', item: it.id, option: o.id })}>
            <b>{rank >= 0 ? rank + 1 : '+'}</b>
            <span>
              <strong>{o.label}</strong>
              <small>{o.hint}</small>
            </span>
          </button>
        );
      })}
      <p className="gx-note">Les réponses tombent à la fin de l’année.</p>
    </div>
  );
}

/** Le grand pari : trois niveaux de risque */
function MiniWheel({ mini, send }: { mini: MiniGameView; send: Send }) {
  const it = mini.items[0]!;
  return (
    <div className="gx-mwheel">
      <div className="gx-wheel" aria-hidden="true">
        <span />
      </div>
      <p className="gx-lead">{it.text}</p>
      <div className="gx-mopts">
        {it.options.map((o, k) => (
          <button key={o.id} className={`gx-mopt risk-${k}${mini.answers[it.id] === o.id ? ' on' : ''}`} disabled={!!o.locked} onClick={() => void send({ type: 'mini', item: it.id, option: o.id })}>
            <span>{o.label}</span>
            <small>{o.hint}</small>
            {o.locked && <small className="gx-lock"><GameIcon name="lock" /> {o.locked}</small>}
          </button>
        ))}
      </div>
      <p className="gx-note">La roue tourne à la fin de l’année.</p>
    </div>
  );
}

function Report({ year }: { year: YearView }) {
  const r = year.report!;
  const d = r.grade - r.before;
  return (
    <section className="gx-report">
      <header>
        <p className="gx-kicker">Bilan · {r.title}</p>
        <div className="gx-report-grade">
          <strong>{grade(r.grade)}</strong>
          <span>/20</span>
          {year.stage !== 'travail' && Math.abs(d) >= 0.05 && <em className={d > 0 ? 'up' : 'down'}>{`${d > 0 ? '▲ +' : '▼ '}${grade(d)}`}</em>}
        </div>
        <p className="gx-report-app">« {r.appreciation} »</p>
      </header>
      <ul>
        {r.lines.map((l, i) => (
          <li key={i} className={`tone-${l.tone}`} style={{ animationDelay: `${i * 90}ms` }}>
            <span aria-hidden="true"><GameIcon name={l.icon} /></span>
            <p>{l.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ================================================================= Résultats

function Outcome({ o, kicker }: { o: { icon: string; title: string; text: string; tone: string }; kicker: string }) {
  return (
    <section className={`gx-outcome tone-${o.tone}`}>
      {o.tone === 'good' && <Confetti />}
      <p className="gx-kicker">{kicker}</p>
      <span className="gx-outcome-emoji" aria-hidden="true">
        <GameIcon name={o.icon} />
      </span>
      <h1>{o.title}</h1>
      <p>{o.text}</p>
    </section>
  );
}

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 8) * 0.12, hue: (i * 47) % 360 })), []);
  return (
    <div className="gx-confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} style={{ left: `${b.left}%`, animationDelay: `${b.delay}s`, background: `hsl(${b.hue} 90% 65%)` }} />
      ))}
    </div>
  );
}

// ================================================================= Parcoursup

function Parcoursup({ ps }: { ps: ParcoursupView }) {
  if (!ps.eligible) return <LookUp c={null} text="Sans le bac, pas de Parcoursup : tu entres directement dans la vie active." />;
  if (ps.phase === 'wishes') return <Wishes ps={ps} />;
  if (ps.phase === 'results') return <PsResults ps={ps} />;
  if (ps.final) return <Outcome o={{ icon: ps.final.icon, title: ps.final.label, text: ps.final.text, tone: ps.final.formation ? 'good' : 'bad' }} kicker="Ton affectation" />;
  return <Suspense text="Les affectations tombent…" />;
}

function Wishes({ ps }: { ps: ParcoursupView }) {
  const { send, error } = useSend();
  const [wishes, setWishes] = useState<string[]>(ps.wishes);
  const [bourse, setBourse] = useState(ps.bourse);
  const byId = new Map(ps.formations.map((f) => [f.id, f]));
  const update = (w: string[], b = bourse) => {
    setWishes(w);
    setBourse(b);
    void send({ type: 'wishes', wishes: w, bourse: b, submit: false });
  };
  const move = (i: number, d: number) => {
    const w = [...wishes];
    const j = i + d;
    if (j < 0 || j >= w.length) return;
    [w[i], w[j]] = [w[j]!, w[i]!];
    update(w);
  };
  return (
    <section className="gx-card">
      <p className="gx-kicker"><GameIcon name="graduation" /> Parcoursup · {wishes.length}/{LIMITS.wishesMax} vœux</p>
      <ol className="gx-wishes">
        {wishes.map((id, i) => {
          const f = byId.get(id)!;
          return (
            <li key={id}>
              <b>{i + 1}</b>
              <span aria-hidden="true"><GameIcon name={f?.icon} /></span>
              <span className="gx-wish-label">{f?.label}</span>
              <span className="gx-wish-tools">
                <button onClick={() => move(i, -1)} disabled={i === 0 || ps.submitted} aria-label="Monter">
                  ▲
                </button>
                <button onClick={() => move(i, 1)} disabled={i === wishes.length - 1 || ps.submitted} aria-label="Descendre">
                  ▼
                </button>
                <button onClick={() => update(wishes.filter((x) => x !== id))} disabled={ps.submitted} aria-label="Retirer">
                  ✕
                </button>
              </span>
            </li>
          );
        })}
        {!wishes.length && <li className="gx-wish-empty">Ajoute tes vœux dans l’ordre de préférence.</li>}
      </ol>

      <ul className="gx-formations">
        {ps.formations.map((f) => {
          const inList = wishes.includes(f.id);
          return (
            <li key={f.id} className={f.locked ? 'locked' : inList ? 'in' : ''}>
              <button disabled={!!f.locked || inList || wishes.length >= LIMITS.wishesMax || ps.submitted} onClick={() => update([...wishes, f.id])}>
                <span className="gx-option-emoji" aria-hidden="true">
                  <GameIcon name={f.locked ? 'lock' : f.icon} />
                </span>
                <span>
                  <strong>{f.label}</strong>
                  <small>
                    {f.capacity} place{f.capacity > 1 ? 's' : ''} · {f.cost < 0 ? `salarié : +${money(-f.cost)}/an` : f.cost === 0 ? 'payé par tes parents' : `${money(f.cost)}/an pour toi`} · {f.hint}
                  </small>
                  {f.locked && <small className="gx-lock">{f.locked}</small>}
                </span>
                <span className="gx-add" aria-hidden="true">
                  {inList ? '✓' : '+'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {ps.canAskBourse && (
        <label className="gx-check">
          <input type="checkbox" checked={bourse} disabled={ps.submitted} onChange={(e) => update(wishes, e.target.checked)} />
          <span>
            <strong>Demander une bourse</strong>
            <small>Sur critères sociaux. Si tu ne coches pas, tu ne l’auras pas.</small>
          </span>
        </label>
      )}
      <button className="gx-cta" disabled={!wishes.length || ps.submitted} onClick={() => void send({ type: 'wishes', wishes, bourse, submit: true })}>
        {ps.submitted ? '✓ Vœux confirmés' : 'Confirmer mes vœux'}
      </button>
      {ps.submitted && (
        <button className="gx-link" onClick={() => void send({ type: 'wishes', wishes, bourse, submit: false })}>
          Modifier mes vœux
        </button>
      )}
      {error && <Hint tone="error">{error}</Hint>}
    </section>
  );
}

const STATUS_LABEL = { admis: 'Admis', attente: 'En attente', refuse: 'Refus' } as const;

function PsResults({ ps }: { ps: ParcoursupView }) {
  const { send, error } = useSend();
  const offers = ps.results.filter((r) => r.status === 'admis');
  const waiting = ps.results.some((r) => r.status === 'attente');
  return (
    <section className="gx-card">
      <p className="gx-kicker"><GameIcon name="graduation" /> Parcoursup · tes réponses</p>
      <ul className="gx-results">
        {ps.results.map((r) => (
          <li key={r.formation} className={`st-${r.status}${ps.response === r.formation ? ' chosen' : ''}`}>
            <span aria-hidden="true"><GameIcon name={r.icon} /></span>
            <span className="gx-wish-label">{r.label}</span>
            <span className={`gx-badge ${r.status}`}>
              {STATUS_LABEL[r.status]}
              {r.rank ? ` · ${r.rank}ᵉ` : ''}
            </span>
          </li>
        ))}
      </ul>
      {!offers.length ? (
        <Hint>{waiting ? 'Aucune offre pour l’instant, mais tu es en liste d’attente : des places vont se libérer.' : 'Refus partout. Phase complémentaire : tu prendras une place qui reste.'}</Hint>
      ) : (
        <div className="gx-options">
          {offers.map((o) => (
            <button key={o.formation} className={`gx-option${ps.response === o.formation ? ' on' : ''}`} onClick={() => void send({ type: 'response', accept: o.formation })}>
              <span className="gx-option-emoji" aria-hidden="true">
                <GameIcon name="check" />
              </span>
              <span>
                <strong>Accepter définitivement : {o.label}</strong>
                <small>Tu renonces à tes vœux en attente</small>
              </span>
            </button>
          ))}
          <button className={`gx-option${ps.response === 'wait' ? ' on' : ''}`} onClick={() => void send({ type: 'response', accept: null })}>
            <span className="gx-option-emoji" aria-hidden="true">
              <GameIcon name="hourglass" />
            </span>
            <span>
              <strong>Garder mes offres et attendre mieux</strong>
              <small>Tu recevras ton meilleur vœu possible</small>
            </span>
          </button>
        </div>
      )}
      {ps.response && <Hint tone="ok">Réponse enregistrée.</Hint>}
      {error && <Hint tone="error">{error}</Hint>}
    </section>
  );
}

// ================================================================= Premier emploi

function Jobs({ jobs }: { jobs: JobsView }) {
  const { send, error } = useSend();
  if (jobs.phase === 'result' && jobs.result) return <Outcome o={{ icon: jobs.result.job === 'chomage' ? 'trend-down' : 'briefcase', title: jobs.result.label, text: jobs.result.text, tone: jobs.result.tone }} kicker="Ton premier emploi" />;
  if (jobs.phase === 'result') return <Suspense text="Les recruteurs étudient les dossiers…" />;
  return (
    <section className="gx-card">
      <p className="gx-kicker"><GameIcon name="briefcase" /> Premier emploi · ta stratégie</p>
      <div className="gx-meter" aria-label={`Employabilité ${jobs.employability} sur 100`}>
        <span>Ton employabilité</span>
        <span className="gx-meter-bar">
          <i style={{ width: `${jobs.employability}%` }} />
        </span>
        <b>{jobs.employability}</b>
      </div>
      <p className="gx-lead">Les postes sont limités. Les mieux classés choisissent en premier.</p>
      <div className="gx-options">
        {jobs.options.map((o) => (
          <button key={o.id} className={`gx-option${jobs.choice === o.id ? ' on' : ''}${o.locked ? ' locked' : ''}`} disabled={!!o.locked} onClick={() => void send({ type: 'job', optionId: o.id })}>
            <span className="gx-option-emoji" aria-hidden="true">
              <GameIcon name={o.locked ? 'lock' : o.icon} />
            </span>
            <span>
              <strong>{o.label}</strong>
              <small>{o.hint}</small>
              {o.locked && <small className="gx-lock">{o.locked}</small>}
            </span>
          </button>
        ))}
      </div>
      {jobs.choice && <Hint tone="ok">Choix enregistré. Tu peux encore changer d’avis.</Hint>}
      {error && <Hint tone="error">{error}</Hint>}
    </section>
  );
}

// ================================================================= Fin

function Final({ f, c }: { f: NonNullable<PlayerGameView['final']>; c: CharacterView | null }) {
  const order: SocialClass[] = ['populaire', 'moyenne', 'superieure'];
  const move = order.indexOf(f.cls) - order.indexOf(f.origin);
  return (
    <section className={`gx-final ${move > 0 ? 'up' : move < 0 ? 'down' : 'flat'}`}>
      {move > 0 && <Confetti />}
      <p className="gx-kicker">Fin de partie</p>
      <div className="gx-rank">
        <b>{f.rank}</b>
        <span>ᵉ sur {f.total}</span>
      </div>
      <div className="gx-journey">
        <span data-cls={f.origin}>{CLASS_SHORT[f.origin]}</span>
        <i aria-hidden="true">{move > 0 ? '↗' : move < 0 ? '↘' : '→'}</i>
        <span data-cls={f.cls}>
          {CLASS_SHORT[f.cls]}
          {f.ascending && <> <GameIcon name="star" weight="fill" /></>}
        </span>
      </div>
      <p className="gx-lead">{f.text}</p>
      <dl className="gx-final-facts">
        <div>
          <dt>Emploi</dt>
          <dd>{f.job}</dd>
        </div>
        <div>
          <dt>Diplôme</dt>
          <dd>{f.diploma}</dd>
        </div>
        <div>
          <dt>Patrimoine</dt>
          <dd>{money(f.budget)}</dd>
        </div>
      </dl>
      {c && <p className="gx-note">Ton parcours complet est dans l’onglet « Mon parcours ».</p>}
    </section>
  );
}

// ================================================================= Mon parcours

const PATH_ICON = { title: 'medal', open: 'unlock', close: 'lock', event: 'bolt', choice: 'dot' } as const;

function PathTab({ c }: { c: CharacterView }) {
  const { user } = useSession();
  const groups: { year: string; items: CharacterView['path'] }[] = [];
  for (const p of c.path) {
    const g = groups.at(-1);
    if (g && g.year === p.year) g.items.push(p);
    else groups.push({ year: p.year, items: [p] });
  }
  return (
    <section className="gx-path">
      <header className="gx-card gx-path-head">
        {user && <Avatar avatar={user.avatar} color={user.color} size="sm" />}
        <div>
          <strong>{c.status}</strong>
          <small>
            {CLASS_LABELS[c.origin]} · {c.school.name}
            {c.boursier && ' · bourse'}
            {c.partner && ` · en binôme avec ${c.partner}`}
          </small>
        </div>
      </header>
      {!groups.length && <p className="gx-note">Ton parcours s’écrira ici, année après année.</p>}
      <ol className="gx-timeline">
        {groups.map((g, i) => (
          <li key={i}>
            <h3>{g.year}</h3>
            <ul>
              {g.items.map((p, k) => (
                <li key={k} className={`k-${p.kind}`}>
                  <span aria-hidden="true"><GameIcon name={PATH_ICON[p.kind]} /></span> {p.text}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="gx-legend"><GameIcon name="unlock" /> porte ouverte · <GameIcon name="lock" /> porte fermée · <GameIcon name="medal" /> titre obtenu · <GameIcon name="bolt" /> coup du sort</p>
    </section>
  );
}
