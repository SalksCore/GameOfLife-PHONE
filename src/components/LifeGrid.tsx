import { useEffect, useState } from 'react';
import { usePrefs } from '../lib/prefs';

type Board = boolean[];

/** Plateau de départ : quelques gliders + un peu de hasard, pour que ça vive longtemps. */
function seed(cols: number, rows: number): Board {
  const board: Board = Array.from({ length: cols * rows }, () => Math.random() < 0.18);
  const glider = [
    [0, 1],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ];
  for (let g = 0; g < Math.max(1, Math.floor(cols / 7)); g++) {
    const r0 = Math.floor(Math.random() * rows);
    const c0 = g * 7;
    for (const [r, c] of glider) board[((r0 + r!) % rows) * cols + ((c0 + c!) % cols)] = true;
  }
  return board;
}

/** Une génération de Conway sur un tore (les bords se rejoignent). */
function step(board: Board, cols: number, rows: number): Board {
  return board.map((alive, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    let n = 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        if ((dr || dc) && board[((r + dr + rows) % rows) * cols + ((c + dc + cols) % cols)]) n++;
    return n === 3 || (alive && n === 2);
  });
}

/** Mini Jeu de la vie décoratif. Figé en économie d'énergie ou si l'utilisateur limite les animations. */
export function LifeGrid({ cols = 16, rows = 6, interval = 520 }: { cols?: number; rows?: number; interval?: number }) {
  const [board, setBoard] = useState(() => seed(cols, rows));
  const { prefs } = usePrefs();

  useEffect(() => {
    if (prefs.powerSaver || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let previous = '';
    let still = 0;
    const id = setInterval(() => {
      setBoard((b) => {
        const next = step(b, cols, rows);
        const key = next.map(Number).join('');
        // Plateau mort ou figé : on relance une nouvelle population
        still = key === previous || !next.includes(true) ? still + 1 : 0;
        previous = key;
        return still > 3 ? seed(cols, rows) : next;
      });
    }, interval);
    return () => clearInterval(id);
  }, [cols, rows, interval, prefs.powerSaver]);

  return (
    <div className="life-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} aria-hidden="true">
      {board.map((alive, i) => (
        <span key={i} className={alive ? 'alive' : undefined} />
      ))}
    </div>
  );
}
