/** Glider de Conway : les 5 cellules vivantes d'une grille 3×3 (ligne, colonne). */
const GLIDER = new Set(['0,1', '1,2', '2,0', '2,1', '2,2']);

/** Logo : le glider sur sa tuile (même dessin que public/icon.svg). */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#11151c" />
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => {
          const alive = GLIDER.has(`${r},${c}`);
          return (
            <rect
              key={`${r},${c}`}
              x={9 + c * 16.5}
              y={9 + r * 16.5}
              width="13"
              height="13"
              rx="3.5"
              fill={alive ? 'var(--life)' : '#ffffff'}
              fillOpacity={alive ? 1 : 0.07}
            />
          );
        }),
      )}
    </svg>
  );
}

/** Logo complet : glider + nom du jeu. « GameOfLife » est découpé pour la typographie. */
export function Logo({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="wordmark">
        {name === 'GameOfLife' ? (
          <>
            Game<span>of</span>Life
          </>
        ) : (
          name
        )}
      </span>
    </span>
  );
}
